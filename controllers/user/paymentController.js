const Razorpay = require("razorpay");
const crypto = require("crypto");
const mongoose = require("mongoose");
const Cart = require("../../models/cartSchema");
const Address = require("../../models/addressSchema");
const Product = require("../../models/productSchema");
const Order = require("../../models/orderSchema");
const Wallet = require("../../models/walletSchema");
const Coupon = require("../../models/couponSchema");
const User = require("../../models/userSchema");

const razorpay = new Razorpay({
  key_id: process.env.RAZORPAY_KEY_ID,
  key_secret: process.env.RAZORPAY_KEY_SECRET,
});

const placeOrder = async (req, res) => {
  try {
    console.log(" placeOrder - Validating checkout data");

    const userId = req.session.user.id;
    const { addressId, couponCode, paymentMethod, notes } = req.body;

    console.log(" User ID:", userId);
    console.log(" Coupon code from request:", couponCode);
    console.log(" Payment method:", paymentMethod);

    if (!addressId || !paymentMethod) {
      return res.status(400).json({
        success: false,
        message: "Address and payment method are required",
      });
    }

    const user = await User.findById(userId);
    if (!user || user.isBlocked) {
      return res.status(403).json({
        success: false,
        message: "User not found or blocked",
      });
    }

    const addressDoc = await Address.findOne({ userId });

    if (!addressDoc) {
      return res.status(400).json({
        success: false,
        message: "No saved addresses found. Please add an address first.",
      });
    }

    const userAddress = addressDoc.address.find(
      (addr) => addr._id.toString() === addressId
    );

    if (!userAddress) {
      return res.status(400).json({
        success: false,
        message: "Selected address not found. Please select a valid address.",
      });
    }

    const cart = await Cart.findOne({ userId }).populate("items.productId");
    if (!cart || cart.items.length === 0) {
      return res.status(400).json({
        success: false,
        message: "Cart is empty",
      });
    }

    for (const item of cart.items) {
      const product = item.productId;

      if (!product) {
        return res.status(400).json({
          success: false,
          message: "One or more products in your cart are no longer available.",
        });
      }

      if (product.isBlocked || product.status === "Discontinue") {
        return res.status(400).json({
          success: false,
          message: `Product "${product.productName}" is no longer available.`,
        });
      }

      if (Array.isArray(product.variants) && product.variants.length > 0) {
        const variant = product.variants.find(
          (v) => v.size === Number(item.variantSize)
        );

        if (!variant) {
          return res.status(400).json({
            success: false,
            message: `Selected size (${item.variantSize}) is not available for "${product.productName}".`,
          });
        }

        if (variant.stock < item.quantity) {
          return res.status(400).json({
            success: false,
            message: `Only ${variant.stock} left for "${product.productName}" (${item.variantSize}ml).`,
          });
        }
      } else {
        if (
          typeof product.stock !== "number" ||
          product.stock < item.quantity
        ) {
          return res.status(400).json({
            success: false,
            message: `Insufficient stock for "${product.productName}". Only ${
              product.stock || 0
            } left.`,
          });
        }
      }
    }

    let totalAmount = 0;
    cart.items.forEach((item) => {
      console.log(
        `Item: ${item.productId.productName}, Price: ${item.price}, Qty: ${item.quantity}`
      );
      totalAmount += item.price * item.quantity;
    });

    console.log(" Calculated Subtotal:", totalAmount);

    let discountAmount = 0;
    let appliedCouponId = null;
    let appliedCouponCode = null;

    if (couponCode && couponCode.trim() !== "") {
      console.log(" Validating coupon:", couponCode);

      const coupon = await Coupon.findOne({
        couponCode: couponCode.trim().toUpperCase(),
        isListed: true,
      }).populate("appliedUsers.userId");

      if (!coupon) {
        console.error(" Coupon not found:", couponCode);
        return res.status(400).json({
          success: false,
          message: "Invalid or expired coupon",
        });
      }

      console.log(" Coupon found:", coupon.couponCode);
      console.log("   Discount Type:", coupon.discountType);
      console.log("   Discount Price:", coupon.discountPrice);
      console.log("   Max Discount:", coupon.maxDiscountAmount);

      const today = new Date();
      today.setHours(0, 0, 0, 0);

      const expireDate = new Date(coupon.expireDate);
      expireDate.setHours(0, 0, 0, 0);

      const activeDate = new Date(coupon.activeDate);
      activeDate.setHours(0, 0, 0, 0);

      if (expireDate < today) {
        return res.status(400).json({
          success: false,
          message: "This coupon has expired",
        });
      }

      if (activeDate > today) {
        return res.status(400).json({
          success: false,
          message: `This coupon will be active from ${activeDate.toLocaleDateString()}`,
        });
      }

      if (totalAmount < coupon.minimumPrice) {
        return res.status(400).json({
          success: false,
          message: `Minimum purchase of ₹${coupon.minimumPrice} required. Your cart: ₹${totalAmount}`,
        });
      }

      const totalUsageCount = coupon.appliedUsers?.length || 0;
      if (totalUsageCount >= coupon.limit) {
        return res.status(400).json({
          success: false,
          message: "This coupon has reached its usage limit",
        });
      }

      if (coupon.usageType === "once") {
        const userHasUsed = coupon.appliedUsers?.some(
          (applied) =>
            applied.userId &&
            applied.userId._id.toString() === userId.toString()
        );

        if (userHasUsed) {
          return res.status(400).json({
            success: false,
            message: "You have already used this one-time coupon",
          });
        }
      }

      if (coupon.discountType === "percentage") {
        discountAmount = (totalAmount * coupon.discountPrice) / 100;

        if (
          coupon.maxDiscountAmount > 0 &&
          discountAmount > coupon.maxDiscountAmount
        ) {
          discountAmount = coupon.maxDiscountAmount;
        }
      } else {
        discountAmount = Math.min(coupon.discountPrice, totalAmount);
      }

      discountAmount = Math.round(discountAmount * 100) / 100;
      appliedCouponId = coupon._id;
      appliedCouponCode = couponCode.trim().toUpperCase();

      console.log(" Discount calculated:", {
        type: coupon.discountType,
        value: coupon.discountPrice,
        calculated: discountAmount,
        maxDiscount: coupon.maxDiscountAmount,
      });
    }

    const SHIPPING_CHARGE = 49;
    const finalAmount = Math.max(
      0,
      totalAmount - discountAmount + SHIPPING_CHARGE
    );

    console.log(" Final Price Breakdown:", {
      subtotal: totalAmount,
      discount: discountAmount,
      shipping: SHIPPING_CHARGE,
      final: finalAmount,
    });

    if (finalAmount <= 0) {
      return res.status(400).json({
        success: false,
        message: "Invalid order amount after discount",
      });
    }

    req.session.checkoutData = {
      userId,
      addressId,
      paymentMethod,
      couponCode: appliedCouponCode || null,
      notes: notes || "",
      cartItems: cart.items.map((item) => ({
        productId: item.productId._id,
        productName: item.productId.productName,
        price: item.price,
        quantity: item.quantity,
        variantSize:
          Number(item.variantSize) || Number(item.size) || item.variantSize,
        image:
          item.productId.image || item.productId.images?.[0] || "default.jpg",
      })),
      totalAmount: totalAmount,
      discountAmount: discountAmount,
      shippingCharge: SHIPPING_CHARGE,
      finalAmount: finalAmount,
      appliedCouponId: appliedCouponId || null,
      deliveryAddress: {
        name: userAddress.name,
        phone: userAddress.phone,
        houseName: userAddress.houseName || "Unknown",
        buildingNumber: userAddress.buildingNumber || null,
        landmark: userAddress.landmark || null,
        city: userAddress.city,
        state: userAddress.state,
        pincode: userAddress.pincode,
        addressType: userAddress.addressType || "Home",
      },
    };

    console.log(" Session checkoutData stored:", req.session.checkoutData);

    await new Promise((resolve, reject) => {
      req.session.save((err) => {
        if (err) reject(err);
        else resolve();
      });
    });

    console.log(" Checkout data saved to session");

    if (paymentMethod === "cod" || paymentMethod === "wallet") {
      console.log(
        ` Direct order placement using ${paymentMethod.toUpperCase()}`
      );

      if (paymentMethod === "wallet") {
        const wallet = await Wallet.findOne({ user: userId });

        if (!wallet) {
          return res.status(400).json({
            success: false,
            message: "Wallet not found. Please contact support.",
          });
        }

        const currentBalance = parseFloat(wallet.balance) || 0;

        if (currentBalance < finalAmount) {
          return res.status(400).json({
            success: false,
            message: `Insufficient wallet balance. Available: ₹${currentBalance.toFixed(
              2
            )}, Required: ₹${finalAmount}`,
          });
        }

        wallet.balance -= finalAmount;

        wallet.transactions.push({
          type: "debit",
          amount: finalAmount,
          description: "Purchase",
          reason: "Order payment using wallet",
          orderId: null,
          date: new Date(),
        });

        await wallet.save();
        console.log(` Wallet debited ₹${finalAmount} for user ${userId}`);
      }

      console.log(" Reducing stock for order items...");

      try {
        for (const item of req.session.checkoutData.cartItems) {
          const product = await Product.findById(item.productId);

          if (!product) {
            console.error(` Product not found: ${item.productId}`);
            continue;
          }

          if (Array.isArray(product.variants) && product.variants.length > 0) {
            const variant = product.variants.find(
              (v) => Number(v.size) === Number(item.variantSize)
            );

            if (variant) {
              const oldStock = variant.stock;
              variant.stock = Math.max((variant.stock || 0) - item.quantity, 0);
              console.log(
                `  ✓ Reduced variant stock for ${product.productName} (${item.variantSize}ml): ${oldStock} → ${variant.stock}`
              );
            } else {
              console.warn(
                `   Variant not found for ${product.productName} (${item.variantSize}ml)`
              );
            }
          } else {
            const oldStock = product.stock;
            product.stock = Math.max((product.stock || 0) - item.quantity, 0);
            console.log(
              `  ✓ Reduced main stock for ${product.productName}: ${oldStock} → ${product.stock}`
            );
          }

          await product.save();
        }

        console.log(" Stock reduction completed successfully");
      } catch (stockError) {
        console.error(" Error reducing stock:", stockError);

        if (paymentMethod === "wallet") {
          try {
            const wallet = await Wallet.findOne({ user: userId });
            if (wallet) {
              wallet.balance += finalAmount;
              wallet.transactions.push({
                type: "credit",
                amount: finalAmount,
                description: "Refund",
                reason: "Order failed - stock update error",
                orderId: null,
                date: new Date(),
              });
              await wallet.save();
              console.log(" Wallet amount refunded due to stock error");
            }
          } catch (rollbackError) {
            console.error(" Failed to rollback wallet:", rollbackError);
          }
        }

        return res.status(500).json({
          success: false,
          message: "Error updating product stock. Please try again.",
          error: stockError.message,
        });
      }

      let orderItemsWithDiscount = req.session.checkoutData.cartItems.map(
        (item) => ({
          product: item.productId,
          productName: item.productName,
          variantSize: item.variantSize,
          quantity: item.quantity,
          price: item.price,
          total: item.price * item.quantity,
          couponDiscount: 0,
          originalCouponDiscount: 0,
          status: "Placed",
          tracking: {
            placedDate: new Date().toLocaleDateString("en-IN"),
            placedTime: new Date().toLocaleTimeString("en-IN"),
          },
          isReturnEligible: true,
        })
      );

      if (discountAmount > 0 && totalAmount > 0) {
        let totalDistributed = 0;

        orderItemsWithDiscount.forEach((item) => {
          const proportion = item.total / totalAmount;
          const itemDiscount =
            Math.round(discountAmount * proportion * 100) / 100;

          item.couponDiscount = itemDiscount;
          item.originalCouponDiscount = itemDiscount;
          totalDistributed += itemDiscount;
        });

        const diff =
          Math.round((discountAmount - totalDistributed) * 100) / 100;

        if (Math.abs(diff) >= 0.01 && orderItemsWithDiscount.length > 0) {
          let maxIdx = 0;
          let maxTotal = 0;

          orderItemsWithDiscount.forEach((item, idx) => {
            if (item.total > maxTotal) {
              maxTotal = item.total;
              maxIdx = idx;
            }
          });

          orderItemsWithDiscount[maxIdx].couponDiscount =
            Math.round(
              (orderItemsWithDiscount[maxIdx].couponDiscount + diff) * 100
            ) / 100;
          orderItemsWithDiscount[maxIdx].originalCouponDiscount =
            orderItemsWithDiscount[maxIdx].couponDiscount;
        }

        console.log(" Coupon discount distributed to items:", {
          totalDiscount: discountAmount,
          distributed: totalDistributed,
          itemCount: orderItemsWithDiscount.length,
        });
      }

      const newOrder = new Order({
        user: userId,
        orderItems: orderItemsWithDiscount,
        totalPrice: totalAmount,
        discount: discountAmount,
        shippingCharge: SHIPPING_CHARGE,
        finalAmount: finalAmount,
        coupon: appliedCouponId || null,
        couponApplied: !!appliedCouponId,
        couponCode: appliedCouponCode || null,
        discountDistributionMethod: "proportional",
        deliveryAddress: {
          name: userAddress.name,
          phone: userAddress.phone,
          houseName: userAddress.houseName || "Unknown",
          buildingNumber: userAddress.buildingNumber || null,
          landmark: userAddress.landmark || null,
          city: userAddress.city,
          state: userAddress.state,
          pincode: userAddress.pincode,
          addressType: userAddress.addressType || "Home",
        },
        paymentMethod: paymentMethod === "cod" ? "COD" : "Wallet",
        paymentStatus: "Completed",
        status: "Processing",
        statusHistory: [
          {
            status: "Processing",
            timestamp: new Date(),
            reason: "Order placed successfully",
          },
        ],
      });

      const savedOrder = await newOrder.save();

      if (paymentMethod === "wallet") {
        await Wallet.updateOne(
          { user: userId, "transactions.orderId": null },
          { $set: { "transactions.$.orderId": savedOrder._id } }
        );
        console.log(" Wallet transaction linked with order:", savedOrder._id);
      }

      if (appliedCouponId) {
        try {
          await Coupon.findByIdAndUpdate(appliedCouponId, {
            $push: {
              appliedUsers: {
                userId: userId,
                orderId: savedOrder._id,
                appliedDate: new Date(),
              },
            },
          });
        } catch (couponErr) {
          console.error(" Error recording coupon usage:", couponErr.message);
        }
      }

      await Cart.findOneAndUpdate({ userId }, { items: [] });

      return res.status(200).json({
        success: true,
        message: `Order placed successfully using ${paymentMethod.toUpperCase()}`,
        orderId: savedOrder._id,
        redirectUrl: `/orderSuccess?orderId=${savedOrder._id}`,
      });
    }

    return res.status(200).json({
      success: true,
      message: "Checkout data validated. Proceeding to Razorpay.",
      checkoutData: {
        totalAmount,
        discountAmount,
        finalAmount,
        paymentMethod,
      },
    });
  } catch (error) {
    console.error(" placeOrder error:", error);
    return res.status(500).json({
      success: false,
      message: "Error processing order",
      error: error.message,
    });
  }
};

