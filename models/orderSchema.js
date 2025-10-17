

// const mongoose = require('mongoose');
// const { Schema } = mongoose;
// const { v4: uuidv4 } = require('uuid');

// const orderSchema = new Schema({
//   orderId: {
//     type: String,
//     default: () => uuidv4(),
//     unique: true, // Unique index is sufficient
//   },
//   user: {
//     type: Schema.Types.ObjectId,
//     ref: 'User',
//     required: true,
//   },
//   orderItems: [
//     {
//       product: { 
//         type: Schema.Types.ObjectId, 
//         ref: 'Product', 
//         required: true 
//       },
//       productName: { 
//         type: String, 
//         required: true 
//       },
//       variantSize: { 
//         type: String 
//       },
//       quantity: { 
//         type: Number, 
//         required: true, 
//         min: 1 
//       },
//       price: { 
//         type: Number, 
//         required: true 
//       },
//       total: { 
//         type: Number, 
//         required: true 
//       },
//       status: {
//         type: String,
//         enum: ['Active', 'Pending', 'Processing', 'Shipped', 'OutForDelivery', 'Delivered', 'Cancelled', 'Return Request', 'Returned'],
//         default: 'Active'
//       },
//       cancelReason: {
//         type: String,
//       },
//       cancelDetails: {
//         type: String,
//       },
//       cancelledAt: {
//         type: Date,
//       },
//       returnReason: {
//         type: String,
//       },
//       returnDetails: {
//         type: String,
//       },
//       returnRequestedAt: {
//         type: Date,
//       },
//       returnedAt: {
//         type: Date,
//       },
//       deliveredAt: {
//         type: Date,
//       },
//     },
//   ],
//   totalPrice: {
//     type: Number,
//     required: true,
//     min: 0,
//   },
//   discount: {
//     type: Number,
//     default: 0,
//     min: 0,
//   },
//   finalAmount: {
//     type: Number,
//     required: true,
//     min: 0,
//   },
//   deliveryAddress: {
//     name: { type: String, required: true },
//     phone: { type: String, required: true },
//     houseName: { type: String, required: true },
//     buildingNumber: { type: String },
//     landmark: { type: String },
//     city: { type: String, required: true },
//     state: { type: String, required: true },
//     pincode: { type: String, required: true },
//     addressType: { 
//       type: String, 
//       enum: ['Home', 'Work', 'Other'], 
//       required: true 
//     },
//   },
//   paymentMethod: {
//     type: String,
//     required: true,
//     enum: ['COD', 'Online Payment', 'Wallet'],
//   },
//   paymentStatus: {
//     type: String,
//     required: true,
//     enum: ['Pending', 'Completed', 'Failed', 'Refunded'],
//     default: 'Pending',
//   },
//   createdOn: {
//     type: Date,
//     default: Date.now,
//   },
//   deliveredAt: {
//     type: Date,
//   },
//   couponApplied: {
//     type: Boolean,
//     default: false,
//   },
//   couponCode: {
//     type: String,
//   },
//   status: {
//     type: String,
//     required: true,
//     enum: ['Pending', 'Processing', 'Shipped', 'OutForDelivery', 'Delivered', 'Cancelled', 'Return Request', 'Returned'],
//     default: 'Pending',
//   },
//   cancelReason: {
//     type: String,
//   },
//   cancelDetails: {
//     type: String,
//   },
//   cancelledAt: {
//     type: Date,
//   },
//   returnReason: {
//     type: String,
//   },
//   returnDetails: {
//     type: String,
//   },
//   returnRequestedAt: {
//     type: Date,
//   },
//   returnedAt: {
//     type: Date,
//   },
//   tracking: {
//     placedDate: { type: Date, default: Date.now },
//     confirmedDate: { type: Date },
//     processingDate: { type: Date },
//     shippedDate: { type: Date },
//     shippedLocation: { type: String },
//     outForDeliveryDate: { type: Date },
//     outForDeliveryLocation: { type: String },
//     deliveredDate: { type: Date },
//     estimatedDeliveryDate: { type: Date },
//   },
// });

// // Keep other indexes, remove redundant orderId index
// orderSchema.index({ user: 1, createdOn: -1 });
// orderSchema.index({ status: 1 });

