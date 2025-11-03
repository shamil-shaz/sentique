
const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const transactionSchema = new Schema({
  type: {
    type: String,
    enum: ['credit', 'debit', 'failed'],  
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
      'Payment Failed'  
    ]
  },

  reason: {
    type: String,
    default: null,
 
  },

  productName: {
    type: String,
    default: null,
    
  },
  productId: {
    type: String,
    default: null,
  
  },

  orderId: {
    type: String,
    default: null,
  
  },

  referredUserId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    default: null,
   
  },

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


walletSchema.index({ user: 1 });
walletSchema.index({ 'transactions.date': -1 });
walletSchema.index({ 'transactions.description': 1 });
walletSchema.index({ 'transactions.type': 1 });


walletSchema.virtual('totalCredits').get(function() {
  return this.transactions
    .filter(t => t.type === 'credit')
    .reduce((sum, t) => sum + t.amount, 0);
});


walletSchema.virtual('totalDebits').get(function() {
  return this.transactions
    .filter(t => t.type === 'debit')
    .reduce((sum, t) => sum + t.amount, 0);
});

const Wallet = mongoose.model('Wallet', walletSchema);

module.exports = Wallet;