const handlePaymentFailure = async (req, res) => {
  try {
    console.log(" handlePaymentFailure");

    const userId = req.session.user.id;
    const { razorpay_order_id, error_description, error_code } = req.body;
    const checkoutData = req.session.checkoutData;

    const addressDoc = await Address.findOne({ userId });
    let userAddress = null;

    if (addressDoc && Array.isArray(addressDoc.address)) {
      userAddress = addressDoc.address.find(
        (addr) =>
          addr._id.toString() ===
          (checkoutData?.addressId || addressDoc.address[0]?._id.toString())
      );
    }

    if (!userAddress) {
      console.warn(" No valid address found for failed order");
      userAddress = {
        name: "Unknown",
        phone: "N/A",
        houseName: "N/A",
        city: "N/A",
        state: "N/A",
        pincode: "N/A",
        addressType: "Home",
      };
    }

    let failedOrderItems =
      checkoutData?.cartItems.map((item) => ({
        product: item.productId,
        productName: item.productName,
        variantSize: item.variantSize,
        quantity: item.quantity,
        price: item.price,
        total: item.price * item.quantity,
        couponDiscount: 0,
        originalCouponDiscount: 0,
        status: "Payment Failed",
        tracking: {
          placedDate: new Date().toLocaleDateString("en-IN"),
          placedTime: new Date().toLocaleTimeString("en-IN"),
        },
        isReturnEligible: false,
      })) || [];

    if (checkoutData?.discountAmount > 0 && checkoutData?.totalAmount > 0) {
      let totalDistributed = 0;

      failedOrderItems.forEach((item) => {
        const proportion = (item.total || 0) / checkoutData.totalAmount;
        const itemDiscount =
          Math.round(checkoutData.discountAmount * proportion * 100) / 100;

        item.couponDiscount = itemDiscount;
        item.originalCouponDiscount = itemDiscount;
        totalDistributed += itemDiscount;
      });

      const diff =
        Math.round((checkoutData.discountAmount - totalDistributed) * 100) /
        100;

      if (Math.abs(diff) >= 0.01 && failedOrderItems.length > 0) {
        let maxIdx = 0;
        let maxTotal = 0;
        failedOrderItems.forEach((it, idx) => {
          if ((it.total || 0) > maxTotal) {
            maxTotal = it.total || 0;
            maxIdx = idx;
          }
        });

        failedOrderItems[maxIdx].couponDiscount += diff;
        failedOrderItems[maxIdx].originalCouponDiscount += diff;
      }

      console.log(" PAYMENT FAILED: Coupon discount distributed to items", {
        totalDiscount: checkoutData.discountAmount,
        distributed: totalDistributed,
        itemCount: failedOrderItems.length,
      });
    }

    const failedOrder = new Order({
      user: userId,
      orderItems: failedOrderItems,

      totalPrice: checkoutData?.totalAmount || 0,
      discount: checkoutData?.discountAmount || 0,
      shippingCharge: checkoutData.shippingCharge || 49,
      finalAmount: checkoutData?.finalAmount || 0,
      coupon: checkoutData?.appliedCouponId || null,
      couponApplied: !!checkoutData?.appliedCouponId,
      couponCode: checkoutData?.couponCode || null,
      discountDistributionMethod: "proportional",

      deliveryAddress: {
        name: userAddress.name,
        phone: userAddress.phone,
        houseName: userAddress.houseName,
        buildingNumber: userAddress.buildingNumber || null,
        landmark: userAddress.landmark || null,
        city: userAddress.city,
        state: userAddress.state,
        pincode: userAddress.pincode,
        addressType: userAddress.addressType || "Home",
      },

      paymentMethod:
        checkoutData?.paymentMethod === "cod"
          ? "COD"
          : checkoutData?.paymentMethod === "wallet"
          ? "Wallet"
          : "Online Payment",

      paymentStatus: "Failed",
      status: "Payment Failed",
      razorpayOrderId: razorpay_order_id,
      failureReason: error_description,
      failureCode: error_code,
      paymentFailureReason: error_description,
      paymentFailedAt: new Date(),

      statusHistory: [
        {
          status: "Payment Failed",
          timestamp: new Date(),
          reason: error_description || "Payment declined by bank",
        },
      ],
    });

    const savedFailedOrder = await failedOrder.save();
    console.log(" Failed order recorded:", savedFailedOrder._id);

    delete req.session.razorpayOrderId;
    await new Promise((resolve) => req.session.save(resolve));

    return res.status(200).json({
      success: true,
      message: "Payment failure recorded",
      orderId: savedFailedOrder._id,
      errorMessage: error_description,
    });
  } catch (error) {
    console.error(" handlePaymentFailure error:", error);
    return res.status(500).json({
      success: false,
      message: "Error recording payment failure",
      error: error.message,
    });
  }
};

