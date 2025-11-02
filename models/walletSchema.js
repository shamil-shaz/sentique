
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
//       required: true,
//       min: 0
//     },
//     description: {
//       type: String,
//       required: true,
//       enum: ['Refund', 'Return', 'Referral', 'Add Money', 'Purchase', 'Order Cancellation', 'Adjustment', 'Cashback']
//     },
//     reason: {
//       type: String,
//       default: null
     
//     },
//     productName: {
//       type: String,
//       required: false
//     },
//     productId: {
//       type: String,
//       required: false
//     },
//     orderId: {
//       type: String,
//       required: false
//     },
//     date: {
//       type: Date,
//       default: Date.now
//     }
//   }],
//   createdAt: {
//     type: Date,
//     default: Date.now
//   }
// }, { timestamps: true });

// walletSchema.index({ user: 1 });
// walletSchema.index({ 'transactions.date': -1 });

// const Wallet = mongoose.model('Wallet', walletSchema);
// module.exports = Wallet;





const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const transactionSchema = new Schema({
  type: {
    type: String,
    enum: ['credit', 'debit', 'failed'],  // ✅ ADDED 'failed'
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
    enum: [
      'Refund', 
      'Return', 
      'Referral', 
      'Add Money', 
      'Purchase', 
      'Order Cancellation', 
      'Adjustment', 
      'Cashback',
      'Payment Failed'  // ✅ ADDED 'Payment Failed'
    ]
  },
  // Detailed reason/notes for the transaction
  reason: {
    type: String,
    default: null,
    // Used for referral (referrer's name), adjustments, error descriptions, etc.
  },
  // Product information
  productName: {
    type: String,
    default: null,
    // Name of product for purchase/refund/cashback/return
  },
  productId: {
    type: String,
    default: null,
    // Reference to product
  },
  // Order reference
  orderId: {
    type: String,
    default: null,
    // Razorpay payment ID for Add Money, Order ID for purchases, Payment ID for failures
  },
  // Referral reference
  referredUserId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    default: null,
    // If referral, who was referred
  },
  // Transaction timestamp
  date: {
    type: Date,
    default: Date.now
  }
}, { _id: true });

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
  transactions: [transactionSchema],
  createdAt: {
    type: Date,
    default: Date.now
  }
}, { timestamps: true });

// Indexes for better performance
walletSchema.index({ user: 1 });
walletSchema.index({ 'transactions.date': -1 });
walletSchema.index({ 'transactions.description': 1 });
walletSchema.index({ 'transactions.type': 1 });

// Virtual for total credits
walletSchema.virtual('totalCredits').get(function() {
  return this.transactions
    .filter(t => t.type === 'credit')
    .reduce((sum, t) => sum + t.amount, 0);
});

// Virtual for total debits
walletSchema.virtual('totalDebits').get(function() {
  return this.transactions
    .filter(t => t.type === 'debit')
    .reduce((sum, t) => sum + t.amount, 0);
});

const Wallet = mongoose.model('Wallet', walletSchema);

module.exports = Wallet;