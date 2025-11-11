const mongoose = require("mongoose");
const Cart = require("../../models/cartSchema");
const Address = require("../../models/addressSchema");
const Product = require("../../models/productSchema");
const User = require("../../models/userSchema");
const Order = require("../../models/orderSchema");
const Wallet = require("../../models/walletSchema");
const Coupon = require("../../models/couponSchema");

const getOrderSuccess = async (req, res) => {
  try {
    const user = req.session.user;
    console.log("Session user in getOrderSuccess:", user);
    const userId = user?._id || user?.id;
    if (!user || !mongoose.Types.ObjectId.isValid(userId)) {
      console.log("Redirecting to /login due to invalid user or userId");
      return res.redirect("/login");
    }
    const latestOrder = await Order.findOne({ user: userId })
      .sort({ createdOn: -1 })
      .populate("orderItems.product")
      .lean();
    console.log("Latest order data:", {
      orderId: latestOrder?.orderId,
      totalPrice: latestOrder?.totalPrice,
      discount: latestOrder?.discount,
      finalAmount: latestOrder?.finalAmount,
      couponApplied: latestOrder?.couponApplied,
      couponCode: latestOrder?.couponCode,
      paymentStatus: latestOrder?.paymentStatus,
      status: latestOrder?.status,
    });
    if (!latestOrder) {
      console.log("No order found for user:", userId);
      return res.render("orderSuccess", {
        orderId: "N/A",
        date: "N/A",
        time: "N/A",
        paymentMethod: "N/A",
        subtotal: "₹0",
        discount: "₹0",
        shipping: "Free",
        amount: "₹0",
        deliveryDate: "N/A",
        items: [],
        deliveryAddress: "N/A",
        success: req.flash("success"),
      });
    }
    const orderDate = new Date(latestOrder.createdOn);
    const formattedDate = orderDate.toLocaleDateString("en-IN", {
      day: "2-digit",
      month: "short",
      year: "numeric",
    });
    const formattedTime = orderDate.toLocaleTimeString("en-IN", {
      hour: "2-digit",
      minute: "2-digit",
    });
    const deliveryDate = new Date(orderDate);
    deliveryDate.setDate(deliveryDate.getDate() + 5);
    const formattedDelivery = deliveryDate.toLocaleDateString("en-IN", {
      day: "2-digit",
      month: "short",
      year: "numeric",
    });
    const deliveryAddress = latestOrder.deliveryAddress
      ? `${latestOrder.deliveryAddress.name}, ${latestOrder.deliveryAddress.houseName}, ${latestOrder.deliveryAddress.city}, ${latestOrder.deliveryAddress.state} - ${latestOrder.deliveryAddress.pincode}`
      : "N/A";
    const formattedItems = latestOrder.orderItems.map((item) => ({
      productName: item.productName,
      productId: item.product,
      variantSize: item.variantSize ? `${item.variantSize}ml` : "N/A",
      quantity: item.quantity,
      price: `₹${item.price}`,
      total: `₹${item.total}`,
    }));
    console.log("Formatted items:", formattedItems);
    const subtotalAmount = latestOrder.totalPrice || 0;
    const discountAmount = latestOrder.discount || 0;
    const finalAmount = latestOrder.finalAmount || 0;
    const formattedSubtotal = `₹${subtotalAmount.toFixed(2)}`;
    const formattedDiscount =
      discountAmount > 0 ? `-₹${discountAmount.toFixed(2)}` : "₹0";
    const formattedFinalAmount = `₹${finalAmount.toFixed(2)}`;
    console.log("Formatted amounts:", {
      subtotal: formattedSubtotal,
      discount: formattedDiscount,
      final: formattedFinalAmount,
      paymentStatus: latestOrder.paymentStatus,
      orderStatus: latestOrder.status,
    });
    res.render("orderSuccess", {
      orderId: latestOrder.orderId || "N/A",
      date: formattedDate,
      time: formattedTime,
      paymentMethod: latestOrder.paymentMethod || "Unknown",
      subtotal: formattedSubtotal,
      discount: formattedDiscount,
      shipping: "Free",
      amount: formattedFinalAmount,
      deliveryDate: formattedDelivery,
      items: formattedItems,
      deliveryAddress: deliveryAddress,
      couponApplied: latestOrder.couponApplied || false,
      couponCode: latestOrder.couponCode || null,
      paymentStatus: latestOrder.paymentStatus,
      status: latestOrder.status,
      success: req.flash("success"),
    });
  } catch (error) {
    console.error(
      "Error loading order success page:",
      error.message,
      error.stack
    );
    res.redirect("/pageNotFound");
  }
};

