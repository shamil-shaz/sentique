const mongoose = require("mongoose");
const Address = require("../../models/addressSchema");
const Product = require("../../models/productSchema");
const User = require("../../models/userSchema");
const Order = require("../../models/orderSchema");
const Wallet = require("../../models/walletSchema");
const Coupon = require("../../models/couponSchema");

const getAdminOrderList = async (req, res) => {
  try {
    const { orderId } = req.query;

    const query = { paymentStatus: { $ne: "Failed" } };

    if (orderId) {
      query.orderId = orderId;
    }
    const orders = await Order.find(query)
      .sort({ createdOn: -1 })
      .populate("user")
      .populate("orderItems.product")
      .lean();

    const pendingCancellations = orders.filter(
      (order) =>
        order.cancellationRequest &&
        order.cancellationRequest.status === "pending"
    ).length;

    let pendingReturns = 0;
    const returnRequests = [];

    orders.forEach((order) => {
      const returnRequestedItems = order.orderItems.filter(
        (item) => item.status === "Return Request"
      );
      if (returnRequestedItems.length > 0) {
        pendingReturns += returnRequestedItems.length;
        returnRequests.push({
          id: order.orderId || order._id.toString().slice(-5).toUpperCase(),
          customerName: order.deliveryAddress
            ? order.deliveryAddress.name
            : order.user
            ? order.user.name
            : "N/A",
          reason: order.returnReason || "N/A",
          requestDate:
            order.returnRequestedAt || order.updatedAt || order.createdOn,
          totalAmount: returnRequestedItems.reduce(
            (sum, item) =>
              sum + (item.total || item.price * item.quantity || 0),
            0
          ),
          products: returnRequestedItems.map((item) => ({
            productId: item.product ? item.product._id : null,
            product:
              item.productName ||
              (item.product ? item.product.productName : "Unknown Product"),
            variant: item.variantSize ? `${item.variantSize}ml` : "N/A",
            quantity: item.quantity || 1,
            price: item.price || 0,
            reason: item.returnReason || "N/A",
            image: (() => {
              if (!item.product)
                return "https://via.placeholder.com/80x80?text=No+Image";
              const images = item.product.productImage?.length
                ? item.product.productImage
                : item.product.images;
              if (!images || images.length === 0)
                return "https://via.placeholder.com/80x80?text=No+Image";
              const firstImage = images[0];
              return firstImage.startsWith("http") ||
                firstImage.startsWith("data:")
                ? firstImage
                : `/uploads/product-images/${firstImage}`;
            })(),
          })),
        });
      }
    });

    const ordersData = orders.map((order) => {
      const address = order.deliveryAddress
        ? `${order.deliveryAddress.houseName}, ${order.deliveryAddress.city}, ${order.deliveryAddress.state} - ${order.deliveryAddress.pincode}`
        : "N/A";

      const finalAmount = Number(order.finalAmount || 0);
      const shippingCharge = Number(order.shippingCharge || 0);
      const discount = Number(order.discount || 0);

      return {
        id: order.orderId || order._id.toString().slice(-5).toUpperCase(),
        name: order.deliveryAddress
          ? order.deliveryAddress.name
          : order.user
          ? order.user.name
          : "N/A",
        email: order.user ? order.user.email : "N/A",
        phone: order.deliveryAddress ? order.deliveryAddress.phone : "N/A",
        address,
        fullAddress: order.deliveryAddress || {},
        date: order.createdOn,
        status: order.status,
        paymentMethod: order.paymentMethod || "N/A",
        paymentStatus: order.paymentStatus || "N/A",

        totalAmount: finalAmount,
        originalTotal: order.totalPrice || 0,
        shippingCharge,
        discount,
        couponApplied: order.couponApplied || null,
        cancellationRequest: order.cancellationRequest || null,

        products: order.orderItems.map((item, index) => {
          let imagePath = "https://via.placeholder.com/80x80?text=No+Image";
          if (item.product) {
            const images = item.product.productImage || item.product.images;
            if (images && images.length > 0) {
              const firstImage = images[0];
              imagePath = firstImage.startsWith("http")
                ? firstImage
                : `/uploads/product-images/${firstImage}`;
            }
          }

          return {
            itemIndex: index,
            productId: item.product ? item.product._id : null,
            product:
              item.productName ||
              (item.product ? item.product.productName : "Unknown Product"),
            variant: item.variantSize ? `${item.variantSize}ml` : "N/A",
            quantity: item.quantity || 1,
            price: item.total || item.price * item.quantity || 0,
            status: item.status || order.status,
            image: imagePath,
          };
        }),
      };
    });

    res.render("orders", {
      orders: ordersData,
      pendingCancellations,
      pendingReturns,
      returnRequests,
    });
  } catch (error) {
    console.error("Error fetching admin orders:", error);
    res.redirect("/pageNotFound");
  }
};