const checkAuth = async (req, res) => {
  try {
    const isAuthenticated = !!(req.session && req.session.user);
    return res.status(200).json({
      success: true,
      isAuthenticated,
      user: isAuthenticated ? req.session.user : null,
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      isAuthenticated: false,
    });
  }
};

const retryPaymentForFailedOrder = async (req, res) => {
  try {
    console.log(" retryPaymentForFailedOrder - Starting retry");

    const userId = req.session.user.id;
    const { orderId } = req.body;

    let failedOrder = null;

    if (mongoose.Types.ObjectId.isValid(orderId)) {
      failedOrder = await Order.findById(orderId).populate("user");
    }

    if (!failedOrder) {
      failedOrder = await Order.findOne({ orderId }).populate("user");
    }

    if (!failedOrder) {
      return res.status(404).json({
        success: false,
        message: "Order not found",
      });
    }

    if (failedOrder.user._id.toString() !== userId) {
      return res.status(403).json({
        success: false,
        message: "Unauthorized access to this order",
      });
    }

    if (failedOrder.paymentStatus !== "Failed") {
      return res.status(400).json({
        success: false,
        message: "Order payment status is not failed",
      });
    }

    req.session.checkoutData = {
      userId,
      addressId: failedOrder.deliveryAddress?._id?.toString() || null,
      paymentMethod: "razorpay",
      couponCode: failedOrder.couponCode || null,
      notes: failedOrder.orderNotes || null,
      cartItems: failedOrder.orderItems.map((item) => ({
        productId: item.product,
        name: item.productName,
        price: item.price,
        quantity: item.quantity,
        size: item.variantSize,
      })),
      totalAmount: failedOrder.totalPrice,
      discountAmount: failedOrder.discount,
      finalAmount: failedOrder.finalAmount,
      retryOrderId: failedOrder._id.toString(),
      appliedCouponId: failedOrder.coupon || null,
    };

    await new Promise((resolve, reject) => {
      req.session.save((err) => (err ? reject(err) : resolve()));
    });

    console.log(" Order prepared successfully for retry");

    return res.status(200).json({
      success: true,
      message: "Order prepared for retry",
      amount: failedOrder.finalAmount,
    });
  } catch (error) {
    console.error(" retryPaymentForFailedOrder error:", error);
    return res.status(500).json({
      success: false,
      message: "Error preparing order for retry",
      error: error.message,
    });
  }
};