const cancelAllOrder = async (req, res) => {
  try {
    const user = req.session.user;
    const userId = user?._id || user?.id;
    const { orderId } = req.params;
    const { reason, details } = req.body;
    if (!user || !mongoose.Types.ObjectId.isValid(userId)) {
      return res.status(401).json({ success: false, error: "Unauthorized" });
    }
    const order = await Order.findOne({ orderId, user: userId });
    if (!order) {
      return res.status(404).json({ success: false, error: "Order not found" });
    }
    if (order.status === "Delivered" || order.status === "Cancelled") {
      return res
        .status(400)
        .json({ success: false, error: "Order cannot be cancelled" });
    }
    const hasShippedOrDeliveredItems = order.orderItems.some(
      (item) =>
        item.status === "Shipped" ||
        item.status === "OutForDelivery" ||
        item.status === "Out for Delivery" ||
        item.status === "Delivered"
    );
    if (hasShippedOrDeliveredItems) {
      return res.status(400).json({
        success: false,
        error:
          "Cannot cancel entire order. Some items are already shipped or delivered. Please cancel individual items instead.",
      });
    }
    let cancelledCount = 0;
    let totalRestoredQuantity = 0;
    let totalRefundAmount = 0;
    for (const item of order.orderItems) {
      if (
        item.status !== "Shipped" &&
        item.status !== "OutForDelivery" &&
        item.status !== "Out for Delivery" &&
        item.status !== "Delivered" &&
        item.status !== "Cancelled"
      ) {
        try {
          const productId = item.product?._id || item.product || item.productId;
          if (!productId || !mongoose.Types.ObjectId.isValid(productId)) {
            console.warn(`Invalid product ID for ${item.productName}`);
            continue;
          }
          const product = await Product.findById(productId);
          if (!product) {
            console.warn(`Product not found: ${productId}`);
            continue;
          }
          const quantityToRestore = item.quantity || 1;
          const variantSizeFromOrder = String(item.variantSize);
          console.log(
            `Restoring - Product: ${product.productName}, Size: ${variantSizeFromOrder}ml, Quantity: ${quantityToRestore}`
          );
          if (
            variantSizeFromOrder &&
            product.variants &&
            Array.isArray(product.variants)
          ) {
            const variantIndex = product.variants.findIndex(
              (v) => String(v.size) === variantSizeFromOrder
            );
            if (variantIndex !== -1) {
              const oldStock = product.variants[variantIndex].stock;
              const newStock = oldStock + quantityToRestore;
              console.log(
                `Stock update: ${oldStock} + ${quantityToRestore} = ${newStock}`
              );
              await Product.updateOne(
                { _id: productId },
                { $set: { [`variants.${variantIndex}.stock`]: newStock } }
              );
              totalRestoredQuantity += quantityToRestore;
            } else {
              console.warn(`Variant ${variantSizeFromOrder}ml not found`);
            }
          }
        } catch (stockError) {
          console.error(
            `Error restoring stock for ${item.productName}:`,
            stockError.message
          );
        }
        const itemDiscount = item.discountApplied || 0;
        const itemRefund = item.total - itemDiscount;
        totalRefundAmount += itemRefund;
        console.log(`Item ${item.productName}:
        Original: ₹${item.total}
        Discount: ₹${itemDiscount}
        Refund: ₹${itemRefund}`);
        item.status = "Cancelled";
        item.cancelReason = reason;
        item.cancelDetails = details;
        item.cancelledAt = new Date();
        order.finalAmount = Math.max(
          0,
          order.finalAmount - (item.finalSubtotal || item.total)
        );
        cancelledCount++;
      }
    }
    if (cancelledCount === 0) {
      return res.status(400).json({
        success: false,
        error: "No items available to cancel",
      });
    }
    if (order.finalAmount < 0) order.finalAmount = 0;
    const allCancelled = order.orderItems.every(
      (item) =>
        item.status === "Cancelled" ||
        item.status === "Delivered" ||
        item.status === "Shipped" ||
        item.status === "OutForDelivery" ||
        item.status === "Out for Delivery"
    );
    if (allCancelled) {
      order.status = "Cancelled";
      order.cancelReason = reason;
      order.cancelDetails = details;
      order.cancelledAt = new Date();
    }
    await order.save();
    let walletCredited = false;
    if (
      order.paymentMethod === "Online Payment" ||
      order.paymentMethod === "Wallet"
    ) {
      try {
        let wallet = await Wallet.findOne({ user: userId });
        if (!wallet) {
          wallet = new Wallet({
            user: userId,
            balance: 0,
            transactions: [],
          });
        }
        wallet.balance += totalRefundAmount;
        wallet.transactions.push({
          type: "credit",
          amount: totalRefundAmount,
          description: "Order Cancellation",
          orderId: orderId,
          productName: `${cancelledCount} items`,
          date: new Date(),
        });
        await wallet.save();
        console.log(
          `✅ Wallet credited: ₹${totalRefundAmount} to user ${userId}`
        );
        walletCredited = true;
      } catch (walletError) {
        console.error("Wallet credit error:", walletError.message);
      }
    }
    console.log(
      `${cancelledCount} items cancelled, ${totalRestoredQuantity} quantity restored`
    );
    res.json({
      success: true,
      message: `${cancelledCount} item(s) cancelled successfully. ${totalRestoredQuantity} total quantity restored to stock.`,
      refunded: walletCredited,
      refundAmount: totalRefundAmount,
      paymentMethod: order.paymentMethod,
    });
  } catch (error) {
    console.error("Error cancelling order:", error.message);
    res
      .status(500)
      .json({
        success: false,
        error: `Failed to cancel order: ${error.message}`,
      });
  }
};

