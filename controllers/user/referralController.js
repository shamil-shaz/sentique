const User = require('../../models/userSchema'); 
const Order = require('../../models/orderSchema');
const Wallet = require('../../models/walletSchema');
const mongoose = require('mongoose');

// Helper to extract user ID safely
function getUserId(req) {
  let userId = null;
  
  if (req.session && req.session.user) {
    const sessionUser = req.session.user;
    if (typeof sessionUser === 'string') {
      userId = sessionUser;
    } else if (sessionUser && typeof sessionUser === 'object') {
      userId = sessionUser._id || sessionUser.id;
    }
  }
  
  if (!userId && req.user) {
    if (typeof req.user === 'string') {
      userId = req.user;
    } else if (req.user && typeof req.user === 'object') {
      userId = req.user._id || req.user.id;
    }
  }
  
  if (userId && typeof userId !== 'string') {
    userId = userId.toString();
  }
  
  if (userId && !mongoose.Types.ObjectId.isValid(userId)) {
    console.warn('Invalid userId format:', userId);
    userId = null;
  }
  
  return userId;
}

const getReferralStats = async (req, res) => {
  try {
    const userId = getUserId(req);
    
    if (!userId) {
      return res.status(401).json({ 
        success: false, 
        message: 'User not authenticated' 
      });
    }

    console.log('📊 Fetching referral stats for user:', userId);

    const user = await User.findById(userId)
      .select('refferalCode redeemed redeemedUsers')
      .lean();

    if (!user) {
      return res.status(404).json({ 
        success: false, 
        message: 'User not found' 
      });
    }

    let wallet = await Wallet.findOne({ user: userId }).lean();
    if (!wallet) {
      wallet = { balance: 0, transactions: [] };
    }

    const totalReferrals = user.redeemedUsers?.length || 0;
    console.log('Total referrals (raw count):', totalReferrals);

    let completedReferrals = 0;
    let totalEarnings = 0;

    if (totalReferrals > 0) {
      for (let referredUserId of user.redeemedUsers) {
        try {
          const order = await Order.findOne({
            user: referredUserId,
            paymentStatus: 'Completed',
            finalAmount: { $gte: 1000 }
          }).lean();
          
          if (order) {
            completedReferrals++;
            totalEarnings += 100;
            console.log(`✅ Completed referral found for user ${referredUserId}`);
          } else {
            console.log(`⏳ No qualifying order yet for user ${referredUserId}`);
          }
        } catch (err) {
          console.error(`Error checking order for ${referredUserId}:`, err.message);
        }
      }
    }

    console.log('Completed referrals:', completedReferrals);
    console.log('Total earnings:', totalEarnings);

    res.json({
      success: true,
      refferalCode: user.refferalCode || '',
      totalReferrals: totalReferrals,
      completedReferrals: completedReferrals,
      totalEarnings: totalEarnings,
      walletBalance: parseFloat(wallet.balance || 0).toFixed(2),
      redeemed: user.redeemed || false
    });
  } catch (err) {
    console.error('Error fetching referral stats:', err);
    res.status(500).json({ 
      success: false, 
      message: 'Server error', 
      error: err.message 
    });
  }
};

const getReferralDetails = async (req, res) => {
  try {
    const userId = getUserId(req);

    if (!userId) {
      return res.status(401).json({ 
        success: false, 
        message: 'User not authenticated' 
      });
    }

    console.log('📋 Fetching referral details for user:', userId);

    const user = await User.findById(userId)
      .select('refferalCode redeemed redeemedUsers')
      .populate('redeemedUsers', 'name email phone createdOn')
      .lean();

    if (!user) {
      return res.status(404).json({ 
        success: false, 
        message: 'User not found' 
      });
    }

    let wallet = await Wallet.findOne({ user: userId }).lean();
    if (!wallet) {
      wallet = { balance: 0, transactions: [] };
    }

    const totalReferrals = user.redeemedUsers?.length || 0;
    let completedReferrals = 0;
    let pendingReferrals = 0;
    let totalEarnings = 0;
    
    const referralDetails = [];
    
    if (totalReferrals > 0) {
      for (let referredUser of user.redeemedUsers) {
        try {
          const order = await Order.findOne({
            user: referredUser._id,
            paymentStatus: 'Completed',
            finalAmount: { $gte: 1000 }
          }).lean();
          
          if (order) {
            completedReferrals++;
            totalEarnings += 100;
            referralDetails.push({
              userId: referredUser._id,
              name: referredUser.name,
              email: referredUser.email,
              phone: referredUser.phone,
              status: 'completed',
              reward: 100,
              orderDate: order.createdOn,
              joinDate: referredUser.createdOn
            });
            console.log(`✅ ${referredUser.name} - Completed`);
          } else {
            pendingReferrals++;
            referralDetails.push({
              userId: referredUser._id,
              name: referredUser.name,
              email: referredUser.email,
              phone: referredUser.phone,
              status: 'pending',
              reward: 0,
              message: 'Waiting for first order ≥ ₹1000',
              joinDate: referredUser.createdOn
            });
            console.log(`⏳ ${referredUser.name} - Pending`);
          }
        } catch (err) {
          console.error(`Error checking referral ${referredUser.name}:`, err.message);
        }
      }
    }

    console.log('Summary - Total:', totalReferrals, 'Completed:', completedReferrals, 'Pending:', pendingReferrals);

    res.json({
      success: true,
      refferalCode: user.refferalCode || '',
      totalReferrals: totalReferrals,
      completedReferrals: completedReferrals,
      pendingReferrals: pendingReferrals,
      totalEarnings: totalEarnings,
      walletBalance: parseFloat(wallet.balance || 0).toFixed(2),
      referralDetails: referralDetails
    });
  } catch (err) {
    console.error('Error fetching referral details:', err);
    res.status(500).json({ 
      success: false, 
      message: 'Server error', 
      error: err.message 
    });
  }
};