const getOrderList = async (req, res) => {
  try {
    const userId = req.session.user?.id || req.session.user?._id;
    if (!userId) return res.redirect("/login");

    const page = parseInt(req.query.page) || 1;
    const limit = 10;
    const statusFilter = req.query.status || "";
    const timeFilter = req.query.time || "";

    const searchTerm = req.query.search || "";

    let query = { user: userId };

    if (statusFilter) {
      query.$or = [
        { status: statusFilter },
        { "orderItems.status": statusFilter },
      ];
    }

    if (timeFilter) {
      const now = new Date();
      if (timeFilter === "last30days")
        query.createdOn = { $gte: new Date(now.setDate(now.getDate() - 30)) };
      else if (timeFilter === "last6months")
        query.createdOn = { $gte: new Date(now.setMonth(now.getMonth() - 6)) };
    }

    if (searchTerm) {
      const searchRegex = new RegExp(searchTerm, "i");
      query.$and = [
        {
          $or: [
            { orderId: searchRegex },
            { "orderItems.productName": searchRegex },
          ],
        },
      ];
    }

    const totalFilteredOrders = await Order.countDocuments(query);
    const totalPages = Math.ceil(totalFilteredOrders / limit);
    const skip = (page - 1) * limit;

    let orders = await Order.find(query)
      .populate("orderItems.product")
      .sort({ createdOn: -1 })
      .skip(skip)
      .limit(limit)
      .lean();

    orders = orders.map((order) => {
      order.dynamicTotal = order.finalAmount || order.totalPrice || 0;

      if (statusFilter && order.status !== statusFilter) {
        const matchingItems = order.orderItems.filter(
          (item) => item.status === statusFilter
        );
        if (matchingItems.length > 0) order.orderItems = matchingItems;
      }

      order.orderItems = order.orderItems.map((item) => {
        let img = item.product?.images?.[0] || "";
        if (img && !img.startsWith("http") && !img.startsWith("/"))
          img = "/uploads/product-images/" + img;
        return {
          ...item,
          productImage: img || "/images/product-placeholder.png",
          productName: item.productName || "Product",
          displayStatus: item.status || order.status || "Placed",
        };
      });
      return order;
    });

    res.render("orderList", {
      orders,
      user: req.session.user,
      customerName: req.session.user?.name || "Customer",
      currentPage: page,
      totalPages,
      itemStats: {},
      currentStatus: statusFilter,
      currentTime: timeFilter,
      currentSearch: searchTerm,
      success: true,
    });
  } catch (error) {
    console.error("Order Error:", error);
    res.render("orderList", {
      orders: [],
      user: req.session.user,
      customerName: "User",
      currentPage: 1,
      totalPages: 0,
      currentStatus: "",
      currentTime: "",
      currentSearch: "",
      itemStats: {},
      error: "Error loading orders",
    });
  }
};

