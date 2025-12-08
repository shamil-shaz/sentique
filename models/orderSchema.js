const mongoose = require("mongoose");
const { Schema } = mongoose;
const { v4: uuidv4 } = require("uuid");

const orderSchema = new Schema({
  orderId: {
    type: String,
    default: () => uuidv4(),
    unique: true,
  },
  user: {
    type: Schema.Types.ObjectId,
    ref: "User",
    required: true,
  },
  orderItems: [
    {
      product: { type: Schema.Types.ObjectId, ref: "Product", required: true },
      productName: { type: String, required: true },
      variantSize: { type: String, default: null },
      quantity: { type: Number, required: true, min: 1 },
      price: { type: Number, required: true },
      total: { type: Number, required: true },

      originalCouponDiscount: {
        type: Number,
        default: 0,
        description:
          "Original fixed discount applied at order creation - NEVER redistributed",
      },

      couponDiscount: {
        type: Number,
        default: 0,
        description: "Current discount amount (0 if coupon is revoked)",
      },

      originalPrice: Number,
      originalSubtotal: Number,
      discountApplied: { type: Number, default: 0 },
      discountPercentage: { type: Number, default: 0 },
      finalPrice: Number,
      finalSubtotal: Number,

      status: {
        type: String,
        enum: [
          "Placed",
          "Confirmed",
          "Processing",
          "Shipped",
          "OutForDelivery",
          "Delivered",
          "Cancelled",
          "Return Request",
          "Returned",
          "Payment Failed",
        ],
        default: "Placed",
      },

      cancelReason: String,
      cancelDetails: String,
      cancelledAt: Date,
      refundAmount: Number,
      clawbackAmount: Number,
      returnReason: String,
      returnDetails: String,
      returnRequestedAt: Date,
      returnedAt: Date,
      returnRejected: { type: Boolean, default: false },
      returnRejectedAt: Date,
      returnRejectionReason: String,

      tracking: {
        placedDate: String,
        placedTime: String,
        confirmedDate: String,
        confirmedTime: String,
        processingDate: String,
        processingTime: String,
        shippedDate: String,
        shippedTime: String,
        shippedLocation: String,
        outForDeliveryDate: String,
        outForDeliveryTime: String,
        outForDeliveryLocation: String,
        deliveredDate: String,
        deliveredTime: String,
        estimatedDeliveryDate: String,
      },

      isReturnEligible: { type: Boolean, default: true },
    },
  ],

  totalPrice: { type: Number, required: true, min: 0 },
  discount: { type: Number, default: 0, min: 0 },
  finalAmount: { type: Number, required: true, min: 0 },

  coupon: {
    type: Schema.Types.ObjectId,
    ref: "Coupon",
    default: null,
    description: "Stores reference to applied coupon document",
  },
  couponApplied: {
    type: Boolean,
    default: false,
    description: "Whether coupon is applied",
  },
  couponCode: {
    type: String,
    default: null,
    trim: true,
  },
  discountType: {
    type: String,
    enum: ["flat", "percentage", null],
    default: null,
  },
  shippingCharge: { 
  type: Number, 
  default: 0,
  description: 'Shipping charge applied to order' 
},
  discountDistributionMethod: {
    type: String,
    default: "fixed",
    description:
      "How discount is distributed: fixed (per-item) or proportional",
  },
  couponRevoked: {
    type: Boolean,
    default: false,
    description:
      "If coupon was revoked after cancellation due to minimum purchase not met",
  },
  couponMinimumNotMet: {
    type: Boolean,
    default: false,
    description:
      "If minimum purchase condition was violated after cancellation",
  },

  deliveryAddress: {
    name: { type: String, required: true },
    phone: { type: String, required: true },
    houseName: { type: String, required: true },
    buildingNumber: { type: String, default: null },
    landmark: { type: String, default: null },
    city: { type: String, required: true },
    state: { type: String, required: true },
    pincode: { type: String, required: true },
    addressType: {
      type: String,
      enum: ["Home", "Work", "Other"],
      required: true,
    },
  },

  paymentMethod: {
    type: String,
    required: true,
    enum: ["COD", "Online Payment", "Wallet", "Razorpay", "UPI"],
  },

  paymentStatus: {
    type: String,
    enum: ["Pending", "Completed", "Failed", "Refunded"],
    default: "Pending",
  },

  status: {
    type: String,
    required: true,
    enum: [
      "Pending",
      "Processing",
      "Shipped",
      "OutForDelivery",
      "Delivered",
      "Cancelled",
      "Partially Cancelled",
      "Return Request",
      "Returned",
      "Payment Failed",
    ],
    default: "Pending",
  },

  razorpayOrderId: String,
  razorpayPaymentId: String,
  failureReason: String,
  failureCode: String,

  statusHistory: [
    {
      status: String,
      timestamp: Date,
      reason: String,
    },
  ],

  paymentFailureReason: String,
  paymentFailedAt: Date,
  paymentRetryCount: { type: Number, default: 0 },
  lastPaymentAttemptAt: Date,
  cancelReason: String,
  cancelDetails: String,
  cancelledAt: Date,
  returnReason: String,
  returnDetails: String,
  returnRequestedAt: Date,
  returnedAt: Date,
  createdOn: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now },
});

orderSchema.index({ user: 1, createdOn: -1 });
orderSchema.index({ status: 1 });
orderSchema.index({ orderId: 1 });
orderSchema.index({ "orderItems.status": 1 });
orderSchema.index({ couponCode: 1 });
orderSchema.index({ couponApplied: 1 });
orderSchema.index({ couponRevoked: 1 });

const Order = mongoose.model("Order", orderSchema);
module.exports = Order;