const getOrderDetails = async (req, res) => {
  try {
    const user = req.session.user;
    const userId = user?._id || user?.id;
    if (!user || !mongoose.Types.ObjectId.isValid(userId)) {
      return res.redirect("/login");
    }
    const orderId = req.params.orderId;
    const latestOrder = await Order.findOne({ orderId, user: userId })
      .populate("orderItems.product")
      .lean();
    if (!latestOrder) {
      return res.redirect("/pageNotFound");
    }
    console.log("Order Details - Payment Status Check:", {
      orderId: latestOrder.orderId,
      paymentStatus: latestOrder.paymentStatus,
      status: latestOrder.status,
      paymentFailureReason: latestOrder.paymentFailureReason,
    });
    const formattedDate = latestOrder.createdOn
      ? new Date(latestOrder.createdOn).toLocaleDateString("en-IN", {
          day: "2-digit",
          month: "short",
          year: "numeric",
        })
      : "N/A";
    const deliveryAddress = latestOrder.deliveryAddress || {
      name: "N/A",
      houseName: "N/A",
      city: "N/A",
      state: "N/A",
      pincode: "N/A",
      phone: "N/A",
    };
    const subtotal = latestOrder.totalPrice || 0;
    const discount = latestOrder.discount || 0;
    const finalAmount = latestOrder.finalAmount || 0;
    const couponRevoked = latestOrder.couponRevoked || false;
    const formattedItems = latestOrder.orderItems.map((item, index) => {
      let itemStatus = item.status || "Placed";
      if (itemStatus === "Active") {
        itemStatus = latestOrder.status || "Placed";
      }
      const itemDeliveredDate =
        item.deliveredAt || latestOrder.deliveredAt || latestOrder.createdOn;
      const returnDate = new Date(itemDeliveredDate);
      returnDate.setDate(returnDate.getDate() + 7);
      const isItemReturnEligible =
        itemStatus === "Delivered" && Date.now() <= returnDate.getTime();
      const isReturnRejected = item.returnRejected === true;
      const isCancelled = itemStatus === "Cancelled";
      const tracking = {
        placedDate: item.tracking?.placedDate || null,
        placedTime: item.tracking?.placedTime || null,
        confirmedDate: item.tracking?.confirmedDate || null,
        confirmedTime: item.tracking?.confirmedTime || null,
        processingDate: item.tracking?.processingDate || null,
        processingTime: item.tracking?.processingTime || null,
        shippedDate: item.tracking?.shippedDate || null,
        shippedTime: item.tracking?.shippedTime || null,
        shippedLocation: item.tracking?.shippedLocation || "Warehouse",
        outForDeliveryDate: item.tracking?.outForDeliveryDate || null,
        outForDeliveryTime: item.tracking?.outForDeliveryTime || null,
        outForDeliveryLocation:
          item.tracking?.outForDeliveryLocation || deliveryAddress.city,
        deliveredDate: item.tracking?.deliveredDate || null,
        deliveredTime: item.tracking?.deliveredTime || null,
        estimatedDeliveryDate: item.tracking?.estimatedDeliveryDate || "N/A",
      };
      const itemOriginalPrice = item.total || 0;
      const itemRegularDiscount = item.discountApplied || 0;
      const itemCouponDiscount = item.couponDiscount || 0;
      let displaySubtotal = itemOriginalPrice;
      let displayDiscount = 0;
      let displayTotal = itemOriginalPrice;
      if (isCancelled) {
        displaySubtotal = itemOriginalPrice;
        displayDiscount = 0;
        displayTotal = itemOriginalPrice;
      } else if (couponRevoked) {
        displaySubtotal = itemOriginalPrice;
        displayDiscount = 0;
        displayTotal = itemOriginalPrice;
      } else {
        displaySubtotal = itemOriginalPrice;
        displayDiscount = itemRegularDiscount + itemCouponDiscount;
        displayTotal = itemOriginalPrice - displayDiscount;
      }
      return {
        itemIndex: index,
        productId: item.product?._id,
        productName:
          item.productName || item.product?.name || "Unknown Product",
        variantSize: item.variantSize ? `${item.variantSize}ml` : "N/A",
        variantSizeRaw: item.variantSize || null,
        quantity: item.quantity || 1,
        price: item.price ? `₹${item.price.toFixed(2)}` : "N/A",
        subtotal: `₹${displaySubtotal.toFixed(2)}`,
        itemDiscount: `₹${displayDiscount.toFixed(2)}`,
        total: `₹${displayTotal.toFixed(2)}`,
        status: itemStatus,
        isReturnEligible: isItemReturnEligible && !isReturnRejected,
        returnRejected: isReturnRejected,
        returnRejectionReason:
          item.returnRejectionReason || "Return request was not approved",
        isActive: !["Cancelled", "Returned", "Return Request"].includes(
          itemStatus
        ),
        itemFinalPriceNumber: displayTotal,
        image: item.product?.images?.[0]
          ? item.product.images[0].startsWith("http")
            ? item.product.images[0]
            : `/Uploads/product-images/${item.product.images[0]}`
          : "https://via.placeholder.com/130x130?text=No+Image",
        tracking,
      };
    });
    let dynamicTotal = 0;
    let dynamicDiscount = 0;
    const activeNonCancelledItems = formattedItems.filter(
      (item) => item.isActive && item.status !== "Cancelled"
    );
    if (!couponRevoked && activeNonCancelledItems.length > 0) {
      const activeItemsTotal = activeNonCancelledItems.reduce((sum, item) => {
        return sum + parseFloat(item.subtotal.replace("₹", ""));
      }, 0);
      let distributedDiscount = 0;
      activeNonCancelledItems.forEach((item, idx) => {
        const itemAmount = parseFloat(item.subtotal.replace("₹", ""));
        const itemDiscountPortion = (itemAmount / activeItemsTotal) * discount;
        const roundedDiscount = Math.round(itemDiscountPortion * 100) / 100;
        dynamicDiscount += roundedDiscount;
        dynamicTotal += itemAmount - roundedDiscount;
        distributedDiscount += roundedDiscount;
        item.calculatedDiscount = roundedDiscount;
      });
      const difference =
        Math.round((discount - distributedDiscount) * 100) / 100;
      if (Math.abs(difference) > 0.01 && activeNonCancelledItems.length > 0) {
        let maxIdx = 0;
        let maxAmount = 0;
        activeNonCancelledItems.forEach((item, idx) => {
          const amount = parseFloat(item.subtotal.replace("₹", ""));
          if (amount > maxAmount) {
            maxAmount = amount;
            maxIdx = idx;
          }
        });
        activeNonCancelledItems[maxIdx].calculatedDiscount += difference;
        dynamicDiscount += difference;
        dynamicTotal -= difference;
      }
    } else {
      activeNonCancelledItems.forEach((item) => {
        const itemAmount = parseFloat(item.subtotal.replace("₹", ""));
        dynamicTotal += itemAmount;
        item.calculatedDiscount = 0;
      });
    }
    const canCancelEntireOrder = formattedItems.some((item) =>
      ["Placed", "Confirmed", "Processing", "Active"].includes(item.status)
    );
    const isShippedOrOut = formattedItems.some(
      (item) => item.status === "Shipped" || item.status === "OutForDelivery"
    );
    const hasAnyRejectedReturn = formattedItems.some(
      (item) => item.returnRejected === true
    );
    const isReturnEligible = formattedItems.some(
      (item) =>
        item.status === "Delivered" &&
        item.isReturnEligible &&
        !item.returnRejected
    );
    const statusPriority = {
      Placed: 1,
      Confirmed: 2,
      Processing: 3,
      Shipped: 4,
      OutForDelivery: 5,
      Delivered: 6,
      Cancelled: 7,
      "Return Request": 8,
      Returned: 9,
    };
    const activeStatuses = [
      ...new Set(
        formattedItems
          .filter(
            (item) =>
              !["Cancelled", "Returned", "Return Request"].includes(item.status)
          )
          .map((item) => item.status)
      ),
    ].sort((a, b) => statusPriority[a] - statusPriority[b]);
    let displayStatus = latestOrder.status || "Pending";
    let showRetryButton = false;
    let showPaymentFailedBadge = false;
    if (
      latestOrder.paymentStatus === "Failed" ||
      latestOrder.status === "Payment Failed"
    ) {
      displayStatus = "Payment Failed";
      showRetryButton = true;
      showPaymentFailedBadge = true;
      console.log("✅ Showing payment failed badge and retry button");
    } else if (latestOrder.paymentStatus === "Completed") {
      displayStatus = activeStatuses.join(", ") || "Processing";
      showPaymentFailedBadge = false;
    }
    const summaryDiscount = couponRevoked ? 0 : discount;
    res.render("orderDetails", {
      orderId: latestOrder.orderId || latestOrder._id,
      status: displayStatus,
      paymentStatus: latestOrder.paymentStatus,
      showPaymentFailedBadge: showPaymentFailedBadge,
      showRetryButton: showRetryButton,
      paymentFailureReason: latestOrder.paymentFailureReason || null,
      date: formattedDate,
      deliveryAddress: deliveryAddress,
      paymentMethod: latestOrder.paymentMethod || "N/A",
      subtotal: `₹${subtotal.toFixed(2)}`,
      discount: `₹${summaryDiscount.toFixed(2)}`,
      couponRevoked: couponRevoked,
      amount: `₹${finalAmount.toFixed(2)}`,
      dynamicTotal: dynamicTotal.toFixed(2),
      couponApplied: latestOrder.couponApplied && !couponRevoked,
      couponCode: latestOrder.couponCode || null,
      deliveryDate: latestOrder.estimatedDeliveryDate || "N/A",
      items: formattedItems,
      canCancelEntireOrder:
        canCancelEntireOrder && latestOrder.paymentStatus === "Completed",
      isReturnEligible:
        isReturnEligible && latestOrder.paymentStatus === "Completed",
      isShippedOrOut,
      hasAnyRejectedReturn,
      activeStatuses,
      success: req.flash("success"),
    });
  } catch (error) {
    console.error("Error fetching order details:", error);
    res.redirect("/pageNotFound");
  }
};