const getOrderFailure = async (req, res) => {
  try {
    const { orderId } = req.query;
    console.log(" getOrderFailure query:", req.query);

    if (!orderId) {
      console.warn(" Missing orderId in request");
      return res.status(400).send("Missing order ID in request");
    }

    let failedOrder = null;
    if (mongoose.Types.ObjectId.isValid(orderId)) {
      failedOrder = await Order.findById(orderId);
    }
    if (!failedOrder) {
      failedOrder = await Order.findOne({ orderId });
    }

    if (!failedOrder) {
      console.warn(" Order not found for ID:", orderId);
      return res.status(404).send("Order not found");
    }

    const order = {
      orderId: failedOrder.orderId || failedOrder._id.toString(),
      transactionId: failedOrder.razorpayOrderId || "N/A",
      errorReason:
        failedOrder.paymentFailureReason ||
        failedOrder.failureReason ||
        "Payment failed",
      paymentMethod: failedOrder.paymentMethod || "Online Payment",
      amount: `₹${(failedOrder.finalAmount || 0).toLocaleString("en-IN")}`,
      dateTime: failedOrder.createdOn
        ? new Date(failedOrder.createdOn).toLocaleString("en-IN")
        : new Date().toLocaleString("en-IN"),
    };

    console.log(" Rendering orderFailure with:", order);
    return res.render("orderFailure", { order });
  } catch (error) {
    console.error(" getOrderFailure error:", error);
    return res.status(500).send("Error loading failure page");
  }
};

