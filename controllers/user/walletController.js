const mongoose = require('mongoose'); // ✅ add this
const Wallet = require('../../models/walletSchema');
const User = require('../../models/userSchema');

const getWalletPage = async (req, res) => {
  try {
    const user = req.session.user;
    const userId = user?._id || user?.id;

    if (!user || !mongoose.Types.ObjectId.isValid(userId)) {
      return res.redirect('/login');
    }

    let wallet = await Wallet.findOne({ user: userId }).lean();
    if (!wallet) {
      wallet = await new Wallet({ user: userId }).save();
    }

    const userData = await User.findById(userId).lean();

    const walletData = {
      balance: wallet.balance || 0,
      transactions: wallet.transactions || [],
      totalCredits: wallet.transactions?.filter(t => t.type === 'credit').reduce((a, t) => a + t.amount, 0) || 0,
      totalDebits: wallet.transactions?.filter(t => t.type === 'debit').reduce((a, t) => a + t.amount, 0) || 0,
      monthlyTotal: wallet.transactions?.filter(t => new Date(t.date).getMonth() === new Date().getMonth())
        .reduce((a, t) => a + (t.type === 'credit' ? t.amount : -t.amount), 0) || 0,
      transactionCount: wallet.transactions?.length || 0
    };

    res.render('wallet', {
      customerName: userData.name || 'Guest',
      walletData
    });
  } catch (error) {
    console.error('Error fetching wallet page:', error);
    res.redirect('/pageNotFound');
  }
};

// Add funds (dummy function - implement with payment gateway)
const addFunds = async (req, res) => {
  try {
    const { amount } = req.body;
    const userId = req.session.user._id;

    const wallet = await Wallet.findOne({ user: userId });
    wallet.balance += parseFloat(amount);
    wallet.transactions.push({
      type: 'credit',
      amount: parseFloat(amount),
      description: 'Funds added'
    });
    await wallet.save();

    req.flash('success', 'Funds added successfully');
    res.json({ success: true, balance: wallet.balance });
  } catch (error) {
    console.error('Error adding funds:', error);
    res.status(500).json({ success: false, message: 'Error adding funds' });
  }
};

// Withdraw (dummy function - implement with withdrawal system)
const withdraw = async (req, res) => {
  try {
    const { amount } = req.body;
    const userId = req.session.user._id;

    const wallet = await Wallet.findOne({ user: userId });
    if (wallet.balance < amount) {
      return res.status(400).json({ success: false, message: 'Insufficient balance' });
    }

    wallet.balance -= parseFloat(amount);
    wallet.transactions.push({
      type: 'debit',
      amount: parseFloat(amount),
      description: 'Withdrawal'
    });
    await wallet.save();

    req.flash('success', 'Withdrawal successful');
    res.json({ success: true, balance: wallet.balance });
  } catch (error) {
    console.error('Error withdrawing:', error);
    res.status(500).json({ success: false, message: 'Error processing withdrawal' });
  }
};

module.exports = {
  getWalletPage,
  addFunds,
  withdraw
};