const returnSingleOrder = async (req, res) => {
  try {
    const user = req.session.user;
    const userId = user?._id || user?.id;
    const { orderId, itemIndex, variantSize } = req.params;
    const { reason, details } = req.body;
    if (!user || !mongoose.Types.ObjectId.isValid(userId)) {
      return res.status(401).json({ success: false, error: "Unauthorized" });
    }
    const order = await Order.findOne({ orderId, user: userId });
    if (!order) {
      return res.status(404).json({ success: false, error: "Order not found" });
    }
    const idx = parseInt(itemIndex);
    if (isNaN(idx) || idx < 0 || idx >= order.orderItems.length) {
      return res
        .status(404)
        .json({ success: false, error: "Invalid item index" });
    }
    const item = order.orderItems[idx];
    if (String(item.variantSize) !== String(variantSize)) {
      return res.status(400).json({
        success: false,
        error: `Variant mismatch. Cannot process return.`,
      });
    }
    if (item.status !== "Delivered") {
      return res
        .status(400)
        .json({
          success: false,
          error: "Return can only be requested for delivered items",
        });
    }
    const deliveredDate =
      item.deliveredAt || order.deliveredAt || order.createdOn;
    const returnWindow = new Date(deliveredDate);
    returnWindow.setDate(returnWindow.getDate() + 7);
    if (Date.now() > returnWindow.getTime()) {
      return res
        .status(400)
        .json({ success: false, error: "Return window has expired" });
    }
    item.status = "Return Request";
    item.returnReason = reason;
    item.returnDetails = details;
    item.returnRequestedAt = new Date();
    const allNonCancelledReturnRequested = order.orderItems.every(
      (i) =>
        i.status === "Return Request" ||
        i.status === "Returned" ||
        i.status === "Cancelled"
    );
    if (allNonCancelledReturnRequested) {
      order.status = "Return Request";
      order.returnReason = reason;
      order.returnDetails = details;
      order.returnRequestedAt = new Date();
    }
    await order.save();
    res.json({
      success: true,
      message: `Return request for ${item.productName} (${variantSize}ml) submitted successfully`,
    });
  } catch (error) {
    console.error("Error submitting return request:", error.message);
    res
      .status(500)
      .json({ success: false, error: "Failed to submit return request" });
  }
};

