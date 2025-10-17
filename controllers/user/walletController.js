

// const mongoose = require('mongoose');
// const Wallet = require('../../models/walletSchema');
// const User = require('../../models/userSchema');

// const getWalletPage = async (req, res) => {
//   try {
//     const user = req.session.user;
//     const userId = user?._id || user?.id;

//     if (!user || !mongoose.Types.ObjectId.isValid(userId)) {
//       return res.redirect('/login');
//     }

//     let wallet = await Wallet.findOne({ user: userId }).lean();
//     if (!wallet) {
//       wallet = await new Wallet({ user: userId }).save();
//     }

//     const userData = await User.findById(userId).lean();

//     // Pagination logic - 5 transactions per page
//     const page = parseInt(req.query.page) || 1;
//     const limit = 5;
//     const startIndex = (page - 1) * limit;
//     const endIndex = page * limit;

//     const allTransactions = wallet.transactions || [];
//     const totalTransactions = allTransactions.length;
//     const totalPages = Math.ceil(totalTransactions / limit) || 1;

//     // Reverse transactions to show latest first, then paginate
//     const reversedTransactions = [...allTransactions].reverse();
    
//     const paginatedTransactions = reversedTransactions
//       .slice(startIndex, endIndex)
//       .map((t, index) => {
//         // Extract reason from description
//         const reason = extractReason(t.description);
        
//         return {
//           serialNo: startIndex + index + 1, // Sequential serial number
//           id: t._id.toString(),
//           type: t.type,
//           amount: parseFloat(t.amount).toFixed(2),
//           date: new Date(t.date).toLocaleDateString('en-IN', {
//             day: '2-digit',
//             month: '2-digit',
//             year: 'numeric',
//           }),
//           time: new Date(t.date).toLocaleTimeString('en-IN', {
//             hour: '2-digit',
//             minute: '2-digit',
//           }),
//           description: t.description,
//           reason: reason,
//           productName: t.productName || 'N/A',
//           productId: t.productId || 'N/A',
//           orderId: t.orderId || 'N/A',
//         };
//       });

//     // Calculate statistics
//     const walletData = {
//       balance: parseFloat(wallet.balance || 0).toFixed(2),
//       totalCredits: allTransactions
//         .filter((t) => t.type === 'credit')
//         .reduce((a, t) => a + t.amount, 0)
//         .toFixed(2) || '0.00',
//       totalDebits: allTransactions
//         .filter((t) => t.type === 'debit')
//         .reduce((a, t) => a + t.amount, 0)
//         .toFixed(2) || '0.00',
//       monthlyTotal: allTransactions
//         .filter((t) => new Date(t.date).getMonth() === new Date().getMonth())
//         .reduce((a, t) => a + (t.type === 'credit' ? t.amount : -t.amount), 0)
//         .toFixed(2) || '0.00',
//       transactionCount: allTransactions.length,
//     };

//     res.render('wallet', {
//       customerName: userData.name || 'Guest',
//       walletData,
//       transactions: paginatedTransactions,
//       currentPage: page,
//       totalPages,
//       totalTransactions,
//     });
//   } catch (error) {
//     console.error('Error fetching wallet page:', error);
//     res.redirect('/pageNotFound');
//   }
// };

// const getWalletData = async (req, res) => {
//   try {
//     const userId = req.session.user?._id || req.session.user?.id;

//     if (!userId || !mongoose.Types.ObjectId.isValid(userId)) {
//       return res.status(401).json({ error: 'Unauthorized' });
//     }

//     let wallet = await Wallet.findOne({ user: userId }).lean();
//     if (!wallet) {
//       wallet = await new Wallet({ user: userId }).save();
//     }