const updateProductStatus = async (req, res) => {
  try {
    const {
      orderId: paramOrderId,
      itemIndex: paramItemIndex,
      variantSize: paramVariantSize,
    } = req.params;
    const {
      orderId: bodyOrderId,
      itemIndex: bodyItemIndex,
      variantSize: bodyVariantSize,
      status,
    } = req.body;

    const orderId = paramOrderId || bodyOrderId;
    const itemIndex =
      paramItemIndex !== undefined ? paramItemIndex : bodyItemIndex;
    const variantSize = paramVariantSize || bodyVariantSize;

    if (!orderId || itemIndex === undefined || !variantSize || !status) {
      return res.status(400).json({
        success: false,
        message: "Order ID, item index, variant size, and status are required",
      });
    }

    const validStatuses = [
      "Processing",
      "Shipped",
      "OutForDelivery",
      "Delivered",
    ];
    if (!validStatuses.includes(status)) {
      return res.status(400).json({
        success: false,
        message:
          "Invalid status. Valid statuses are: Processing, Shipped, OutForDelivery, Delivered",
      });
    }

    const order = await Order.findOne({ orderId });
    if (!order)
      return res
        .status(404)
        .json({ success: false, message: "Order not found" });

    const idx = parseInt(itemIndex);
    if (isNaN(idx) || idx < 0 || idx >= order.orderItems.length)
      return res
        .status(404)
        .json({ success: false, message: "Invalid item index" });

    const item = order.orderItems[idx];

    if (String(item.variantSize) !== String(variantSize))
      return res.status(400).json({
        success: false,
        message: `Variant mismatch. Expected ${item.variantSize}ml, got ${variantSize}ml.`,
      });

    if (item.status === "Cancelled")
      return res.status(400).json({
        success: false,
        message: "Cannot change status of a cancelled product",
      });

    if (item.status === "Return Request" || item.status === "Returned")
      return res.status(400).json({
        success: false,
        message: `Cannot change status of item in return process`,
      });

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

    const currentPriority = statusPriority[item.status] || 0;
    const newPriority = statusPriority[status] || 0;
    if (newPriority < currentPriority)
      return res.status(400).json({
        success: false,
        message: `Cannot change status from "${item.status}" to "${status}".`,
      });

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

    item.status = status;
    const now = new Date();

    switch (status) {
      case "Processing":
        if (!item.tracking.processingDate) {
          const formatted = formatDateTime(now);
          item.tracking.processingDate = formatted.date;
          item.tracking.processingTime = formatted.time;
        }
        if (!item.tracking.confirmedDate) {
          const confirmedDate = new Date(now.getTime() - 3600000);
          const formatted = formatDateTime(confirmedDate);
          item.tracking.confirmedDate = formatted.date;
          item.tracking.confirmedTime = formatted.time;
        }
        break;
      case "Shipped":
        if (!item.tracking.shippedDate) {
          const formatted = formatDateTime(now);
          item.tracking.shippedDate = formatted.date;
          item.tracking.shippedTime = formatted.time;
          item.tracking.shippedLocation =
            item.tracking.shippedLocation || "Warehouse XYZ";
        }
        if (!item.tracking.processingDate) {
          const processingDate = new Date(now.getTime() - 7200000);
          const formatted = formatDateTime(processingDate);
          item.tracking.processingDate = formatted.date;
          item.tracking.processingTime = formatted.time;
        }
        break;
      case "OutForDelivery":
        if (!item.tracking.outForDeliveryDate) {
          const formatted = formatDateTime(now);
          item.tracking.outForDeliveryDate = formatted.date;
          item.tracking.outForDeliveryTime = formatted.time;
          item.tracking.outForDeliveryLocation =
            item.tracking.outForDeliveryLocation ||
            order.deliveryAddress?.city ||
            "Local Hub ABC";
        }
        if (!item.tracking.shippedDate) {
          const shippedDate = new Date(now.getTime() - 10800000);
          const formatted = formatDateTime(shippedDate);
          item.tracking.shippedDate = formatted.date;
          item.tracking.shippedTime = formatted.time;
        }
        break;
      case "Delivered":
        if (!item.tracking.deliveredDate) {
          const formatted = formatDateTime(now);
          item.tracking.deliveredDate = formatted.date;
          item.tracking.deliveredTime = formatted.time;
        }
        item.tracking.estimatedDeliveryDate = null;
        break;
    }

    if (!item.tracking.estimatedDeliveryDate && status !== "Delivered") {
      const deliveryDate = new Date(now.getTime() + 604800000);
      item.tracking.estimatedDeliveryDate = formatDateTime(deliveryDate).date;
    }

    const allItemStatuses = order.orderItems.map((i) => i.status);
    order.status = allItemStatuses.every((s) => s === "Delivered")
      ? "Delivered"
      : allItemStatuses.every((s) => s === "Cancelled")
      ? "Cancelled"
      : allItemStatuses.includes("Return Request")
      ? "Return Request"
      : allItemStatuses.includes("Returned")
      ? "Returned"
      : allItemStatuses.includes("OutForDelivery")
      ? "OutForDelivery"
      : allItemStatuses.includes("Shipped")
      ? "Shipped"
      : allItemStatuses.includes("Processing")
      ? "Processing"
      : "Pending";

    order.markModified("orderItems");
    await order.save();

    res.json({
      success: true,
      message: `Item status updated to "${status}" successfully`,
      updatedItem: {
        itemIndex: idx,
        productName: item.productName,
        variantSize: item.variantSize,
        newStatus: item.status,
      },
    });
  } catch (error) {
    console.error("Error updating product status:", error);
    res
      .status(500)
      .json({ success: false, message: "Server error while updating status" });
  }
};

