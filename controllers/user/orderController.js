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


    const user = req.user || req.session.user;
      const userId = req.userId;

    console.log("Session user in getOrderSuccess:", user);
  
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
        shipping: "₹0",
        amount: "₹0",
        deliveryDate: "N/A",
        items: [],
        deliveryAddress: "N/A",
        success: req.flash("success"),
        user: req.user || req.session.user || null
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
    const shippingAmount = latestOrder.shippingCharge || 49;
    const finalAmount = latestOrder.finalAmount || 0;
    const formattedSubtotal = `₹${subtotalAmount.toFixed(2)}`;
    const formattedDiscount =
      discountAmount > 0 ? `-₹${discountAmount.toFixed(2)}` : "₹0";
    const formattedShipping = `₹${shippingAmount.toFixed(2)}`;
    const formattedFinalAmount = `₹${finalAmount.toFixed(2)}`;
    console.log("Formatted amounts:", {
      subtotal: formattedSubtotal,
      discount: formattedDiscount,
      shipping: formattedShipping,
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
      shipping: formattedShipping,
      amount: formattedFinalAmount,
      deliveryDate: formattedDelivery,
      items: formattedItems,
      deliveryAddress: deliveryAddress,
      couponApplied: latestOrder.couponApplied || false,
      couponCode: latestOrder.couponCode || null,
      paymentStatus: latestOrder.paymentStatus,
      status: latestOrder.status,
      success: req.flash("success"),
      user: req.user || req.session.user || null
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
   const userId = req.userId; 
const user = req.user || req.session.user;
    const { orderId } = req.params;
    const { reason, details } = req.body;

    if (!user || !mongoose.Types.ObjectId.isValid(userId)) {
      return res.status(401).json({ success: false, error: "Unauthorized" });
    }

    const order = await Order.findOne({ orderId, user: userId });
    if (!order)
      return res.status(404).json({ success: false, error: "Order not found" });

    let totalRefund = 0;
    let cancelledCount = 0;
    const shippingCharge = Number(order.shippingCharge || 49);

    order.orderItems.forEach((item) => {
      if (
        item.status !== "Shipped" &&
        item.status !== "OutForDelivery" &&
        item.status !== "Delivered" &&
        item.status !== "Cancelled" &&
        item.status !== "Returned"
      ) {
        const itemOriginalTotal = Number(item.total || 0);
        const itemDiscount = Number(
          item.originalCouponDiscount || item.couponDiscount || 0
        );
        const itemUserPaid =
          Math.round((itemOriginalTotal - itemDiscount) * 100) / 100;

        totalRefund += itemUserPaid;
        item.status = "Cancelled";
        item.cancelReason = reason;
        item.cancelDetails = details;
        item.cancelledAt = new Date();
        cancelledCount++;
      }
    });

    if (cancelledCount === 0) {
      return res
        .status(400)
        .json({ success: false, error: "No items available to cancel" });
    }

    const allItemsCancelled = order.orderItems.every(
      (item) => item.status === "Cancelled" || item.status === "Returned"
    );

    if (allItemsCancelled) {
      totalRefund += shippingCharge;
      console.log(
        ` All items cancelled. Refunding shipping: ₹${shippingCharge}`
      );
    } else {
      console.log(` Some items remain. NOT refunding shipping`);
    }

    order.status = "Cancelled";
    order.cancelReason = reason;
    order.cancelDetails = details;
    order.cancelledAt = new Date();

    if (allItemsCancelled) {
      order.finalAmount = 0;
    } else {
      order.finalAmount =
        Math.round((order.totalPrice - order.discount + shippingCharge) * 100) /
        100;
    }

    if (
      totalRefund > 0 &&
      ["Online Payment", "Wallet", "Razorpay", "UPI"].includes(
        order.paymentMethod
      )
    ) {
      let wallet = await Wallet.findOne({ user: userId });
      if (!wallet)
        wallet = new Wallet({ user: userId, balance: 0, transactions: [] });

      wallet.balance =
        Math.round((Number(wallet.balance || 0) + totalRefund) * 100) / 100;

      wallet.transactions.push({
        type: "credit",
        amount: totalRefund,
        description: "Order Cancellation",
        reason: `Full order cancellation - ${cancelledCount} items`,
        orderId: orderId,
        date: new Date(),
      });

      await wallet.save();
    }

    await order.save();

    return res.json({
      success: true,
      message: `Order cancelled. Full refund: ₹${totalRefund.toFixed(2)}`,
      refundAmount: Math.round(totalRefund * 100) / 100,
      shippingRefund: allItemsCancelled ? shippingCharge : 0,
      cancelledCount,
    });
  } catch (error) {
    console.error(" cancelAllOrderWithCouponCheck error:", error);
    return res
      .status(500)
      .json({ success: false, error: error.message || "Server error" });
  }
};