//     const allTransactions = wallet.transactions || [];
//     const walletData = {
//       balance: parseFloat(wallet.balance || 0).toFixed(2),
//       totalCredits: allTransactions
//         .filter((t) => t.type === 'credit')
//         .reduce((a, t) => a + t.amount, 0)
//         .toFixed(2) || '0.00',
//       totalDebits: allTransactions
//         .filter((t) => t.type === 'debit')
//         .reduce((a, t) => a + t.amount, 0)
//         .toFixed(2) || '0.00',
//       monthlyTotal: allTransactions
//         .filter((t) => new Date(t.date).getMonth() === new Date().getMonth())
//         .reduce((a, t) => a + (t.type === 'credit' ? t.amount : -t.amount), 0)
//         .toFixed(2) || '0.00',
//       transactionCount: allTransactions.length,
//       totalPages: Math.ceil(allTransactions.length / 5) || 1,
//     };

//     res.json(walletData);
//   } catch (error) {
//     console.error('Error fetching wallet data:', error);
//     res.status(500).json({ error: 'Server error' });
//   }
// };

// const getPaginatedTransactions = async (req, res) => {
//   try {
//     const userId = req.session.user?._id || req.session.user?.id;
//     const page = parseInt(req.query.page) || 1;
//     const filter = req.query.filter || 'all';
//     const limit = 5;

//     if (!userId || !mongoose.Types.ObjectId.isValid(userId)) {
//       return res.status(401).json({ error: 'Unauthorized' });
//     }

//     const wallet = await Wallet.findOne({ user: userId }).lean();
//     if (!wallet) {
//       return res.json({ transactions: [], totalPages: 1, totalTransactions: 0 });
//     }

//     let transactions = wallet.transactions || [];
    
//     if (filter !== 'all') {
//       transactions = transactions.filter((t) => t.type === filter);
//     }

//     const totalTransactions = transactions.length;
//     const totalPages = Math.ceil(transactions.length / limit) || 1;

//     // Reverse to show latest first
//     const reversedTransactions = [...transactions].reverse();
//     const startIndex = (page - 1) * limit;
    
//     const paginatedTransactions = reversedTransactions
//       .slice(startIndex, startIndex + limit)
//       .map((t, index) => ({
//         serialNo: startIndex + index + 1, // Sequential serial number
//         id: t._id.toString(),
//         type: t.type,
//         amount: parseFloat(t.amount).toFixed(2),
//         date: new Date(t.date).toLocaleDateString('en-IN', {
//           day: '2-digit',
//           month: '2-digit',
//           year: 'numeric',
//         }),
//         time: new Date(t.date).toLocaleTimeString('en-IN', {
//           hour: '2-digit',
//           minute: '2-digit',
//         }),
//         description: t.description,
//         reason: t.description || 'N/A',
//         productName: t.productName || 'N/A',
//         productId: t.productId || 'N/A',
//         orderId: t.orderId || 'N/A',
//       }));

//     res.json({
//       transactions: paginatedTransactions,
//       totalPages,
//       totalTransactions,
//       currentFilter: filter,
//     });
//   } catch (error) {
//     console.error('Error fetching transactions:', error);
//     res.status(500).json({ error: 'Server error' });
//   }
// };

// module.exports = {
//   getWalletPage,
//   getWalletData,
//   getPaginatedTransactions,
// };



const mongoose = require('mongoose');
const Wallet = require('../../models/walletSchema');
const User = require('../../models/userSchema');