const updateItemStatusRoute = async (req, res) => {
  try {
    return updateProductStatus(req, res);
  } catch (error) {
    console.error("Error in route handler:", error);
    res.status(500).json({ success: false, message: "Server error" });
  }
};

const approveReturn = async (req, res) => {
  try {
    const { orderId: paramOrderId, itemIndex: paramItemIndex } = req.params;
    const orderId = paramOrderId;
    const itemIndex = paramItemIndex;

    if (!orderId) {
      return res
        .status(400)
        .json({ success: false, error: "Order ID is required" });
    }

    const order = await Order.findOne({ orderId }).populate(
      "orderItems.product"
    );
    if (!order) {
      return res.status(404).json({ success: false, error: "Order not found" });
    }

    if (itemIndex === "all") {
      const returnRequestItems = order.orderItems.filter(
        (i) => i.status === "Return Request"
      );

      if (returnRequestItems.length === 0) {
        return res
          .status(400)
          .json({ success: false, error: "No items in return request status" });
      }

      let totalRefund = 0;

      returnRequestItems.forEach((item) => {
        const itemOriginalTotal = Number(item.total || 0);
        let itemDiscount = 0;

        if (order.couponRevoked) {
          itemDiscount = 0;
        } else {
          itemDiscount = Number(
            item.originalCouponDiscount || item.couponDiscount || 0
          );
        }

        const itemRefundAmount =
          Math.round((itemOriginalTotal - itemDiscount) * 100) / 100;
        totalRefund += itemRefundAmount;

        item.status = "Returned";
        item.returnedAt = new Date();
      });

      for (const item of returnRequestItems) {
        try {
          const product = await Product.findById(item.product._id);
          if (product && Array.isArray(product.variants)) {
            const variantIdx = product.variants.findIndex(
              (v) => Number(v.size) === Number(item.variantSize)
            );
            if (variantIdx !== -1) {
              product.variants[variantIdx].stock =
                (product.variants[variantIdx].stock || 0) +
                (item.quantity || 1);
              await product.save();
            }
          }
        } catch (err) {
          console.warn("Stock restore failed:", err.message);
        }
      }

      if (totalRefund > 0) {
        let wallet = await Wallet.findOne({ user: order.user });
        if (!wallet)
          wallet = new Wallet({
            user: order.user,
            balance: 0,
            transactions: [],
          });

        wallet.balance =
          Math.round((Number(wallet.balance || 0) + totalRefund) * 100) / 100;

        wallet.transactions.push({
          type: "credit",
          amount: totalRefund,
          description: "Return",
          reason: order.couponRevoked
            ? `Return approved for entire order - Coupon was revoked`
            : `Return approved for entire order`,
          orderId: order.orderId,
          date: new Date(),
        });

        await wallet.save();
        console.log(` Wallet credited: ₹${totalRefund} to user ${order.user}`);
      }

      const statuses = order.orderItems.map((i) => i.status);
      if (statuses.every((s) => s === "Returned" || s === "Cancelled")) {
        order.status = "Returned";
      } else if (statuses.some((s) => s === "Return Request")) {
        order.status = "Return Request";
      } else {
        order.status = "Processing";
      }

      order.markModified("orderItems");
      await order.save();

      return res.json({
        success: true,
        message: `All returns approved. Total refund: ₹${totalRefund.toFixed(
          2
        )}`,
        refundAmount: totalRefund,
        couponWasRevoked: order.couponRevoked,
      });
    }

    const idx = parseInt(itemIndex);

    if (isNaN(idx) || idx < 0 || idx >= order.orderItems.length) {
      return res.status(400).json({
        success: false,
        error: `Invalid item index: ${itemIndex}. Order has ${order.orderItems.length} items.`,
      });
    }

    const item = order.orderItems[idx];

    if (!item) {
      return res.status(400).json({
        success: false,
        error: `Item at index ${idx} not found`,
      });
    }

    if (item.status !== "Return Request") {
      return res.status(400).json({
        success: false,
        error: `Item is in "${item.status}" status, not "Return Request"`,
      });
    }

    const itemOriginalTotal = Number(item.total || 0);

    let itemDiscount = 0;

    if (order.couponRevoked) {
      itemDiscount = 0;
      console.log(
        `Coupon Revoked: Refunding full amount ₹${itemOriginalTotal} for ${item.productName}`
      );
    } else {
      itemDiscount = Number(
        item.originalCouponDiscount || item.couponDiscount || 0
      );
      console.log(
        ` Coupon Active: Refunding discounted amount ₹${
          itemOriginalTotal - itemDiscount
        } for ${item.productName}`
      );
    }

    const itemRefundAmount =
      Math.round((itemOriginalTotal - itemDiscount) * 100) / 100;

    console.log(`Return Approval Details:`, {
      productName: item.productName,
      itemOriginalTotal,
      itemDiscount,
      itemRefundAmount,
      couponRevoked: order.couponRevoked,
      couponApplied: order.couponApplied,
    });

    item.status = "Returned";
    item.returnedAt = new Date();

    try {
      const product = await Product.findById(item.product._id);
      if (product && Array.isArray(product.variants)) {
        const variantIdx = product.variants.findIndex(
          (v) => Number(v.size) === Number(item.variantSize)
        );
        if (variantIdx !== -1) {
          product.variants[variantIdx].stock =
            (product.variants[variantIdx].stock || 0) + (item.quantity || 1);
          await product.save();
        }
      }
    } catch (err) {
      console.warn("Stock restore failed:", err.message);
    }

    if (itemRefundAmount > 0) {
      let wallet = await Wallet.findOne({ user: order.user });
      if (!wallet)
        wallet = new Wallet({ user: order.user, balance: 0, transactions: [] });

      wallet.balance =
        Math.round((Number(wallet.balance || 0) + itemRefundAmount) * 100) /
        100;

      wallet.transactions.push({
        type: "credit",
        amount: itemRefundAmount,
        description: "Return",
        reason: order.couponRevoked
          ? `Return approved for ${item.productName} (${item.variantSize}ml) - Coupon was revoked`
          : `Return approved for ${item.productName} (${item.variantSize}ml)`,
        orderId: order.orderId,
        date: new Date(),
      });

      await wallet.save();
      console.log(
        ` Wallet credited: ₹${itemRefundAmount} to user ${order.user}`
      );
    }

    const statuses = order.orderItems.map((i) => i.status);
    if (statuses.every((s) => s === "Returned" || s === "Cancelled")) {
      order.status = "Returned";
    } else if (statuses.some((s) => s === "Return Request")) {
      order.status = "Return Request";
    } else {
      order.status = "Processing";
    }

    order.markModified("orderItems");
    await order.save();

    return res.json({
      success: true,
      message: `Return approved. Refund: ₹${itemRefundAmount.toFixed(2)}`,
      refundAmount: itemRefundAmount,
      couponWasRevoked: order.couponRevoked,
    });
  } catch (error) {
    console.error("❌ approveReturn error:", error);
    return res.status(500).json({
      success: false,
      error: error.message || "Failed to approve return",
    });
  }
};

