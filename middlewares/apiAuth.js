const mongoose = require('mongoose');
const User = require('../models/userSchema');

const apiAuth = async (req, res, next) => {
  try {
    console.log(' apiAuth - Checking authentication');
    console.log('   Session exists:', !!req.session);
    console.log('   User in session:', !!req.session?.user);
    
    if (!req.session || !req.session.user) {
      console.warn(' apiAuth failed: No session or user data');
      return res.status(401).json({
        success: false,
        message: 'Please log in first',
        isAuthenticated: false
      });
    }

    
    let userId = req.session.user._id || req.session.user.id;
    
    if (!userId) {
      console.warn(' apiAuth failed: No user ID found in session');
      return res.status(401).json({
        success: false,
        message: 'Invalid session format',
        isAuthenticated: false
      });
    }

    userId = userId.toString ? userId.toString() : String(userId);
    
    console.log('   User ID:', userId);
    
    if (!mongoose.Types.ObjectId.isValid(userId)) {
      console.warn(' apiAuth failed: Invalid user ID:', userId);
      return res.status(401).json({
        success: false,
        message: 'Invalid session. Please log in again.',
        isAuthenticated: false
      });
    }
    
    const user = await User.findById(userId);
    if (!user) {
      console.warn(' apiAuth failed: User not found:', userId);
      delete req.session.user;
      return res.status(401).json({
        success: false,
        message: 'User not found. Please log in again.',
        isAuthenticated: false
      });
    }

    if (user.isBlocked) {
      console.warn(' apiAuth failed: User is blocked:', userId);
      delete req.session.user;
      return res.status(403).json({
        success: false,
        message: 'Your account has been blocked. Contact support.',
        isAuthenticated: false
      });
    }

    console.log(' apiAuth successful for user:', userId);
    res.locals.user = user;
    next();
  } catch (err) {
    console.error(' apiAuth middleware error:', err.message);
    return res.status(500).json({
      success: false,
      message: 'Authentication error: ' + err.message,
      isAuthenticated: false
    });
  }
};

module.exports = apiAuth;