const returnAllOrder = async (req, res) => {
  try {
    const user = req.session.user;
    const userId = user?._id || user?.id;
    const { orderId } = req.params;
    const { reason, details } = req.body;
    console.log("Return entire order request:", { orderId, reason, details });
    if (!user || !mongoose.Types.ObjectId.isValid(userId)) {
      console.log("Unauthorized: Invalid user or userId");
      return res.status(401).json({ success: false, error: "Unauthorized" });
    }
    const order = await Order.findOne({ orderId, user: userId });
    if (!order) {
      console.log("Order not found:", { orderId, userId });
      return res.status(404).json({ success: false, error: "Order not found" });
    }
    const allNonCancelledDelivered = order.orderItems.every(
      (item) => item.status === "Delivered" || item.status === "Cancelled"
    );
    if (!allNonCancelledDelivered) {
      console.log(
        "Not all non-cancelled items are delivered:",
        order.orderItems.map((i) => ({
          productName: i.productName,
          status: i.status,
        }))
      );
      return res
        .status(400)
        .json({
          success: false,
          error:
            "Return can only be requested when all non-cancelled items are delivered",
        });
    }
    const now = Date.now();
    const allWithinReturnWindow = order.orderItems.every((item) => {
      if (item.status === "Cancelled") return true;
      const deliveredDate =
        item.deliveredAt || order.deliveredAt || order.createdOn;
      const returnWindow = new Date(deliveredDate);
      returnWindow.setDate(returnWindow.getDate() + 7);
      return now <= returnWindow.getTime();
    });
    if (!allWithinReturnWindow) {
      console.log(
        "Return window expired for some items:",
        order.orderItems.map((i) => ({
          productName: i.productName,
          deliveredAt: i.deliveredAt,
        }))
      );
      return res
        .status(400)
        .json({
          success: false,
          error: "Return window has expired for some items",
        });
    }
    order.orderItems.forEach((item) => {
      if (item.status === "Delivered") {
        item.status = "Return Request";
        item.returnReason = reason;
        item.returnDetails = details;
        item.returnRequestedAt = new Date();
      }
    });
    order.status = "Return Request";
    order.returnReason = reason;
    order.returnDetails = details;
    order.returnRequestedAt = new Date();
    await order.save();
    console.log("Return request submitted for entire order:", orderId);
    res.json({
      success: true,
      message: "Return request for entire order submitted successfully",
    });
  } catch (error) {
    console.error(
      "Error submitting return request for order:",
      error.message,
      error.stack
    );
    res
      .status(500)
      .json({ success: false, error: "Failed to submit return request" });
  }
};

const cancelReturnSingleOrder = async (req, res) => {
  try {
    const user = req.session.user;
    const userId = user?._id || user?.id;
    const { orderId, itemIndex, variantSize } = req.params;
    if (!user || !mongoose.Types.ObjectId.isValid(userId)) {
      return res.status(401).json({ success: false, error: "Unauthorized" });
    }
    const order = await Order.findOne({ orderId, user: userId });
    if (!order) {
      return res.status(404).json({ success: false, error: "Order not found" });
    }
    const idx = parseInt(itemIndex);
    if (isNaN(idx) || idx < 0 || idx >= order.orderItems.length) {
      return res
        .status(404)
        .json({ success: false, error: "Invalid item index" });
    }
    const item = order.orderItems[idx];
    if (String(item.variantSize) !== String(variantSize)) {
      return res.status(400).json({
        success: false,
        error: "Variant mismatch. Cannot cancel return.",
      });
    }
    if (item.status !== "Return Request") {
      return res
        .status(400)
        .json({
          success: false,
          error: "Can only cancel pending return requests",
        });
    }
    item.status = "Delivered";
    item.returnReason = undefined;
    item.returnDetails = undefined;
    item.returnRequestedAt = undefined;
    const allReturnRequest = order.orderItems.every(
      (i) => i.status === "Return Request" || i.status === "Returned"
    );
    if (!allReturnRequest) {
      order.status = "Delivered";
      order.returnReason = undefined;
      order.returnDetails = undefined;
      order.returnRequestedAt = undefined;
    }
    await order.save();
    res.json({
      success: true,
      message: `Return request for ${item.productName} (${variantSize}ml) cancelled successfully`,
    });
  } catch (error) {
    console.error("Error cancelling return request:", error);
    res
      .status(500)
      .json({ success: false, error: "Failed to cancel return request" });
  }
};

const cancelReturnAllOrder = async (req, res) => {
  try {
    const user = req.session.user;
    const userId = user?._id || user?.id;
    const { orderId } = req.params;
    if (!user || !mongoose.Types.ObjectId.isValid(userId)) {
      return res.status(401).json({ success: false, error: "Unauthorized" });
    }
    const order = await Order.findOne({ orderId, user: userId });
    if (!order) {
      return res.status(404).json({ success: false, error: "Order not found" });
    }
    if (order.status !== "Return Request") {
      return res
        .status(400)
        .json({
          success: false,
          error: "Can only cancel pending return requests",
        });
    }
    order.orderItems.forEach((item) => {
      if (item.status === "Return Request") {
        item.status = "Delivered";
        item.returnReason = undefined;
        item.returnDetails = undefined;
        item.returnRequestedAt = undefined;
      }
    });
    order.status = "Delivered";
    order.returnReason = undefined;
    order.returnDetails = undefined;
    order.returnRequestedAt = undefined;
    await order.save();
    res.json({
      success: true,
      message: "Return request for entire order cancelled successfully",
    });
  } catch (error) {
    console.error("Error cancelling return request for order:", error);
    res
      .status(500)
      .json({ success: false, error: "Failed to cancel return request" });
  }
};