const rejectReturn = async (req, res) => {
  try {
    const {
      orderId: paramOrderId,
      itemIndex: paramItemIndex,
      variantSize: paramVariantSize,
    } = req.params;
    const {
      orderId: bodyOrderId,
      itemIndex: bodyItemIndex,
      variantSize: bodyVariantSize,
      reason,
    } = req.body;

    const orderId = paramOrderId || bodyOrderId;
    const itemIndex =
      paramItemIndex !== undefined ? paramItemIndex : bodyItemIndex;
    const variantSize = paramVariantSize || bodyVariantSize;

    const order = await Order.findOne({ orderId }).populate(
      "orderItems.product"
    );
    if (!order)
      return res.status(404).json({ success: false, error: "Order not found" });

    let rejectedProductName = "";

    if (
      itemIndex !== undefined &&
      variantSize !== undefined &&
      itemIndex !== "all" &&
      variantSize !== "all"
    ) {
      const idx = parseInt(itemIndex);
      if (isNaN(idx) || idx < 0 || idx >= order.orderItems.length)
        return res
          .status(404)
          .json({ success: false, error: "Invalid item index" });

      const item = order.orderItems[idx];
      if (Number(item.variantSize) !== Number(variantSize))
        return res.status(400).json({
          success: false,
          error: `Variant mismatch. Expected ${item.variantSize}ml.`,
        });

      if (item.status !== "Return Request")
        return res.status(400).json({
          success: false,
          error: `Cannot reject return. Current status: ${item.status}`,
        });

      item.status = "Delivered";
      item.returnRejected = true;
      item.returnRejectedAt = new Date();
      item.returnRejectionReason = reason || "Return request rejected by admin";
      item.returnRequestedAt = null;
      item.returnReason = null;
      item.returnDetails = null;
      rejectedProductName = `${item.productName} (${variantSize}ml)`;
    } else if (itemIndex === "all" || itemIndex === undefined) {
      const returnRequestedItems = order.orderItems.filter(
        (i) => i.status === "Return Request"
      );
      if (returnRequestedItems.length === 0)
        return res.status(400).json({
          success: false,
          error: "No items with Return Request status found",
        });

      returnRequestedItems.forEach((item) => {
        item.status = "Delivered";
        item.returnRejected = true;
        item.returnRejectedAt = new Date();
        item.returnRejectionReason =
          reason || "Return request rejected by admin";
        item.returnRequestedAt = null;
        item.returnReason = null;
        item.returnDetails = null;
      });

      rejectedProductName = "Full order";
    }

    const statuses = order.orderItems.map((i) => i.status);
    if (statuses.every((s) => s === "Delivered")) order.status = "Delivered";
    else if (statuses.some((s) => s === "Return Request"))
      order.status = "Return Request";
    else if (statuses.every((s) => s === "Cancelled"))
      order.status = "Cancelled";
    else if (statuses.includes("OutForDelivery"))
      order.status = "OutForDelivery";
    else if (statuses.includes("Shipped")) order.status = "Shipped";
    else if (statuses.includes("Processing")) order.status = "Processing";
    else order.status = "Pending";

    order.markModified("orderItems");
    await order.save();

    res.json({
      success: true,
      message:
        itemIndex && itemIndex !== "all"
          ? `Return rejected for ${rejectedProductName}`
          : "Full order return rejected successfully",
      reason: reason || "Return request rejected by admin",
    });
  } catch (error) {
    console.error("Error rejecting return request:", error);
    res.status(500).json({
      success: false,
      error: error.message || "Failed to reject return request",
    });
  }
};

module.exports = {
  getAdminOrderList,
  updateProductStatus,
  approveReturn,
  rejectReturn,
  updateItemStatusRoute,
};
