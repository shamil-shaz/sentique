const Coupon = require('../../models/couponSchema');
const User = require('../../models/userSchema');
const Order = require('../../models/orderSchema');

const getAvailableCouponsJSON = async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 6;
    const skip = (page - 1) * limit;

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const totalCoupons = await Coupon.countDocuments({
      isListed: true,
      expireDate: { $gte: today }
    });

    const totalPages = Math.ceil(totalCoupons / limit);

    const coupons = await Coupon.find({
      isListed: true,
      expireDate: { $gte: today }
    })
      .populate('appliedUsers.userId', 'email')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .lean();

    const formattedCoupons = coupons.map(coupon => ({
      id: coupon._id,
      code: coupon.couponCode,
      title: coupon.couponName,
      description: coupon.description,
      discountType: coupon.discountType || 'flat',
      discountValue: coupon.discountPrice,
      expiryDate: coupon.expireDate,
      minPurchase: coupon.minimumPrice || 0,
      maxDiscount: coupon.maxDiscountAmount || 0,
      terms: coupon.terms || ['Valid on all purchases', 'Cannot be combined', 'One use per customer'],
      usageType: coupon.usageType || 'once',
      limit: coupon.limit || 100,
      usageCount: coupon.appliedUsers ? coupon.appliedUsers.length : 0,
      activeDate: coupon.activeDate
    }));

    return res.json({
      success: true,
      coupons: formattedCoupons,
      currentPage: page,
      totalPages: totalPages,
      hasNextPage: page < totalPages,
      hasPrevPage: page > 1
    });

  } catch (err) {
    console.error('❌ Error fetching available coupons:', err);
    res.status(500).json({
      success: false,
      message: 'Error loading coupons'
    });
  }
};

const getAvailableCouponsHTML = async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 6;
    const skip = (page - 1) * limit;

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const totalCoupons = await Coupon.countDocuments({
      isListed: true,
      expireDate: { $gte: today }
    });

    const totalPages = Math.ceil(totalCoupons / limit);

    const coupons = await Coupon.find({
      isListed: true,
      expireDate: { $gte: today }
    })
      .populate('appliedUsers.userId', 'email')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .lean();

    const formattedCoupons = coupons.map(coupon => ({
      id: coupon._id,
      code: coupon.couponCode,
      title: coupon.couponName,
      description: coupon.description,
      discountType: coupon.discountType || 'flat',
      discountValue: coupon.discountPrice,
      expiryDate: coupon.expireDate,
      minPurchase: coupon.minimumPrice || 0,
      maxDiscount: coupon.maxDiscountAmount || 0,
      terms: coupon.terms || ['Valid on all purchases', 'Cannot be combined', 'One use per customer'],
      usageType: coupon.usageType || 'once',
      limit: coupon.limit || 100,
      usageCount: coupon.appliedUsers ? coupon.appliedUsers.length : 0,
      activeDate: coupon.activeDate
    }));

    res.render('Coupons', {
      coupons: formattedCoupons,
      currentPage: page,
      totalPages: totalPages,
      hasNextPage: page < totalPages,
      hasPrevPage: page > 1,
      user: req.session.user || null,
      couponsJSON: JSON.stringify(formattedCoupons)
    });

  } catch (err) {
    console.error('❌ Error fetching available coupons:', err);
    res.status(500).json({
      success: false,
      message: 'Error loading coupons'
    });
  }
};


/**
 * Get detailed information about a specific coupon
 */
const getCouponDetails = async (req, res) => {
  try {
    const { couponId } = req.params;

    if (!couponId) {
      return res.status(400).json({
        success: false,
        message: 'Coupon ID is required'
      });
    }

    const coupon = await Coupon.findById(couponId)
      .populate('appliedUsers.userId', 'email name')
      .lean();

    if (!coupon) {
      return res.status(404).json({
        success: false,
        message: 'Coupon not found'
      });
    }

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const isExpired = new Date(coupon.expireDate) < today;

    // Check if coupon is available
    if (isExpired || !coupon.isListed) {
      return res.status(400).json({
        success: false,
        message: 'This coupon is not available'
      });
    }

    const usageCount = coupon.appliedUsers ? coupon.appliedUsers.length : 0;

    res.json({
      success: true,
      coupon: {
        id: coupon._id,
        code: coupon.couponCode,
        name: coupon.couponName,
        description: coupon.description,
        discountType: coupon.discountType,
        discountValue: coupon.discountPrice,
        minimumPrice: coupon.minimumPrice,
        maxDiscountAmount: coupon.maxDiscountAmount,
        activeDate: coupon.activeDate,
        expireDate: coupon.expireDate,
        usageType: coupon.usageType,
        limit: coupon.limit,
        usageCount: usageCount,
        remainingUses: coupon.limit - usageCount,
        isLimitReached: usageCount >= coupon.limit
      }
    });

  } catch (err) {
    console.error('❌ Error fetching coupon details:', err);
    res.status(500).json({
      success: false,
      message: 'Error fetching coupon details'
    });
  }
};