const updateItemStatus = async (
  orderId,
  productName,
  newStatus,
  shippedLocation = null,
  outForDeliveryLocation = null
) => {
  const order = await Order.findOne({ orderId });
  if (!order) throw new Error("Order not found");
  const item = order.orderItems.find(
    (item) => item.productName === productName
  );
  if (!item) throw new Error("Item not found");
  const now = new Date();
  const formatDateTime = (date) => ({
    date: date.toLocaleDateString("en-IN", {
      day: "2-digit",
      month: "short",
      year: "numeric",
    }),
    time: date.toLocaleTimeString("en-IN", {
      hour: "2-digit",
      minute: "2-digit",
      hour12: true,
    }),
  });
  if (!item.tracking.estimatedDeliveryDate && newStatus !== "Delivered") {
    const deliveryDate = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
    item.tracking.estimatedDeliveryDate = deliveryDate.toLocaleDateString(
      "en-IN",
      { day: "2-digit", month: "short", year: "numeric" }
    );
  }
  const statusTimestamps = [
    { status: "Placed", dateField: "placedDate", timeField: "placedTime" },
    {
      status: "Confirmed",
      dateField: "confirmedDate",
      timeField: "confirmedTime",
    },
    {
      status: "Processing",
      dateField: "processingDate",
      timeField: "processingTime",
    },
    { status: "Shipped", dateField: "shippedDate", timeField: "shippedTime" },
    {
      status: "OutForDelivery",
      dateField: "outForDeliveryDate",
      timeField: "outForDeliveryTime",
    },
    {
      status: "Delivered",
      dateField: "deliveredDate",
      timeField: "deliveredTime",
    },
  ];
  const statusPriority = {
    Placed: 1,
    Confirmed: 2,
    Processing: 3,
    Shipped: 4,
    OutForDelivery: 5,
    Delivered: 6,
    Cancelled: 7,
    "Return Request": 8,
    Returned: 9,
  };
  item.status = newStatus;
  const currentPriority = statusPriority[newStatus] || 0;
  statusTimestamps.forEach(({ status, dateField, timeField }, index) => {
    if (
      statusPriority[status] <= currentPriority &&
      status !== "Delivered" &&
      newStatus !== "Cancelled" &&
      newStatus !== "Return Request" &&
      newStatus !== "Returned"
    ) {
      if (!item.tracking[dateField]) {
        const simulatedDate = new Date(
          now.getTime() -
            (currentPriority - statusPriority[status]) * 24 * 60 * 60 * 1000
        );
        const formatted = formatDateTime(simulatedDate);
        item.tracking[dateField] = formatted.date;
        item.tracking[timeField] = formatted.time;
      }
    }
  });
  switch (newStatus) {
    case "Confirmed":
      if (!item.tracking.confirmedDate) {
        const formatted = formatDateTime(now);
        item.tracking.confirmedDate = formatted.date;
        item.tracking.confirmedTime = formatted.time;
      }
      break;
    case "Processing":
      if (!item.tracking.processingDate) {
        const formatted = formatDateTime(now);
        item.tracking.processingDate = formatted.date;
        item.tracking.processingTime = formatted.time;
      }
      break;
    case "Shipped":
      if (!item.tracking.shippedDate) {
        const formatted = formatDateTime(now);
        item.tracking.shippedDate = formatted.date;
        item.tracking.shippedTime = formatted.time;
      }
      item.tracking.shippedLocation = shippedLocation || "Warehouse XYZ";
      break;
    case "OutForDelivery":
      if (!item.tracking.outForDeliveryDate) {
        const formatted = formatDateTime(now);
        item.tracking.outForDeliveryDate = formatted.date;
        item.tracking.outForDeliveryTime = formatted.time;
      }
      item.tracking.outForDeliveryLocation =
        outForDeliveryLocation || "Local Hub ABC";
      break;
    case "Delivered":
      if (!item.tracking.deliveredDate) {
        const formatted = formatDateTime(now);
        item.tracking.deliveredDate = formatted.date;
        item.tracking.deliveredTime = formatted.time;
      }
      item.tracking.estimatedDeliveryDate = null;
      break;
    case "Cancelled":
      item.cancelledAt = now;
      break;
    case "Return Request":
      item.returnRequestedAt = now;
      break;
    case "Returned":
      item.returnedAt = now;
      break;
  }
  const allStatuses = order.orderItems.map((item) => item.status);
  order.status = allStatuses.every((s) => s === "Delivered")
    ? "Delivered"
    : allStatuses.includes("Cancelled") &&
      allStatuses.every((s) => s === "Cancelled" || s === "Delivered")
    ? "Cancelled"
    : allStatuses.includes("Return Request")
    ? "Return Request"
    : allStatuses.includes("Returned")
    ? "Returned"
    : allStatuses.includes("OutForDelivery")
    ? "OutForDelivery"
    : allStatuses.includes("Shipped")
    ? "Shipped"
    : allStatuses.includes("Processing")
    ? "Processing"
    : "Placed";
  await order.save();
  return order;
};

const updateItemStatusRoute = async (req, res) => {
  try {
    const { orderId, productName } = req.params;
    const { status, shippedLocation, outForDeliveryLocation } = req.body;
    const order = await updateItemStatus(
      orderId,
      productName,
      status,
      shippedLocation,
      outForDeliveryLocation
    );
    res.json({ success: true, order });
  } catch (error) {
    console.error("Error updating status:", error);
    res.status(500).json({ success: false, error: error.message });
  }
};

const distributeDiscountProportionally = (items, totalDiscount) => {
  if (!Array.isArray(items) || items.length === 0 || !totalDiscount || totalDiscount <= 0) {
    return items.map(it => ({ ...it, couponDiscount: 0 }));
  }
  const normalized = items.map(it => {
    const price = Number(it.price || 0);
    const qty = Number(it.quantity != null ? it.quantity : 1);
    const total = Number(it.total != null ? it.total : price * qty);
    return { ...it, price, quantity: qty, total };
  });
  const grandTotal = normalized.reduce((s, it) => s + (it.total || 0), 0);
  if (grandTotal <= 0) {
    return normalized.map(it => ({ ...it, couponDiscount: 0 }));
  }
  const result = [];
  let distributed = 0;
  normalized.forEach((it) => {
    const proportion = (it.total || 0) / grandTotal;
    const disc = Math.round(proportion * totalDiscount * 100) / 100;
    distributed += disc;
    result.push({ ...it, couponDiscount: disc });
  });
  const diff = Math.round((totalDiscount - distributed) * 100) / 100;
  if (Math.abs(diff) >= 0.01 && result.length > 0) {
    let maxIdx = 0;
    let maxTotal = -Infinity;
    result.forEach((r, idx) => {
      if ((r.total || 0) > maxTotal) { maxTotal = r.total || 0; maxIdx = idx; }
    });
    result[maxIdx].couponDiscount = Math.round((result[maxIdx].couponDiscount + diff) * 100) / 100;
  }
  return result.map(it => ({ ...it, couponDiscount: Number(it.couponDiscount || 0) }));
};