const getOrderDetails = async (req, res) => {
  try {
    const userId = req.userId; 
    const user = req.user || req.session.user;
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
    const shipping = latestOrder.shippingCharge || 49;
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
      } else if (itemStatus === "Return Request") {
        displaySubtotal = itemOriginalPrice;
        if (couponRevoked) {
          displayDiscount = itemRegularDiscount;
        } else {
          displayDiscount = itemRegularDiscount + itemCouponDiscount;
        }
        displayTotal = itemOriginalPrice - displayDiscount;
      } else if (couponRevoked) {
        displaySubtotal = itemOriginalPrice;
        displayDiscount = itemRegularDiscount;
        displayTotal = itemOriginalPrice - displayDiscount;
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

        itemOriginalPrice: itemOriginalPrice,
        itemTotalDiscount: displayDiscount,
        itemFinalPrice: displayTotal,

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

        couponDiscount: Number(item.couponDiscount || 0),
        originalCouponDiscount:
          item.originalCouponDiscount && item.originalCouponDiscount > 0
            ? Number(item.originalCouponDiscount)
            : Number(item.couponDiscount || 0),

        subtotalNumber: Number(item.total || 0),

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
      (item) => item.status !== "Cancelled" && item.status !== "Return Request"
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

    const itemStatuses = formattedItems.map((item) => item.status);

    const allCancelled = itemStatuses.every((s) => s === "Cancelled");
    const allReturned = itemStatuses.every((s) => s === "Returned");
    const allCancelledOrReturned = itemStatuses.every(
      (s) => s === "Cancelled" || s === "Returned"
    );
    const allReturnRequest = itemStatuses.every((s) => s === "Return Request");
    const someCancelled = itemStatuses.some((s) => s === "Cancelled");
    const someReturned = itemStatuses.some(
      (s) => s === "Returned" || s === "Return Request"
    );

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
      console.log(" Showing payment failed badge and retry button");
    } else if (allCancelled) {
      displayStatus = "Cancelled";
      console.log(" All items cancelled - Status: Cancelled");
    } else if (allReturned) {
      displayStatus = "Returned";
      console.log(" All items returned - Status: Returned");
    } else if (allCancelledOrReturned) {
      displayStatus = someReturned ? "Returned" : "Cancelled";
      console.log(` Mix of cancelled/returned - Status: ${displayStatus}`);
    } else if (allReturnRequest) {
      displayStatus = "Return Request";
      console.log(" All items return request - Status: Return Request");
    } else if (someCancelled || someReturned) {
      displayStatus = "Partially Cancelled";
      console.log(" Some items cancelled - Status: Partially Cancelled");
    } else if (latestOrder.paymentStatus === "Completed") {
      const activeStatuses = [
        ...new Set(
          itemStatuses.filter(
            (s) =>
              s !== "Cancelled" && s !== "Returned" && s !== "Return Request"
          )
        ),
      ];

      const statusPriority = {
        Placed: 1,
        Confirmed: 2,
        Processing: 3,
        Shipped: 4,
        OutForDelivery: 5,
        Delivered: 6,
      };

      activeStatuses.sort((a, b) => statusPriority[a] - statusPriority[b]);
      displayStatus =
        activeStatuses.length > 0 ? activeStatuses.join(", ") : "Processing";
      console.log(` Active items status: ${displayStatus}`);
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
      shipping: `₹${shipping.toFixed(2)}`,
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
     activeStatuses: itemStatuses.filter(
        (s) => s !== "Cancelled" && s !== "Returned" && s !== "Return Request"
      ),
      success: req.flash("success"),
      user: req.user || req.session.user || null 
    });
  } catch (error) {
    console.error("Error fetching order details:", error);
    res.redirect("/pageNotFound");
  }
};

