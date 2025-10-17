// const mongoose = require('mongoose');
// const Schema = mongoose.Schema;

// const walletSchema = new Schema({
//   user: {
//     type: mongoose.Schema.Types.ObjectId,
//     ref: 'User',
//     required: true,
//     unique: true
//   },
//   balance: {
//     type: Number,
//     default: 0,
//     min: 0
//   },
//   transactions: [{
//     type: {
//       type: String,
//       enum: ['credit', 'debit'],
//       required: true
//     },
//     amount: {
//       type: Number,
//       required: true
//     },
//     description: {
//       type: String,
//       required: true
//     },
//     orderId: {
//       type: String
//     },
//     date: {
//       type: Date,
//       default: Date.now
//     }
//   }]
// }, { timestamps: true });

// // Add index for faster queries
// walletSchema.index({ user: 1 });

// const Wallet = mongoose.model('Wallet', walletSchema);
// module.exports = Wallet;
const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const walletSchema = new Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    unique: true
  },
  balance: {
    type: Number,
    default: 0,
    min: 0
  },
  transactions: [{
    type: {
      type: String,
      enum: ['credit', 'debit'],
      required: true
    },
    amount: {
      type: Number,
      required: true,
      min: 0
    },
    description: {
      type: String,
      required: true,
      enum: ['Refund', 'Return', 'Referral', 'Add Money', 'Purchase', 'Order Cancellation', 'Adjustment', 'Cashback']
    },
    reason: {
      type: String,
      default: null
      // This field stores dynamic info like "Refund for returned product - Order #..."
    },
    productName: {
      type: String,
      required: false
    },
    productId: {
      type: String,
      required: false
    },
    orderId: {
      type: String,
      required: false
    },
    date: {
      type: Date,
      default: Date.now
    }
  }],
  createdAt: {
    type: Date,
    default: Date.now
  }
}, { timestamps: true });

walletSchema.index({ user: 1 });
walletSchema.index({ 'transactions.date': -1 });

const Wallet = mongoose.model('Wallet', walletSchema);
module.exports = Wallet;