const formatCurrency = (amount) => {
  if (isNaN(amount) || amount === null || amount === undefined) {
    return "₹0.00";
  }
  return `₹${Math.abs(parseFloat(amount)).toFixed(2)}`;
};

const checkCancellationImpact = async (req, res) => {
  try {
    const user = req.session.user;
    const userId = user?._id || user?.id;
    const { orderId, itemIndex, variantSize } = req.params;
    if (!user || !mongoose.Types.ObjectId.isValid(userId)) {
      return res.status(401).json({ success: false, error: "Unauthorized" });
    }
    const order = await Order.findOne({ orderId, user: userId });
    if (!order) return res.status(404).json({ success: false, error: "Order not found" });
    const idx = parseInt(itemIndex);
    const item = order.orderItems[idx];
    if (!item || String(item.variantSize) !== String(variantSize)) {
      return res.status(400).json({ success: false, error: "Invalid item or variant" });
    }
    const orderItems = order.orderItems.map(it => ({
      ...it.toObject?.() || it,
      total: Number(it.total || (it.price || 0) * (it.quantity || 1)),
      couponDiscount: Number(it.couponDiscount || 0)
    }));
    const orderDiscount = Number(order.discount || 0);
    const hasPerItemDiscount = orderItems.some(it => it.couponDiscount > 0);
    const itemsWithDiscount = hasPerItemDiscount
      ? orderItems
      : distributeDiscountProportionally(orderItems, orderDiscount);
    const cancelledItem = itemsWithDiscount[idx];
    const itemOriginalPrice = cancelledItem.total;
    const itemDiscount = cancelledItem.couponDiscount;
    const itemUserPaid = itemOriginalPrice - itemDiscount;
    const remainingItems = itemsWithDiscount.filter((_, i) => i !== idx && _.status !== "Cancelled");
    const remainingSubtotal = remainingItems.reduce((s, it) => s + it.total, 0);
    let refundAmount = itemUserPaid;
    let couponRevoked = false;
    let balanceDue = 0;
    let revokedDiscountOnOtherItems = 0;
    let minPurchase = 0;
    if (order.couponApplied && order.couponCode && !order.couponRevoked && orderDiscount > 0) {
      const coupon = await Coupon.findOne({ couponCode: order.couponCode.toUpperCase() });
      if (coupon) {
        minPurchase = coupon.minimumPrice;
        if (remainingSubtotal < minPurchase) {
          couponRevoked = true;
          const remainingPaid = remainingItems.reduce((sum, it) => sum + (it.total - it.couponDiscount), 0);
          const remainingFull = remainingItems.reduce((sum, it) => sum + it.total, 0);
          balanceDue = remainingFull - remainingPaid;
          revokedDiscountOnOtherItems = remainingItems.reduce((s, it) => s + it.couponDiscount, 0);
          refundAmount = Math.max(0, Math.round((itemUserPaid - balanceDue) * 100) / 100);
        }
      }
    }
    return res.json({
      success: true,
      couponRevoked,
      refundAmount,
      balanceDue,
      revokedDiscountOnOtherItems,
      minPurchase,
      remainingOrderTotal: remainingSubtotal,
      itemPrice: itemOriginalPrice,
      itemUserPaid,
      remainingItemsCount: remainingItems.length,
      remainingItemsCurrentlyPaid: remainingItems.reduce((s, it) => s + (it.total - it.couponDiscount), 0)
    });
  } catch (err) {
    console.error("❌ checkCancellationImpact error:", err);
    res.status(500).json({ success: false, error: err.message });
  }
};