const getReferredUsers = async (req, res) => {
  try {
    const userId = getUserId(req);

    if (!userId) {
      return res.status(401).json({ 
        success: false, 
        message: 'User not authenticated' 
      });
    }

    const user = await User.findById(userId)
      .populate('redeemedUsers', 'name email phone createdOn');

    if (!user) {
      return res.status(404).json({ 
        success: false, 
        message: 'User not found' 
      });
    }

    let wallet = await Wallet.findOne({ user: userId }).lean();
    if (!wallet) {
      wallet = { balance: 0 };
    }

    const totalReferrals = user.redeemedUsers?.length || 0;

    res.json({
      success: true,
      totalReferrals: totalReferrals,
      walletBalance: parseFloat(wallet.balance || 0).toFixed(2),
      referredUsers: user.redeemedUsers || []
    });
  } catch (err) {
    console.error('Error fetching referred users:', err);
    res.status(500).json({ 
      success: false, 
      message: 'Server error', 
      error: err.message 
    });
  }
};

const getReferralLeaderboard = async (req, res) => {
  try {
    const limit = req.query.limit || 10;

    const leaderboard = await User.aggregate([
      {
        $addFields: {
          referralCount: { $size: { $ifNull: ["$redeemedUsers", []] } }
        }
      },
      {
        $match: { referralCount: { $gt: 0 } }
      },
      {
        $sort: { referralCount: -1 }
      },
      {
        $limit: parseInt(limit)
      },
      {
        $project: {
          _id: 1,
          name: 1,
          refferalCode: 1,
          referralCount: 1
        }
      }
    ]);

    const formattedLeaderboard = leaderboard.map((user, index) => ({
      rank: index + 1,
      name: user.name,
      refferalCode: user.refferalCode,
      totalReferrals: user.referralCount || 0,
      totalEarnings: (user.referralCount || 0) * 100
    }));

    res.json({
      success: true,
      leaderboard: formattedLeaderboard
    });
  } catch (err) {
    console.error('Error fetching leaderboard:', err);
    res.status(500).json({ 
      success: false, 
      message: 'Server error', 
      error: err.message 
    });
  }
};

const applyReferralCode = async (req, res) => {
  try {
    const userId = getUserId(req);
    const { referralCode } = req.body;

    if (!userId || !referralCode) {
      return res.status(400).json({ 
        success: false, 
        message: 'User ID and referral code are required' 
      });
    }

    const referrerUser = await User.findOne({ refferalCode: referralCode });
    
    if (!referrerUser) {
      return res.status(404).json({ 
        success: false, 
        message: 'Referral code not found' 
      });
    }

    const user = await User.findById(userId);
    
    if (user.redeemed) {
      return res.status(400).json({ 
        success: false, 
        message: 'You have already used a referral code' 
      });
    }

    user.redeemed = true;
    referrerUser.redeemedUsers.push(userId);

    await user.save();
    await referrerUser.save();

    res.json({
      success: true,
      message: 'Referral code applied successfully'
    });
  } catch (err) {
    console.error('Error applying referral code:', err);
    res.status(500).json({ 
      success: false, 
      message: 'Server error', 
      error: err.message 
    });
  }
};

module.exports = {
  getReferralStats,
  getReferralDetails,
  getReferredUsers,
  getReferralLeaderboard,
  applyReferralCode
};