const getWalletPage = async (req, res) => {
  try {
    const user = req.session.user;
    const userId = user?._id || user?.id;

    if (!user || !mongoose.Types.ObjectId.isValid(userId)) {
      console.log('Invalid or missing user ID:', userId);
      return res.redirect('/login');
    }

    let wallet = await Wallet.findOne({ user: userId }).lean();
    if (!wallet) {
      console.log('Creating new wallet for user:', userId);
      wallet = await new Wallet({ user: userId }).save();
    }

    const userData = await User.findById(userId).lean();

    // Pagination logic - 5 transactions per page
    const page = parseInt(req.query.page) || 1;
    const limit = 5;
    const startIndex = (page - 1) * limit;
    const endIndex = page * limit;

    const allTransactions = wallet.transactions || [];
    const totalTransactions = allTransactions.length;
    const totalPages = Math.ceil(totalTransactions / limit) || 1;

    // Reverse transactions to show latest first, then paginate
    const reversedTransactions = [...allTransactions].reverse();
    
    const paginatedTransactions = reversedTransactions
      .slice(startIndex, endIndex)
      .map((t, index) => {
        console.log('Transaction:', t); // Debug log
        return {
          serialNo: startIndex + index + 1,
          id: t._id.toString(),
          type: t.type,
          amount: parseFloat(t.amount).toFixed(2),
          date: new Date(t.date).toLocaleDateString('en-IN', {
            day: '2-digit',
            month: '2-digit',
            year: 'numeric',
          }),
          time: new Date(t.date).toLocaleTimeString('en-IN', {
            hour: '2-digit',
            minute: '2-digit',
          }),
          description: t.description,
          reason: t.description || 'N/A', // Use description for Reason column
          orderId: t.orderId || 'N/A',
          productName: t.productName || 'N/A',
        };
      });

    // Calculate statistics
    const walletData = {
      balance: parseFloat(wallet.balance || 0).toFixed(2),
      totalCredits: allTransactions
        .filter((t) => t.type === 'credit')
        .reduce((a, t) => a + t.amount, 0)
        .toFixed(2) || '0.00',
      totalDebits: allTransactions
        .filter((t) => t.type === 'debit')
        .reduce((a, t) => a + t.amount, 0)
        .toFixed(2) || '0.00',
      monthlyTotal: allTransactions
        .filter((t) => new Date(t.date).getMonth() === new Date().getMonth())
        .reduce((a, t) => a + (t.type === 'credit' ? t.amount : -t.amount), 0)
        .toFixed(2) || '0.00',
      transactionCount: allTransactions.length,
    };

    console.log('Wallet data:', walletData);
    console.log('Paginated transactions:', paginatedTransactions);
    console.log('Page:', page, 'Total Pages:', totalPages);

    res.render('wallet', {
      customerName: userData.name || 'Guest',
      walletData,
      transactions: paginatedTransactions,
      currentPage: page,
      totalPages,
      totalTransactions,
    });
  } catch (error) {
    console.error('Error fetching wallet page:', error);
    res.redirect('/pageNotFound');
  }
};

const getWalletData = async (req, res) => {
  try {
    const userId = req.session.user?._id || req.session.user?.id;

    if (!userId || !mongoose.Types.ObjectId.isValid(userId)) {
      console.log('Invalid user ID for /data:', userId);
      return res.status(401).json({ error: 'Unauthorized' });
    }

    let wallet = await Wallet.findOne({ user: userId }).lean();
    if (!wallet) {
      console.log('Creating new wallet for user:', userId);
      wallet = await new Wallet({ user: userId }).save();
    }

    const allTransactions = wallet.transactions || [];
    const walletData = {
      balance: parseFloat(wallet.balance || 0).toFixed(2),
      totalCredits: allTransactions
        .filter((t) => t.type === 'credit')
        .reduce((a, t) => a + t.amount, 0)
        .toFixed(2) || '0.00',
      totalDebits: allTransactions
        .filter((t) => t.type === 'debit')
        .reduce((a, t) => a + t.amount, 0)
        .toFixed(2) || '0.00',
      monthlyTotal: allTransactions
        .filter((t) => new Date(t.date).getMonth() === new Date().getMonth())
        .reduce((a, t) => a + (t.type === 'credit' ? t.amount : -t.amount), 0)
        .toFixed(2) || '0.00',
      transactionCount: allTransactions.length,
      totalPages: Math.ceil(allTransactions.length / 5) || 1,
    };

    console.log('API /data response:', walletData);
    res.json(walletData);
  } catch (error) {
    console.error('Error fetching wallet data:', error);
    res.status(500).json({ error: 'Server error' });
  }
};