/**
 * Apply coupon at checkout and calculate discount
 */
const applyCouponAtCheckout = async (req, res) => {
  try {
    const { couponCode, cartTotal } = req.body;
    const userId = req.session.user?._id || req.session.user?.id;

    if (!userId) {
      return res.status(401).json({
        success: false,
        message: 'Please login first'
      });
    }

    if (!couponCode || cartTotal === undefined) {
      return res.status(400).json({
        success: false,
        message: 'Coupon code and cart total are required'
      });
    }

    // Find coupon by code - FIXED: isListed: true instead of status: 'active'
    const coupon = await Coupon.findOne({
      couponCode: couponCode.toUpperCase(),
      isListed: true
    });

    if (!coupon) {
      return res.status(404).json({
        success: false,
        message: 'Invalid coupon code'
      });
    }

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    // Check if expired
    if (new Date(coupon.expireDate) < today) {
      return res.status(400).json({
        success: false,
        message: 'This coupon has expired'
      });
    }

    // Check if coupon is within active period
    if (new Date(coupon.activeDate) > today) {
      return res.status(400).json({
        success: false,
        message: 'This coupon is not yet active'
      });
    }

    // Check minimum purchase
    if (cartTotal < coupon.minimumPrice) {
      return res.status(400).json({
        success: false,
        message: `Minimum purchase of ₹${coupon.minimumPrice} required. Your cart total is ₹${cartTotal}`
      });
    }

    // Check usage limit
    const usageCount = coupon.appliedUsers ? coupon.appliedUsers.length : 0;
    if (usageCount >= coupon.limit) {
      return res.status(400).json({
        success: false,
        message: 'This coupon has reached its usage limit'
      });
    }

    // Check if user already used (for 'once' usage type)
    if (coupon.usageType === 'once' && coupon.appliedUsers) {
      const userHasUsed = coupon.appliedUsers.some(
        applied => applied.userId.toString() === userId.toString()
      );

      if (userHasUsed) {
        return res.status(400).json({
          success: false,
          message: 'You have already used this coupon'
        });
      }
    }

    // Calculate discount
    let discount = 0;
    
    if (coupon.discountType === 'percentage') {
      discount = (cartTotal * coupon.discountPrice) / 100;
      
      // Apply max discount limit if exists
      if (coupon.maxDiscountAmount && discount > coupon.maxDiscountAmount) {
        discount = coupon.maxDiscountAmount;
      }
    } else if (coupon.discountType === 'free_shipping') {
      // For free shipping, discount is handled separately
      discount = 0;
    } else {
      // Flat discount
      discount = Math.min(coupon.discountPrice, cartTotal);
    }

    res.json({
      success: true,
      message: 'Coupon applied successfully',
      discount: Math.round(discount * 100) / 100,
      coupon: {
        id: coupon._id,
        code: coupon.couponCode,
        name: coupon.couponName,
        discountType: coupon.discountType,
        discountValue: coupon.discountPrice,
        minimumPrice: coupon.minimumPrice,
        finalTotal: Math.max(0, Math.round((cartTotal - discount) * 100) / 100)
      }
    });

  } catch (err) {
    console.error('❌ Error applying coupon:', err);
    res.status(500).json({
      success: false,
      message: 'Error applying coupon'
    });
  }
};

/**
 * Record coupon usage after successful order
 */