const returnAllOrder = async (req, res) => {
  try {
    const userId = req.userId; 
    const user = req.user || req.session.user;
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
      return res.status(400).json({
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
      return res.status(400).json({
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
    const userId = req.userId; 
    const user = req.user || req.session.user;
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
      return res.status(400).json({
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
   const userId = req.userId; 
    const user = req.user || req.session.user;
    const { orderId } = req.params;
    if (!user || !mongoose.Types.ObjectId.isValid(userId)) {
      return res.status(401).json({ success: false, error: "Unauthorized" });
    }
    const order = await Order.findOne({ orderId, user: userId });
    if (!order) {
      return res.status(404).json({ success: false, error: "Order not found" });
    }
    if (order.status !== "Return Request") {
      return res.status(400).json({
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
 // Dynamic Estimated Delivery based on status
if (["Placed", "Confirmed", "Processing", "Shipped", "OutForDelivery"].includes(newStatus)) {

  let daysToAdd = 7; // default for Placed/Confirmed

  switch (newStatus) {
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

  const estimated = new Date(now.getTime() + daysToAdd * 24 * 60 * 60 * 1000);

  item.tracking.estimatedDeliveryDate = estimated.toLocaleDateString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
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
  case "Delivered": {
  const formatted = formatDateTime(now);

  if (!item.tracking.deliveredDate) {
    item.tracking.deliveredDate = formatted.date;
    item.tracking.deliveredTime = formatted.time;
  }

 
  const backfillStages = [
    { key: "OutForDelivery", dateField: "outForDeliveryDate", timeField: "outForDeliveryTime" },
    { key: "Shipped", dateField: "shippedDate", timeField: "shippedTime" },
    { key: "Processing", dateField: "processingDate", timeField: "processingTime" },
    { key: "Confirmed", dateField: "confirmedDate", timeField: "confirmedTime" },
    { key: "Placed", dateField: "placedDate", timeField: "placedTime" },
  ];

  backfillStages.forEach(({ key, dateField, timeField }, index) => {
    const simulated = new Date(now.getTime() - ((index + 1) * 2 * 60 * 60 * 1000)); // subtract 2 hours per step
    const f = formatDateTime(simulated);
    if (!item.tracking[dateField]) {
      item.tracking[dateField] = f.date;
      item.tracking[timeField] = f.time;
    }
  });

  item.tracking.estimatedDeliveryDate = null;
  break;
}

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

const formatCurrency = (amount) => {
  if (isNaN(amount) || amount === null || amount === undefined) {
    return "₹0.00";
  }
  return `₹${Math.abs(parseFloat(amount)).toFixed(2)}`;
};

const distributeDiscountProportionally = (items, totalDiscount) => {
  if (
    !Array.isArray(items) ||
    items.length === 0 ||
    !totalDiscount ||
    totalDiscount <= 0
  ) {
    return items.map((it) => ({ ...it, couponDiscount: 0 }));
  }

  const normalized = items.map((it) => {
    const price = Number(it.price || 0);
    const qty = Number(it.quantity != null ? it.quantity : 1);
    const total = Number(it.total != null ? it.total : price * qty);
    return { ...it, price, quantity: qty, total };
  });

  const grandTotal = normalized.reduce((s, it) => s + (it.total || 0), 0);

  if (grandTotal <= 0) {
    return normalized.map((it) => ({ ...it, couponDiscount: 0 }));
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
      if ((r.total || 0) > maxTotal) {
        maxTotal = r.total || 0;
        maxIdx = idx;
      }
    });
    result[maxIdx].couponDiscount =
      Math.round((result[maxIdx].couponDiscount + diff) * 100) / 100;
  }

  return result.map((it) => ({
    ...it,
    couponDiscount: Number(it.couponDiscount || 0),
  }));
};

const checkCancellationImpact = async (req, res) => {
  try {
   const userId = req.userId; 
    const user = req.user || req.session.user;
   const { orderId, itemIndex, variantSize } = req.params;

   
    if (!userId || !mongoose.Types.ObjectId.isValid(userId)) {
      return res.status(401).json({ success: false, error: "Unauthorized" });
    }

    const order = await Order.findOne({ orderId, user: userId });
    if (!order)
      return res.status(404).json({ success: false, error: "Order not found" });

    const idx = parseInt(itemIndex);
    const item = order.orderItems[idx];

    if (!item || String(item.variantSize) !== String(variantSize)) {
      return res
        .status(400)
        .json({ success: false, error: "Invalid item or variant" });
    }

    const getEffectivePrice = (orderItem) => {
      if (order.couponRevoked) {
        return Number(orderItem.total || 0);
      } else {
        return Number(orderItem.total || 0);
      }
    };

    const getEffectiveDiscount = (orderItem) => {
      if (order.couponRevoked) {
        return 0;
      } else {
        return Number(
          orderItem.originalCouponDiscount || orderItem.couponDiscount || 0
        );
      }
    };

    const cancelledItem = item;
    const itemOriginalPrice = getEffectivePrice(cancelledItem);
    const itemDiscount = getEffectiveDiscount(cancelledItem);
    const itemUserPaid =
      Math.round((itemOriginalPrice - itemDiscount) * 100) / 100;

    const remainingItems = order.orderItems.filter(
      (it, i) =>
        i !== idx && it.status !== "Cancelled" && it.status !== "Returned"
    );

    const remainingSubtotal = remainingItems.reduce(
      (s, it) => s + getEffectivePrice(it),
      0
    );

    let refundAmount = itemUserPaid;
    let couponRevoked = false;
    let balanceDue = 0;
    let revokedDiscountOnOtherItems = 0;
    let minPurchase = 0;

    if (order.couponApplied && order.couponCode && !order.couponRevoked) {
      const coupon = await Coupon.findOne({
        couponCode: order.couponCode.toUpperCase(),
      });

      if (coupon) {
        minPurchase = coupon.minimumPrice;

        if (remainingSubtotal < minPurchase) {
          couponRevoked = true;

          revokedDiscountOnOtherItems =
            Math.round(
              remainingItems.reduce(
                (s, it) =>
                  s +
                  Number(it.originalCouponDiscount || it.couponDiscount || 0),
                0
              ) * 100
            ) / 100;

          balanceDue = revokedDiscountOnOtherItems;

          refundAmount = Math.max(
            0,
            Math.round((itemUserPaid - balanceDue) * 100) / 100
          );
        }
      }
    }

    return res.json({
      success: true,
      couponRevoked,
      refundAmount,
      balanceDue,
      revokedDiscountOnOtherItems,
      totalDiscount: Number(order.discount || 0),
      remainingFullPrice: remainingItems.reduce(
        (s, it) => s + getEffectivePrice(it),
        0
      ),
      remainingCurrentlyPay: remainingItems.reduce(
        (s, it) => s + (getEffectivePrice(it) - getEffectiveDiscount(it)),
        0
      ),
      minPurchase,
      itemPrice: itemOriginalPrice,
      itemUserPaid,
      remainingItemsCount: remainingItems.length,
    });
  } catch (err) {
    console.error(" checkCancellationImpact error:", err);
    res.status(500).json({ success: false, error: err.message });
  }
};

const cancelSingleOrderWithCouponCheck = async (req, res) => {
  try {
    const userId = req.userId; 
    const user = req.user || req.session.user;
    const { orderId, itemIndex, variantSize } = req.params;
    const { reason, details } = req.body;

    if (!user || !mongoose.Types.ObjectId.isValid(userId)) {
      return res.status(401).json({ success: false, error: "Unauthorized" });
    }

    const order = await Order.findOne({ orderId, user: userId });
    if (!order)
      return res.status(404).json({ success: false, error: "Order not found" });

    const idx = parseInt(itemIndex, 10);
    if (isNaN(idx) || idx < 0 || idx >= order.orderItems.length) {
      return res
        .status(400)
        .json({ success: false, error: "Invalid item index" });
    }

    const item = order.orderItems[idx];
    if (String(item.variantSize) !== String(variantSize)) {
      return res
        .status(400)
        .json({ success: false, error: "Variant mismatch" });
    }

    if (item.status === "Cancelled" || item.status === "Returned") {
      return res
        .status(400)
        .json({ success: false, error: "Item already cancelled or returned" });
    }

    const originalOrderDiscount = Number(order.discount || 0);
    const orderMinPurchase = order.couponApplied
      ? (await Coupon.findOne({ couponCode: order.couponCode?.toUpperCase() }))
          ?.minimumPrice || 0
      : 0;

    const shippingCharge = Number(order.shippingCharge || 49);

    const cancelledItemOriginalTotal = Number(item.total || 0);
    let cancelledItemDiscount = 0;
    let cancelledItemUserPaid = 0;

    if (order.couponRevoked) {
      cancelledItemDiscount = 0;
      cancelledItemUserPaid = cancelledItemOriginalTotal;
      console.log(
        ` Coupon Already Revoked: Refunding full amount ₹${cancelledItemOriginalTotal}`
      );
    } else {
      cancelledItemDiscount = Number(
        item.originalCouponDiscount || item.couponDiscount || 0
      );
      cancelledItemUserPaid =
        Math.round((cancelledItemOriginalTotal - cancelledItemDiscount) * 100) /
        100;
      console.log(
        ` Coupon Active: Refunding ₹${cancelledItemUserPaid} (original: ₹${cancelledItemOriginalTotal}, discount: ₹${cancelledItemDiscount})`
      );
    }

    const remainingItems = order.orderItems.filter(
      (it, i) =>
        i !== idx && it.status !== "Cancelled" && it.status !== "Returned"
    );

    const remainingSubtotal = remainingItems.reduce(
      (sum, it) => sum + Number(it.total || 0),
      0
    );

    let couponWillBeRevoked = false;
    let repaymentOnRemaining = 0;
    let refundAmount = cancelledItemUserPaid;

    if (
      order.couponApplied &&
      !order.couponRevoked &&
      order.couponCode &&
      orderMinPurchase > 0
    ) {
      if (remainingSubtotal < orderMinPurchase) {
        couponWillBeRevoked = true;

        repaymentOnRemaining =
          Math.round(
            remainingItems.reduce(
              (sum, it) =>
                sum +
                Number(it.originalCouponDiscount || it.couponDiscount || 0),
              0
            ) * 100
          ) / 100;

        refundAmount = Math.max(
          0,
          Math.round((cancelledItemUserPaid - repaymentOnRemaining) * 100) / 100
        );

        console.log(" Coupon Revocation on Cancellation:", {
          cancelledItem: item.productName,
          cancelledItemOriginal: cancelledItemOriginalTotal,
          cancelledItemUserPaid: cancelledItemUserPaid,
          remainingSubtotal: remainingSubtotal,
          minPurchase: orderMinPurchase,
          repaymentOnRemaining: repaymentOnRemaining,
          refundAmount: refundAmount,
        });

        order.couponApplied = false;
        order.couponRevoked = true;
        order.couponCode = null;
        order.discount = 0;

        remainingItems.forEach((remItem) => {
          const subItem = order.orderItems.find((oi) => oi._id === remItem._id);
          if (subItem) {
            subItem.couponDiscount = 0;
          }
        });

        const newTotalPrice = Math.round(remainingSubtotal * 100) / 100;
        order.totalPrice = newTotalPrice;
        order.finalAmount =
          Math.round((newTotalPrice + shippingCharge) * 100) / 100;

        console.log(
          ` Coupon Revoked - New Total: ₹${order.totalPrice} + Shipping: ₹${shippingCharge} = Final: ₹${order.finalAmount}`
        );
      } else {
        const newOrderDiscount =
          Math.round((originalOrderDiscount - cancelledItemDiscount) * 100) /
          100;
        order.discount = newOrderDiscount;
        order.totalPrice =
          Math.round((order.totalPrice - cancelledItemOriginalTotal) * 100) /
          100;
        order.finalAmount =
          Math.round(
            (order.totalPrice - order.discount + shippingCharge) * 100
          ) / 100;
      }
    } else {
      order.totalPrice =
        Math.round((order.totalPrice - cancelledItemOriginalTotal) * 100) / 100;
      order.finalAmount =
        Math.round((order.totalPrice + shippingCharge) * 100) / 100;
    }

    item.status = "Cancelled";
    item.cancelReason = reason || "";
    item.cancelDetails = details || "";
    item.cancelledAt = new Date();
    item.refundAmount = refundAmount;
    item.clawbackAmount = repaymentOnRemaining;

    try {
      const productId = item.product?._id || item.product;
      if (mongoose.Types.ObjectId.isValid(productId)) {
        const product = await Product.findById(productId);
        if (product && Array.isArray(product.variants)) {
          const variantIdx = product.variants.findIndex(
            (v) => String(v.size) === String(variantSize)
          );
          if (variantIdx !== -1) {
            product.variants[variantIdx].stock =
              (product.variants[variantIdx].stock || 0) + (item.quantity || 1);
            await product.save();
          }
        }
      }
    } catch (err) {
      console.warn("Stock restore failed:", err.message);
    }

    if (
      refundAmount > 0 &&
      ["Online Payment", "Wallet", "Razorpay", "UPI"].includes(
        order.paymentMethod
      )
    ) {
      let wallet = await Wallet.findOne({ user: userId });
      if (!wallet)
        wallet = new Wallet({ user: userId, balance: 0, transactions: [] });

      wallet.balance =
        Math.round((Number(wallet.balance || 0) + refundAmount) * 100) / 100;

      wallet.transactions.push({
        type: "credit",
        amount: refundAmount,
        description: couponWillBeRevoked
          ? "Order Cancellation (Coupon Revoked)"
          : "Order Cancellation",
        reason: `${item.productName} (${variantSize}ml) - ${
          reason || "No reason provided"
        }`,
        orderId: orderId,
        date: new Date(),
      });

      await wallet.save();
    }

    await order.save();

    return res.json({
      success: true,
      couponRevoked: couponWillBeRevoked,
      refundAmount: Math.round(refundAmount * 100) / 100,
      balanceDue: Math.round(repaymentOnRemaining * 100) / 100,
      revokedDiscountOnOtherItems: Math.round(repaymentOnRemaining * 100) / 100,
      message: couponWillBeRevoked
        ? `Item cancelled. Coupon revoked. Refund: ₹${refundAmount.toFixed(
            2
          )} (after ₹${repaymentOnRemaining.toFixed(
            2
          )} balance due on remaining items)`
        : `Item cancelled. Refund: ₹${refundAmount.toFixed(2)}`,
    });
  } catch (error) {
    console.error(" cancelSingleOrderWithCouponCheck error:", error);
    return res
      .status(500)
      .json({ success: false, error: error.message || "Server error" });
  }
};

const returnSingleOrder = async (req, res) => {
  try {
    const userId = req.userId; 
    const user = req.user || req.session.user;
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
      return res.status(400).json({
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
      message: `Return request for ${item.productName} (${variantSize}) submitted successfully`,
    });
  } catch (error) {
    console.error("Error submitting return request:", error.message);
    res
      .status(500)
      .json({ success: false, error: "Failed to submit return request" });
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
  cancelSingleOrderWithCouponCheck,
};