const getPaginatedTransactions = async (req, res) => {
  try {
    const userId = req.session.user?._id || req.session.user?.id;
    const page = parseInt(req.query.page) || 1;
    const filter = req.query.filter || 'all';
    const limit = 5;

    if (!userId || !mongoose.Types.ObjectId.isValid(userId)) {
      console.log('Invalid user ID for /transactions:', userId);
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const wallet = await Wallet.findOne({ user: userId }).lean();
    if (!wallet) {
      console.log('No wallet found for user:', userId);
      return res.json({ transactions: [], totalPages: 1, totalTransactions: 0 });
    }

    let transactions = wallet.transactions || [];
    
    if (filter !== 'all') {
      transactions = transactions.filter((t) => t.type === filter);
    }

    const totalTransactions = transactions.length;
    const totalPages = Math.ceil(transactions.length / limit) || 1;

    const reversedTransactions = [...transactions].reverse();
    const startIndex = (page - 1) * limit;
    
    const paginatedTransactions = reversedTransactions
      .slice(startIndex, startIndex + limit)
      .map((t, index) => {
        console.log('Paginated transaction:', t);
        return {
          serialNo: startIndex + index + 1,
          id: t._id.toString(),
          type: t.type,
          amount: parseFloat(t.amount).toFixed(2),
          date: new Date(t.date).toLocaleDateString('en-IN', {
            day: '2-digit',
            month: '2-digit',
            year: 'numeric',
          }),
          time: new Date(t.date).toLocaleTimeString('en-IN', {
            hour: '2-digit',
            minute: '2-digit',
          }),
          description: t.description,
          reason: t.description || 'N/A',
          orderId: t.orderId || 'N/A',
          productName: t.productName || 'N/A',
        };
      });

    console.log('API /transactions response:', { transactions: paginatedTransactions, totalPages, totalTransactions });
    res.json({
      transactions: paginatedTransactions,
      totalPages,
      totalTransactions,
      currentFilter: filter,
    });
  } catch (error) {
    console.error('Error fetching transactions:', error);
    res.status(500).json({ error: 'Server error' });
  }
};

const addTestTransaction = async (req, res) => {
  const session = await mongoose.startSession();
  session.startTransaction();
  try {
    const userId = req.session.user?._id || req.session.user?.id;
    const { type, amount, description, productName, orderId } = req.body;

    if (!userId || !mongoose.Types.ObjectId.isValid(userId)) {
      console.log('Invalid user ID for test transaction:', userId);
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const wallet = await Wallet.findOne({ user: userId }).session(session);
    if (!wallet) {
      console.log('No wallet found for user:', userId);
      return res.status(404).json({ error: 'Wallet not found' });
    }

    const validDescriptions = ['Refund', 'Return', 'Referral', 'Add Money', 'Purchase', 'Order Cancellation', 'Adjustment', 'Cashback'];
    if (!validDescriptions.includes(description)) {
      return res.status(400).json({ error: 'Invalid description' });
    }

    wallet.transactions.push({
      type,
      amount: parseFloat(amount),
      description,
      orderId: orderId || 'N/A',
      productName: productName || 'N/A',
      date: new Date(),
    });

    if (type === 'credit') {
      wallet.balance += parseFloat(amount);
    } else if (type === 'debit') {
      wallet.balance -= parseFloat(amount);
    }

    await wallet.save({ session });
    console.log('Test transaction added:', { type, amount, description, orderId, productName });
    await session.commitTransaction();
    session.endSession();
    res.json({ message: 'Transaction added successfully' });
  } catch (error) {
    await session.abortTransaction();
    session.endSession();
    console.error('Error adding transaction:', error);
    res.status(500).json({ error: 'Server error' });
  }
};

module.exports = {
  getWalletPage,
  getWalletData,
  getPaginatedTransactions,
  addTestTransaction,
};