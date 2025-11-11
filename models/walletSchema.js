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
      'Order Cancellation (Coupon Revoked)',
      'Order Cancellation (Coupon Revoked - Min. Purchase)',
      'Cashback',
      'Payment Failed',
      'Adjustment',
      'Order Cancellation & Coupon Revoked',
      'Order Cancellation & Coupon Revoked (Min. Purchase)',
      'Refund after coupon revocation',
      'Order cancellation refund'
    ]
  },
  reason: {
    type: String,
    default: null,
    description: 'Detailed reason for transaction'
  },
  productName: {
    type: String,
    default: null,
    description: 'Name of product (if applicable)'
  },
  productId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Product',
    default: null,
    description: 'Reference to product'
  },
  orderId: {
    type: String,
    default: null,
    description: 'Order ID for transaction reference'
  },
  referredUserId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    default: null,
    description: 'User who was referred (for referral transactions)'
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
    min: 0,
    description: 'Current wallet balance'
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
walletSchema.index({ 'transactions.orderId': 1 });

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

walletSchema.virtual('transactionCount').get(function() {
  return this.transactions.length;
});

walletSchema.virtual('recentTransactions').get(function() {
  return this.transactions
    .sort((a, b) => b.date - a.date)
    .slice(0, 10);
});

walletSchema.methods.addCredit = function(amount, description, reason, productName = null, orderId = null) {
  if (amount <= 0) {
    throw new Error('Credit amount must be positive');
  }

  this.balance += amount;
  this.transactions.push({
    type: 'credit',
    amount: amount,
    description: description,
    reason: reason,
    productName: productName,
    orderId: orderId,
    date: new Date()
  });

  return this.save();
};

walletSchema.methods.addDebit = function(amount, description, reason, productName = null, orderId = null) {
  if (amount <= 0) {
    throw new Error('Debit amount must be positive');
  }

  if (this.balance < amount) {
    throw new Error('Insufficient wallet balance');
  }

  this.balance -= amount;
  this.transactions.push({
    type: 'debit',
    amount: amount,
    description: description,
    reason: reason,
    productName: productName,
    orderId: orderId,
    date: new Date()
  });

  return this.save();
};

walletSchema.methods.getTransactionsByDescription = function(description) {
  return this.transactions.filter(t => t.description === description);
};

walletSchema.methods.getTransactionsByType = function(type) {
  return this.transactions.filter(t => t.type === type);
};

walletSchema.methods.getTransactionsByOrderId = function(orderId) {
  return this.transactions.filter(t => t.orderId === orderId);
};

walletSchema.methods.getTransactionsByDateRange = function(startDate, endDate) {
  return this.transactions.filter(t => 
    t.date >= startDate && t.date <= endDate
  );
};

walletSchema.statics.findOrCreateByUser = async function(userId) {
  let wallet = await this.findOne({ user: userId });
  
  if (!wallet) {
    wallet = new this({
      user: userId,
      balance: 0,
      transactions: []
    });
    await wallet.save();
  }
  
  return wallet;
};

walletSchema.statics.getUserBalance = async function(userId) {
  const wallet = await this.findOne({ user: userId });
  return wallet ? wallet.balance : 0;
};

walletSchema.statics.getUserTransactionHistory = async function(userId, limit = 20) {
  const wallet = await this.findOne({ user: userId });
  if (!wallet) return [];
  
  return wallet.transactions
    .sort((a, b) => b.date - a.date)
    .slice(0, limit);
};

const Wallet = mongoose.model('Wallet', walletSchema);

module.exports = Wallet;