const getPaymentFailureDetails = async (req, res) => {
  try {
    const { orderId } = req.params;
    const userId = req.session.user?.id || req.session.user?._id;

    console.log("🔍 getPaymentFailureDetails");
    console.log("   orderId param:", orderId);
    console.log("   userId:", userId);

    if (!userId) {
      return res.status(401).json({
        success: false,
        message: "User not authenticated",
      });
    }

    if (!orderId) {
      return res.status(400).json({
        success: false,
        message: "Order ID is required",
      });
    }

    let order = null;

    if (mongoose.Types.ObjectId.isValid(orderId)) {
      try {
        order = await Order.findById(orderId);
        if (order) {
          console.log(" Order found by _id");
        }
      } catch (err) {
        console.log(" Error searching by _id:", err.message);
      }
    }

    if (!order) {
      order = await Order.findOne({ orderId: orderId });
      if (order) {
        console.log(" Order found by orderId field (UUID)");
      }
    }

    if (!order) {
      console.error(" Order not found with orderId:", orderId);
      return res.status(404).json({
        success: false,
        message: "Order not found",
      });
    }

    if (order.user.toString() !== userId.toString()) {
      return res.status(403).json({
        success: false,
        message: "Unauthorized access to this order",
      });
    }

    if (order.paymentStatus !== "Failed") {
      return res.status(400).json({
        success: false,
        message: `Cannot retry. Order payment status is: ${order.paymentStatus}`,
      });
    }

    console.log(" Order details retrieved successfully");

    return res.status(200).json({
      success: true,
      order: {
        _id: order._id,
        orderId: order.orderId,
        orderNumber: order.orderId,
        finalAmount: order.finalAmount,
        totalPrice: order.totalPrice,
        discount: order.discount,
        paymentStatus: order.paymentStatus,
        status: order.status,
        paymentFailureReason:
          order.paymentFailureReason || "Payment could not be processed",
        paymentFailedAt: order.paymentFailedAt,
        paymentRetryCount: order.paymentRetryCount || 0,
        createdAt: order.createdAt,
      },
    });
  } catch (error) {
    console.error(" getPaymentFailureDetails error:", {
      message: error.message,
      stack: error.stack,
      orderId: req.params.orderId,
    });

    return res.status(500).json({
      success: false,
      message: "Failed to fetch order details: " + error.message,
    });
  }
};

const createRazorpayOrder = async (req, res) => {
  try {
    const userId = req.session.user?.id || req.session.user?._id;
    let { amount, currency = "INR", orderId: retryOrderId } = req.body || {};

    console.log(" createRazorpayOrder - entered", {
      amount,
      currency,
      retryOrderId,
      userId,
    });

    if (amount === undefined || amount === null || amount === "") {
      const checkoutData = req.session.checkoutData;
      if (!checkoutData || typeof checkoutData.finalAmount !== "number") {
        return res.status(400).json({
          success: false,
          message:
            "No amount found (session expired). Please start checkout again.",
        });
      }
      amount = Math.round(checkoutData.finalAmount * 100);
      console.log("   Using session.finalAmount -> paise:", amount);
    } else {
      const numericAmount = Number(amount);
      if (!Number.isFinite(numericAmount) || numericAmount <= 0) {
        return res
          .status(400)
          .json({ success: false, message: "Invalid amount" });
      }
      if (numericAmount < 100000) {
        amount = Math.round(numericAmount * 100);
        console.log("   Converted rupees->paise:", amount);
      } else {
        amount = Math.round(numericAmount);
        console.log("   Using provided paise amount:", amount);
      }
    }

    const amountInRupees = amount / 100;
    if (amountInRupees < 1 || amountInRupees > 100000) {
      return res.status(400).json({
        success: false,
        message: `Invalid amount. Must be between ₹1 and ₹100,000. Got: ₹${amountInRupees}`,
      });
    }

    const timestamp = Date.now().toString().slice(-8);
    const receiptId = retryOrderId ? `RETRY${timestamp}` : `ORDER${timestamp}`;

    console.log(" Creating Razorpay order", {
      amount,
      currency,
      receiptId,
      userId,
    });

    const razorpayOrder = await razorpay.orders.create({
      amount: amount,
      currency: currency,
      receipt: receiptId,
      payment_capture: 1,
      notes: {
        userId: userId ? userId.toString() : "guest",
        isRetry: !!retryOrderId,
        originalOrderId: retryOrderId || "new-order",
      },
    });

    req.session.razorpayOrderId = razorpayOrder.id;
    await new Promise((r, rej) =>
      req.session.save((err) => (err ? rej(err) : r()))
    );

    console.log(" Razorpay order created:", {
      id: razorpayOrder.id,
      amount: razorpayOrder.amount,
    });

    return res.status(200).json({
      success: true,
      keyId: process.env.RAZORPAY_KEY_ID,
      orderId: razorpayOrder.id,
      amount: razorpayOrder.amount,
      currency: razorpayOrder.currency,
      isRetry: !!retryOrderId,
    });
  } catch (err) {
    console.error(" createRazorpayOrder error:", err);
    return res.status(500).json({
      success: false,
      message:
        "Failed to create payment order: " + (err.message || "Unknown error"),
    });
  }
};