// const Order = mongoose.model('Order', orderSchema);
// module.exports = Order;



const mongoose = require('mongoose');
const { Schema } = mongoose;
const { v4: uuidv4 } = require('uuid');

const orderSchema = new Schema({
  orderId: {
    type: String,
    default: () => uuidv4(),
    unique: true,
  },
  user: {
    type: Schema.Types.ObjectId,
    ref: 'User',
    required: true,
  },
  orderItems: [
    {
      product: { 
        type: Schema.Types.ObjectId, 
        ref: 'Product', 
        required: true 
      },
      productName: { 
        type: String, 
        required: true 
      },
      variantSize: { 
        type: String 
      },
      quantity: { 
        type: Number, 
        required: true, 
        min: 1 
      },
      price: { 
        type: Number, 
        required: true 
      },
      total: { 
        type: Number, 
        required: true 
      },
      status: {
        type: String,
        enum: ['Placed', 'Confirmed', 'Processing', 'Shipped', 'OutForDelivery', 'Delivered', 'Cancelled', 'Return Request', 'Returned'],
        default: 'Placed'
      },
      cancelReason: {
        type: String,
      },
      cancelDetails: {
        type: String,
      },
      cancelledAt: {
        type: Date,
      },
      returnReason: {
        type: String,
      },
      returnDetails: {
        type: String,
      },
      returnRequestedAt: {
        type: Date,
      },
      returnedAt: {
        type: Date,
      },
      // ✅ NEW: Return rejection fields
      returnRejected: {
        type: Boolean,
        default: false,
      },
      returnRejectedAt: {
        type: Date,
      },
      returnRejectionReason: {
        type: String,
      },
      tracking: {
        placedDate: { type: String },
        placedTime: { type: String },
        confirmedDate: { type: String },
        confirmedTime: { type: String },
        processingDate: { type: String },
        processingTime: { type: String },
        shippedDate: { type: String },
        shippedTime: { type: String },
        shippedLocation: { type: String },
        outForDeliveryDate: { type: String },
        outForDeliveryTime: { type: String },
        outForDeliveryLocation: { type: String },
        deliveredDate: { type: String },
        deliveredTime: { type: String },
        estimatedDeliveryDate: { type: String },
      },
      isReturnEligible: {
        type: Boolean,
        default: true,
      },
    },
  ],
  totalPrice: {
    type: Number,
    required: true,
    min: 0,
  },
  discount: {
    type: Number,
    default: 0,
    min: 0,
  },
  finalAmount: {
    type: Number,
    required: true,
    min: 0,
  },
  deliveryAddress: {
    name: { type: String, required: true },
    phone: { type: String, required: true },
    houseName: { type: String, required: true },
    buildingNumber: { type: String },
    landmark: { type: String },
    city: { type: String, required: true },
    state: { type: String, required: true },
    pincode: { type: String, required: true },
    addressType: { 
      type: String, 
      enum: ['Home', 'Work', 'Other'], 
      required: true 
    },
  },
  paymentMethod: {
    type: String,
    required: true,
    enum: ['COD', 'Online Payment', 'Wallet'],
  },
  paymentStatus: {
    type: String,
    required: true,
    enum: ['Pending', 'Completed', 'Failed', 'Refunded'],
    default: 'Pending',
  },
  createdOn: {
    type: Date,
    default: Date.now,
  },
  couponApplied: {
    type: Boolean,
    default: false,
  },
  couponCode: {
    type: String,
  },
  status: {
    type: String,
    required: true,
    enum: ['Pending', 'Processing', 'Shipped', 'OutForDelivery', 'Delivered', 'Cancelled', 'Return Request', 'Returned'],
    default: 'Pending',
  },
  cancelReason: {
    type: String,
  },
  cancelDetails: {
    type: String,
  },
  cancelledAt: {
    type: Date,
  },
  returnReason: {
    type: String,
  },
  returnDetails: {
    type: String,
  },
  returnRequestedAt: {
    type: Date,
  },
  returnedAt: {
    type: Date,
  },
});

// Indexes for efficient querying
orderSchema.index({ user: 1, createdOn: -1 });
orderSchema.index({ status: 1 });

const Order = mongoose.model('Order', orderSchema);
module.exports = Order;