const recordCouponUsage = async (req, res) => {
  try {
    const { couponId, orderId } = req.body;
    const userId = req.session.user?._id || req.session.user?.id;

    if (!userId || !couponId || !orderId) {
      return res.status(400).json({
        success: false,
        message: 'User ID, Coupon ID, and Order ID are required'
      });
    }

    // Find coupon
    const coupon = await Coupon.findById(couponId);

    if (!coupon) {
      return res.status(404).json({
        success: false,
        message: 'Coupon not found'
      });
    }

    // Check if user already used this coupon
    const alreadyUsed = coupon.appliedUsers.some(
      applied => applied.userId.toString() === userId.toString()
    );

    if (alreadyUsed && coupon.usageType === 'once') {
      return res.status(400).json({
        success: false,
        message: 'You have already used this coupon'
      });
    }

    // Add user to appliedUsers
    coupon.appliedUsers.push({
      userId: userId,
      orderId: orderId,
      appliedDate: new Date()
    });

    await coupon.save();

    console.log(`✅ Coupon ${coupon.couponCode} recorded for user ${userId}`);

    res.json({
      success: true,
      message: 'Coupon usage recorded successfully'
    });

  } catch (err) {
    console.error('❌ Error recording coupon usage:', err);
    res.status(500).json({
      success: false,
      message: 'Error recording coupon usage'
    });
  }
};

/**
 * Search coupons by code, name, or description
 */
const searchCoupons = async (req, res) => {
  try {
    const { query } = req.query;

    if (!query || query.trim() === '') {
      return res.json({
        success: true,
        coupons: []
      });
    }

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    // FIXED: isListed: true instead of status: 'active'
    const coupons = await Coupon.find({
      isListed: true,
      expireDate: { $gte: today },
      $or: [
        { couponCode: { $regex: query, $options: 'i' } },
        { couponName: { $regex: query, $options: 'i' } },
        { description: { $regex: query, $options: 'i' } }
      ]
    })
      .select('couponCode couponName description discountPrice discountType expireDate minimumPrice maxDiscountAmount appliedUsers limit')
      .limit(10)
      .lean();

    const formattedCoupons = coupons.map(coupon => ({
      id: coupon._id,
      code: coupon.couponCode,
      name: coupon.couponName,
      description: coupon.description,
      discountValue: coupon.discountPrice,
      discountType: coupon.discountType,
      expiryDate: coupon.expireDate,
      minPurchase: coupon.minimumPrice,
      maxDiscount: coupon.maxDiscountAmount,
      usageCount: coupon.appliedUsers ? coupon.appliedUsers.length : 0,
      limit: coupon.limit
    }));

    res.json({
      success: true,
      coupons: formattedCoupons
    });

  } catch (err) {
    console.error('❌ Error searching coupons:', err);
    res.status(500).json({
      success: false,
      message: 'Error searching coupons'
    });
  }
};

/**
 * Validate coupon code and get its details
 */
const validateCouponCode = async (req, res) => {
  try {
    const { code } = req.query;

    if (!code) {
      return res.status(400).json({
        success: false,
        message: 'Coupon code is required'
      });
    }

    // FIXED: isListed: true instead of status: 'active'
    const coupon = await Coupon.findOne({
      couponCode: code.toUpperCase(),
      isListed: true
    });

    if (!coupon) {
      return res.status(404).json({
        success: false,
        message: 'Coupon code not found'
      });
    }

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    if (new Date(coupon.expireDate) < today) {
      return res.status(400).json({
        success: false,
        message: 'This coupon has expired'
      });
    }

    if (new Date(coupon.activeDate) > today) {
      return res.status(400).json({
        success: false,
        message: 'This coupon is not yet active'
      });
    }

    const usageCount = coupon.appliedUsers ? coupon.appliedUsers.length : 0;

    res.json({
      success: true,
      coupon: {
        id: coupon._id,
        code: coupon.couponCode,
        name: coupon.couponName,
        discountType: coupon.discountType,
        discountValue: coupon.discountPrice,
        minimumPrice: coupon.minimumPrice,
        maxDiscountAmount: coupon.maxDiscountAmount,
        usageType: coupon.usageType,
        isValid: true,
        usageCount: usageCount,
        limit: coupon.limit,
        remainingUses: coupon.limit - usageCount
      }
    });

  } catch (err) {
    console.error('❌ Error validating coupon:', err);
    res.status(500).json({
      success: false,
      message: 'Error validating coupon'
    });
  }
};

module.exports = {
 getAvailableCouponsJSON,
  getAvailableCouponsHTML,
  getCouponDetails,
  applyCouponAtCheckout,
  recordCouponUsage,
  searchCoupons,
  validateCouponCode
};