const verifyRazorpayPayment = async (req, res) => {
  try {
    const {
      razorpay_order_id,
      razorpay_payment_id,
      razorpay_signature,
      orderId,
    } = req.body;
    const userId = req.session.user?.id || req.session.user?._id;

    console.log(" verifyRazorpayPayment");
    console.log("   Razorpay Order:", razorpay_order_id);
    console.log("   Payment ID:", razorpay_payment_id);
    console.log("   Retry orderId:", orderId);

    if (!razorpay_order_id || !razorpay_payment_id || !razorpay_signature) {
      return res.status(400).json({
        success: false,
        message: "Missing payment verification data",
      });
    }

    if (!userId) {
      return res.status(401).json({
        success: false,
        message: "User not authenticated",
      });
    }

    const signatureBody = `${razorpay_order_id}|${razorpay_payment_id}`;
    const expectedSignature = crypto
      .createHmac("sha256", process.env.RAZORPAY_KEY_SECRET)
      .update(signatureBody)
      .digest("hex");

    if (expectedSignature !== razorpay_signature) {
      console.error(" Signature verification failed");
      return res.status(400).json({
        success: false,
        message: "Invalid payment signature",
      });
    }

    console.log(" Signature verified");

    if (orderId) {
      console.log(" Processing RETRY payment");

      let order = null;

      if (mongoose.Types.ObjectId.isValid(orderId)) {
        order = await Order.findById(orderId);
      }

      if (!order) {
        order = await Order.findOne({ orderId: orderId });
      }

      if (!order) {
        return res.status(404).json({
          success: false,
          message: "Order not found for retry",
        });
      }

      if (order.user.toString() !== userId.toString()) {
        return res.status(403).json({
          success: false,
          message: "Unauthorized access",
        });
      }

      if (order.paymentStatus !== "Failed") {
        return res.status(400).json({
          success: false,
          message: `Cannot retry. Current status: ${order.paymentStatus}`,
        });
      }

      order.paymentStatus = "Completed";
      order.status = "Processing";
      order.razorpayPaymentId = razorpay_payment_id;
      order.razorpayOrderId = razorpay_order_id;
      order.paymentRetryCount = (order.paymentRetryCount || 0) + 1;
      order.paymentFailureReason = null;
      order.paymentFailedAt = null;
      order.lastPaymentAttemptAt = new Date();

      if (Array.isArray(order.orderItems) && order.orderItems.length > 0) {
        order.orderItems.forEach((item) => {
          item.status = "Processing";
        });
      }

      if (!Array.isArray(order.statusHistory)) {
        order.statusHistory = [];
      }

      order.statusHistory.push({
        status: "Processing",
        timestamp: new Date(),
        reason: `Payment retry successful (Attempt #${order.paymentRetryCount})`,
      });

      const updatedOrder = await order.save();

      try {
        await Cart.findOneAndUpdate({ userId }, { $set: { items: [] } });
        console.log(
          ` Cart cleared successfully after retry payment for user ${userId}`
        );
      } catch (cartErr) {
        console.error(
          "⚠ Error clearing cart after retry payment:",
          cartErr.message
        );
      }

      console.log(" Order updated after retry payment");
      console.log("   New Status:", updatedOrder.status);
      console.log("   Payment Status:", updatedOrder.paymentStatus);
      console.log("   Retry Count:", updatedOrder.paymentRetryCount);

      return res.status(200).json({
        success: true,
        message: "Payment retry successful!",
        orderId: updatedOrder._id,
        orderNumber: updatedOrder.orderId,
        redirectUrl: `/orderSuccess?orderId=${updatedOrder._id}`,
      });
    }

    console.log(" Processing new order payment from checkout");

    const checkoutData = req.session.checkoutData;
    if (!checkoutData) {
      return res.status(400).json({
        success: false,
        message: "Session expired. Please start again.",
      });
    }

    try {
      for (const item of checkoutData.cartItems) {
        const product = await Product.findById(item.productId);
        if (!product) continue;

        const variant = Array.isArray(product.variants)
          ? product.variants.find(
              (v) => Number(v.size) === Number(item.variantSize)
            )
          : null;

        if (variant) {
          variant.stock = Math.max((variant.stock || 0) - item.quantity, 0);
        } else if (typeof product.stock === "number") {
          product.stock = Math.max((product.stock || 0) - item.quantity, 0);
        }

        await product.save();
      }
    } catch (err) {
      console.error(" Error updating stock for new order:", err);
    }

    let orderItemsWithDiscount = checkoutData.cartItems.map((item) => ({
      product: item.productId,
      productName: item.productName,
      variantSize: item.variantSize,
      quantity: item.quantity,
      price: item.price,
      total: item.price * item.quantity,
      couponDiscount: 0,
      originalCouponDiscount: 0,
      finalSubtotal: item.price * item.quantity,
      status: "Processing",
      tracking: { placedDate: new Date(), placedTime: new Date() },
      isReturnEligible: true,
    }));

    if (checkoutData.discountAmount > 0 && checkoutData.totalAmount > 0) {
      let totalDistributed = 0;
      orderItemsWithDiscount.forEach((item) => {
        const prop = item.total / checkoutData.totalAmount;
        const itemDiscount =
          Math.round(checkoutData.discountAmount * prop * 100) / 100;
        item.couponDiscount = itemDiscount;
        item.originalCouponDiscount = itemDiscount;
        item.finalSubtotal = item.total - itemDiscount;
        totalDistributed += itemDiscount;
      });
      const diff =
        Math.round((checkoutData.discountAmount - totalDistributed) * 100) /
        100;
      if (Math.abs(diff) >= 0.01) {
        let idx = 0;
        let max = 0;
        orderItemsWithDiscount.forEach((it, i) => {
          if (it.total > max) {
            max = it.total;
            idx = i;
          }
        });
        orderItemsWithDiscount[idx].couponDiscount += diff;
        orderItemsWithDiscount[idx].originalCouponDiscount += diff;
        orderItemsWithDiscount[idx].finalSubtotal -= diff;
      }
    }

    const newOrder = new Order({
      user: req.session.user.id,
      orderItems: orderItemsWithDiscount,
      totalPrice: checkoutData.totalAmount,
      discount: checkoutData.discountAmount,
      shippingCharge: checkoutData.shippingCharge || 49,
      finalAmount: checkoutData.finalAmount,
      coupon: checkoutData.appliedCouponId || null,
      couponApplied: !!checkoutData.appliedCouponId,
      couponCode: checkoutData.couponCode || null,
      discountDistributionMethod: "proportional",
      deliveryAddress:
        checkoutData.deliveryAddress || checkoutData.addressId || {},
      paymentMethod: "Online Payment",
      paymentStatus: "Completed",
      status: "Processing",
      razorpayOrderId: razorpay_order_id,
      razorpayPaymentId: razorpay_payment_id,
      statusHistory: [
        {
          status: "Processing",
          timestamp: new Date(),
          reason: "Payment verified",
        },
      ],
    });

    const savedOrder = await newOrder.save();

    savedOrder.orderItems.forEach((item) => {
      if (!item.tracking) item.tracking = {};

      const now = new Date();

      const formatted = {
        date: now.toLocaleDateString("en-IN", {
          day: "2-digit",
          month: "short",
          year: "numeric",
        }),
        time: now.toLocaleTimeString("en-IN", {
          hour: "2-digit",
          minute: "2-digit",
          hour12: true,
        }),
      };

      item.tracking.processingDate = formatted.date;
      item.tracking.processingTime = formatted.time;

      let daysToAdd = 7;

      switch ("Processing") {
        case "Processing":
          daysToAdd = 5;
          break;
        case "Shipped":
          daysToAdd = 3;
          break;
        case "OutForDelivery":
          daysToAdd = 1;
          break;
      }

      const eta = new Date(now.getTime() + daysToAdd * 24 * 60 * 60 * 1000);

      item.tracking.estimatedDeliveryDate = eta.toLocaleDateString("en-IN", {
        day: "2-digit",
        month: "short",
        year: "numeric",
      });
    });

    await savedOrder.save();

    if (checkoutData.appliedCouponId) {
      try {
        await Coupon.findByIdAndUpdate(checkoutData.appliedCouponId, {
          $push: {
            appliedUsers: {
              userId: req.session.user.id,
              orderId: savedOrder._id,
              appliedDate: new Date(),
            },
          },
        });
      } catch (err) {
        console.warn(" Could not record coupon usage:", err);
      }
    }

    await Cart.findOneAndUpdate({ userId: req.session.user.id }, { items: [] });
    delete req.session.checkoutData;
    await new Promise((r) => req.session.save(r));

    return res.status(200).json({
      success: true,
      message: "Payment verified and order created",
      orderId: savedOrder._id,
      orderNumber: savedOrder.orderId || savedOrder._id,
    });
  } catch (error) {
    console.error(" verifyRazorpayPayment error:", error);
    return res.status(500).json({
      success: false,
      message: "Error verifying payment",
      error: error.message,
    });
  }
};

module.exports = {
  placeOrder,
  createRazorpayOrder,
  verifyRazorpayPayment,
  handlePaymentFailure,
  retryPaymentForFailedOrder,
  checkAuth,
  getOrderList,
  getOrderFailure,
  getPaymentFailureDetails,
};