const cancelSingleOrderWithCouponCheck = async (req, res) => {
  try {
    const user = req.session.user;
    const userId = user?._id || user?.id;
    const { orderId, itemIndex, variantSize } = req.params;
    const { reason, details } = req.body;
    if (!user || !mongoose.Types.ObjectId.isValid(userId)) {
      return res.status(401).json({ success: false, error: 'Unauthorized' });
    }
    const order = await Order.findOne({ orderId, user: userId });
    if (!order) return res.status(404).json({ success: false, error: 'Order not found' });
    const idx = parseInt(itemIndex, 10);
    if (isNaN(idx) || idx < 0 || idx >= order.orderItems.length) {
      return res.status(400).json({ success: false, error: 'Invalid item index' });
    }
    const item = order.orderItems[idx];
    if (String(item.variantSize) !== String(variantSize)) {
      return res.status(400).json({ success: false, error: 'Variant mismatch' });
    }
    if (item.status === 'Cancelled') {
      return res.status(400).json({ success: false, error: 'Item already cancelled' });
    }
    try {
      const productId = item.product?._id || item.product || item.productId;
      if (mongoose.Types.ObjectId.isValid(productId)) {
        const product = await Product.findById(productId);
        if (product && Array.isArray(product.variants)) {
          const vi = product.variants.findIndex(v => String(v.size) === String(variantSize));
          if (vi !== -1) {
            product.variants[vi].stock = (product.variants[vi].stock || 0) + (item.quantity || 0);
            await product.save();
          }
        }
      }
    } catch (err) { console.warn('Stock restore failed:', err.message); }
    const rawItems = order.orderItems.map(it => {
      const obj = it.toObject ? it.toObject() : { ...it };
      obj.total = Number(obj.total != null ? obj.total : (obj.price || 0) * (obj.quantity || 1));
      obj.couponDiscount = Number(obj.couponDiscount || 0);
      return obj;
    });
    let itemsWithDiscount = rawItems;
    const orderDiscount = Number(order.discount || 0);
    const anyPerItemDiscount = rawItems.some(i => Number(i.couponDiscount || 0) > 0);
    if (!anyPerItemDiscount && orderDiscount > 0) {
      itemsWithDiscount = distributeDiscountProportionally(rawItems, orderDiscount);
      itemsWithDiscount = itemsWithDiscount.map((it, i) => ({ ...it, _id: rawItems[i]._id }));
    }
    const cancelledItem = itemsWithDiscount.find(it => String(it._id) === String(item._id));
    if (!cancelledItem) return res.status(500).json({ success: false, error: 'Internal mapping error' });
    const cancelledOriginalTotal = Number(cancelledItem.total || 0);
    const cancelledCouponDiscount = Number(cancelledItem.couponDiscount || 0);
    const itemUserPaid = Math.round((cancelledOriginalTotal - cancelledCouponDiscount) * 100) / 100;
    const remainingItems = itemsWithDiscount.filter(it => String(it._id) !== String(cancelledItem._id) && it.status !== 'Cancelled');
    const remainingFullPrice = remainingItems.reduce((s, it) => s + Number(it.total || 0), 0);
    const remainingCurrentlyPay = remainingItems.reduce((s, it) => s + (Number(it.total || 0) - Number(it.couponDiscount || 0)), 0);
    let refundAmount = itemUserPaid;
    let couponRevoked = false;
    let clawbackOnRemaining = 0;
    let balanceDue = 0;
    if (order.couponApplied && order.couponCode && !order.couponRevoked && orderDiscount > 0) {
      const coupon = await Coupon.findOne({ couponCode: String(order.couponCode).toUpperCase() });
      if (coupon && typeof coupon.minimumPrice === 'number' && coupon.minimumPrice > 0) {
        const min = Number(coupon.minimumPrice);
        if (remainingFullPrice < min) {
          couponRevoked = true;
          clawbackOnRemaining = Math.round(remainingItems.reduce((s, it) => s + Number(it.couponDiscount || 0), 0) * 100) / 100;
          balanceDue = Math.round((orderDiscount - clawbackOnRemaining) * 100) / 100;
          refundAmount = Math.max(0, Math.round((itemUserPaid - balanceDue) * 100) / 100);
          console.log("🟥 Coupon revoked!");
          console.log(" Total Discount:", orderDiscount);
          console.log(" Discount revoked from others:", clawbackOnRemaining);
          console.log(" Deduction for cancelled item:", balanceDue);
          console.log(" Final refund:", refundAmount);
          order.couponApplied = false;
          order.couponRevoked = true;
          order.couponCode = null;
          order.discount = 0;
          remainingItems.forEach(rem => {
            const sub = order.orderItems.id(rem._id);
            if (sub) sub.couponDiscount = 0;
          });
          order.totalPrice = Math.round(remainingFullPrice * 100) / 100;
          order.finalAmount = order.totalPrice;
        } else {
          order.discount = Math.round((Number(order.discount || 0) - cancelledCouponDiscount) * 100) / 100;
          order.totalPrice = Math.round((Number(order.totalPrice || 0) - cancelledOriginalTotal) * 100) / 100;
          order.finalAmount = Math.round((order.totalPrice - order.discount) * 100) / 100;
          refundAmount = itemUserPaid;
        }
      }
    }
    item.status = 'Cancelled';
    item.cancelReason = reason || '';
    item.cancelDetails = details || '';
    item.cancelledAt = new Date();
    item.refundAmount = refundAmount;
    item.clawbackAmount = clawbackOnRemaining;
    await order.save();
    let walletCredited = false;
    if (['Online Payment', 'Wallet', 'Razorpay', 'UPI'].includes(order.paymentMethod) && refundAmount > 0) {
      let wallet = await Wallet.findOne({ user: userId });
      if (!wallet) wallet = new Wallet({ user: userId, balance: 0, transactions: [] });
      wallet.balance = Math.round((Number(wallet.balance || 0) + refundAmount) * 100) / 100;
      wallet.transactions.push({
        type: 'credit',
        amount: refundAmount,
        description: couponRevoked ? 'Order Cancellation (Coupon Revoked)' : 'Order Cancellation',
        reason: `${item.productName} (${variantSize}) - ${reason || 'No reason provided'}`,
        orderId,
        date: new Date()
      });
      await wallet.save();
      walletCredited = true;
    }
    const responsePayload = {
      success: true,
      couponRevoked,
      refundAmount,
      totalDiscount: Math.round(orderDiscount * 100) / 100,
      revokedDiscountOnOtherItems: Math.round(clawbackOnRemaining * 100) / 100,
      remainingFullPrice: Math.round(remainingFullPrice * 100) / 100,
      remainingCurrentlyPay: Math.round(remainingCurrentlyPay * 100) / 100,
      balanceDue: Math.round(balanceDue * 100) / 100,
      itemUserPaid: Math.round(itemUserPaid * 100) / 100,
      cancelledOriginalTotal: Math.round(cancelledOriginalTotal * 100) / 100,
      refundedToWallet: walletCredited
    };
    return res.json(responsePayload);
  } catch (error) {
    console.error('cancelSingleOrderWithCouponCheck error:', error);
    return res.status(500).json({ success: false, error: error.message || 'Server error' });
  }
};

module.exports = {
  getOrderSuccess,
  getOrderDetails,
  checkCancellationImpact,
  cancelAllOrder,
  returnSingleOrder,
  returnAllOrder,
  cancelReturnSingleOrder,
  cancelReturnAllOrder,
  updateItemStatus,
  updateItemStatusRoute,
  formatCurrency,
  distributeDiscountProportionally,
  Coupon,
  cancelSingleOrderWithCouponCheck,
};