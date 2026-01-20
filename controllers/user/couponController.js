
const Coupon = require('../../models/couponSchema');
const User = require('../../models/userSchema');

const formatCouponWithUsage = (coupon, currentUserId = null) => {
  const appliedUsersArray = Array.isArray(coupon.appliedUsers) ? coupon.appliedUsers : [];
  const usedCount = appliedUsersArray.length;
  const limitNum = Number(coupon.limit) || 0;
  const usagePercentage = limitNum > 0 ? Math.round((usedCount / limitNum) * 100) : 0;
  const remainingUses = Math.max(0, limitNum - usedCount);
  
  const userHasUsed = currentUserId ? appliedUsersArray.some(applied => 
    applied.userId && applied.userId._id.toString() === currentUserId.toString()
  ) : false;

  return {
    used: usedCount,
    usagePercentage: usagePercentage,
    remainingUses: remainingUses,
    limit: limitNum,
    userHasUsed: userHasUsed  
  };
};

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

    const userId = req.session.user?._id || req.session.user?.id;  

    const coupons = await Coupon.find({
      isListed: true,
      expireDate: { $gte: today }
    })
      .populate('appliedUsers.userId', 'email')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .lean();

    const formattedCoupons = coupons.map(coupon => {
      const activeDate = new Date(coupon.activeDate);
      activeDate.setHours(0, 0, 0, 0);
      const expireDate = new Date(coupon.expireDate);
      expireDate.setHours(0, 0, 0, 0);

      let status = 'expired';
      if (expireDate >= today) {
        status = activeDate > today ? 'upcoming' : 'active';
      }
    
      const usageData = formatCouponWithUsage(coupon, userId);

      return {
        id: coupon._id,
        code: coupon.couponCode,
        title: coupon.couponName,
        description: coupon.description,
        discountType: coupon.discountType || 'flat',
        discountValue: coupon.discountPrice,
        expiryDate: coupon.expireDate,
        minPurchase: coupon.minimumPrice || 0,
        maxDiscount: coupon.maxDiscountAmount || 0,
        usageType: coupon.usageType || 'once',
        limit: coupon.limit || 100,
        usageCount: usageData.used,
        used: usageData.used,
        usagePercentage: usageData.usagePercentage,
        remainingUses: usageData.remainingUses,
        userHasUsed: usageData.userHasUsed,  
        activeDate: coupon.activeDate,
        status: status,
        isUsable: status === 'active' && !(coupon.usageType === 'once' && usageData.userHasUsed)
      };
    });

    return res.json({
      success: true,
      coupons: formattedCoupons,
      currentPage: page,
      totalPages: totalPages,
      hasNextPage: page < totalPages,
      hasPrevPage: page > 1
    });

  } catch (err) {
    console.error(' Error fetching available coupons:', err);
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
    
    const userId = req.session.user?._id || req.session.user?.id;
    
    const coupons = await Coupon.find({
      isListed: true,
      expireDate: { $gte: today }
    })
      .populate('appliedUsers.userId', 'email')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .lean();
    
    const formattedCoupons = coupons.map(coupon => {
      const activeDate = new Date(coupon.activeDate);
      activeDate.setHours(0, 0, 0, 0);
      const expireDate = new Date(coupon.expireDate);
      expireDate.setHours(0, 0, 0, 0);
      
      let status = 'expired';
      if (expireDate >= today) {
        status = activeDate > today ? 'upcoming' : 'active';
      }
    
      const usageData = formatCouponWithUsage(coupon, userId);
      
      return {
        id: coupon._id,
        code: coupon.couponCode,
        title: coupon.couponName,
        description: coupon.description,
        discountType: coupon.discountType || 'flat',
        discountValue: coupon.discountPrice,
        expiryDate: coupon.expireDate,
        minPurchase: coupon.minimumPrice || 0,
        maxDiscount: coupon.maxDiscountAmount || 0,
        usageType: coupon.usageType || 'once',
        limit: coupon.limit || 100,
        usageCount: usageData.used,
        used: usageData.used,
        usagePercentage: usageData.usagePercentage,
        remainingUses: usageData.remainingUses,
        userHasUsed: usageData.userHasUsed,
        activeDate: coupon.activeDate,
        status: status,
        isUsable: status === 'active' && !(coupon.usageType === 'once' && usageData.userHasUsed)
      };
    });
   
    let user = null;
    
    if (userId) {
      
      user = await User.findById(userId).select('name email image phone').lean();
  
      if (user) {
        req.session.user = {
          id: user._id,
          _id: user._id,
          name: user.name,
          email: user.email,
          image: user.image,
          phone: user.phone
        };
       
        await req.session.save();
      }
    } else {
  
      user = req.session.user || null;
    }

    res.render('coupons', {
      coupons: formattedCoupons,
      currentPage: page,
      totalPages: totalPages,
      hasNextPage: page < totalPages,
      hasPrevPage: page > 1,
      user: user,  
      couponsJSON: JSON.stringify(formattedCoupons)
    });
    
  } catch (err) {
    console.error(' Error fetching available coupons:', err);
    res.status(500).json({
      success: false,
      message: 'Error loading coupons'
    });
  }
};

const getCouponDetails = async (req, res) => {
  try {
    const { couponId } = req.params;

    if (!couponId) {
      return res.status(400).json({
        success: false,
        message: 'Coupon ID is required'
      });
    }

    const userId = req.session.user?._id || req.session.user?.id;  

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

    if (isExpired || !coupon.isListed) {
      return res.status(400).json({
        success: false,
        message: 'This coupon is not available'
      });
    }

    const activeDate = new Date(coupon.activeDate);
    activeDate.setHours(0, 0, 0, 0);
    const status = activeDate > today ? 'upcoming' : 'active';
    
    const usageData = formatCouponWithUsage(coupon, userId);

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
        usageCount: usageData.used,
        used: usageData.used,
        usagePercentage: usageData.usagePercentage,
        remainingUses: usageData.remainingUses,
        userHasUsed: usageData.userHasUsed,  
        isLimitReached: usageData.used >= coupon.limit,
        status: status,
        isUsable: status === 'active' && !(coupon.usageType === 'once' && usageData.userHasUsed)
      }
    });

  } catch (err) {
    console.error(' Error fetching coupon details:', err);
    res.status(500).json({
      success: false,
      message: 'Error fetching coupon details'
    });
  }
};

const applyCouponAtCheckout = async (req, res) => {
  try {
   
    console.log('Request body:', req.body);
    
    const { couponCode, cartTotal, cartItems } = req.body;
    const userId = req.session.user?._id || req.session.user?.id;

    if (!userId) {
      return res.status(401).json({ success: false, message: 'Please login first' });
    }
    if (!couponCode?.trim()) {
      return res.status(400).json({ success: false, message: 'Coupon code is required' });
    }
    if (!cartTotal) {
      return res.status(400).json({ success: false, message: 'Cart total is required' });
    }

    const cartTotalNum = parseFloat(cartTotal);
    if (!cartTotalNum || cartTotalNum <= 0) {
      return res.status(400).json({ success: false, message: 'Invalid cart total' });
    }

    const coupon = await Coupon.findOne({
      couponCode: couponCode.toUpperCase(),
      isListed: true
    }).populate('appliedUsers.userId');  
    if (!coupon) {
      return res.status(404).json({ success: false, message: 'Invalid coupon code' });
    }

    const discountPrice = parseFloat(coupon.discountPrice) || 0;
    if (discountPrice <= 0) {
      return res.status(400).json({ success: false, message: 'This coupon provides no discount' });
    }

    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    const expireDate = new Date(coupon.expireDate);
    expireDate.setHours(0, 0, 0, 0);
    
    const activeDate = new Date(coupon.activeDate);
    activeDate.setHours(0, 0, 0, 0);

    if (expireDate < today) {
      return res.status(400).json({ success: false, message: 'This coupon has expired' });
    }
    
    if (activeDate > today) {
      return res.status(400).json({ 
        success: false, 
        message: `This coupon will be active from ${activeDate.toLocaleDateString()}` 
      });
    }

    const minimumPricePaise = Math.round((parseFloat(coupon.minimumPrice) || 0) * 100);
    const cartTotalPaise = Math.round(cartTotalNum * 100);
    
    if (cartTotalPaise < minimumPricePaise) {
      return res.status(400).json({
        success: false,
        message: `Minimum purchase of ₹${(minimumPricePaise / 100).toFixed(2)} required`
      });
    }

    const usageData = formatCouponWithUsage(coupon, userId);  
    const limit = coupon.limit || Infinity;
    
    if (usageData.used >= limit) {
      return res.status(400).json({ success: false, message: 'This coupon has reached its usage limit' });
    }

    if (coupon.usageType === 'once' && usageData.userHasUsed) {
      return res.status(400).json({ success: false, message: 'You have already used this one-time coupon' });
    }

    let totalDiscountPaise = 0;
    const discountType = coupon.discountType || 'flat';
    const maxDiscountAmount = parseFloat(coupon.maxDiscountAmount) || 0;

    if (discountType === 'percentage') {
      totalDiscountPaise = Math.round((cartTotalPaise * discountPrice) / 100);
      const maxDiscountPaise = Math.round(maxDiscountAmount * 100);
      if (maxDiscountPaise > 0) {
        totalDiscountPaise = Math.min(totalDiscountPaise, maxDiscountPaise);
      }
    } else {
      totalDiscountPaise = Math.min(Math.round(discountPrice * 100), cartTotalPaise);
    }

    if (totalDiscountPaise <= 0) {
      return res.status(400).json({ success: false, message: 'No discount applicable for this cart' });
    }

    let updatedCartItems = [];
    if (cartItems && Array.isArray(cartItems) && cartItems.length > 0) {
      let computedTotalPaise = 0;
      cartItems.forEach(item => {
        const pricePaise = Math.round(parseFloat(item.price || 0) * 100);
        const qty = parseInt(item.quantity || 0);
        computedTotalPaise += pricePaise * qty;
      });
      if (Math.abs(computedTotalPaise - cartTotalPaise) > 1) {
        return res.status(400).json({ success: false, message: 'Cart total mismatch' });
      }

      let sumDiscountPaise = 0;

      cartItems.forEach((item, index) => {
        const pricePaise = Math.round(parseFloat(item.price || 0) * 100);
        const qty = parseInt(item.quantity || 0);
        const subtotalPaise = pricePaise * qty;

        const discountPaise = Math.round((subtotalPaise * totalDiscountPaise) / cartTotalPaise);
        const discountedSubtotalPaise = subtotalPaise - discountPaise;

        updatedCartItems.push({
          ...item,
          subtotal: (subtotalPaise / 100).toFixed(2),
          discount: (discountPaise / 100).toFixed(2),
          discountedSubtotal: (discountedSubtotalPaise / 100).toFixed(2)
        });

        sumDiscountPaise += discountPaise;
      });

      const diffPaise = totalDiscountPaise - sumDiscountPaise;
      if (diffPaise !== 0) {
        let maxSubtotalIdx = 0;
        updatedCartItems.forEach((item, idx) => {
          if (parseFloat(item.subtotal) > parseFloat(updatedCartItems[maxSubtotalIdx].subtotal)) {
            maxSubtotalIdx = idx;
          }
        });
        const adjustDiscount = parseFloat(updatedCartItems[maxSubtotalIdx].discount) + (diffPaise / 100);
        const adjustDiscounted = parseFloat(updatedCartItems[maxSubtotalIdx].discountedSubtotal) - (diffPaise / 100);
        updatedCartItems[maxSubtotalIdx].discount = adjustDiscount.toFixed(2);
        updatedCartItems[maxSubtotalIdx].discountedSubtotal = adjustDiscounted.toFixed(2);
      }
    } else {
      updatedCartItems = [];
    }

    const finalTotal = Math.max(0, (cartTotalPaise - totalDiscountPaise) / 100);

    console.log(' COUPON APPLIED!');
    console.log('   Total Discount:', totalDiscountPaise / 100);
    console.log('   Final Total:', finalTotal);
    if (updatedCartItems.length > 0) {
      console.log('   Updated Items:', updatedCartItems.map(i => `${i.name}: -₹${i.discount}`));
    }

    res.status(200).json({
      success: true,
      message: 'Coupon applied successfully',
      totalDiscount: Number((totalDiscountPaise / 100).toFixed(2)),
      finalTotal: Number(finalTotal.toFixed(2)),
      updatedCartItems,
      coupon: {
        id: coupon._id,
        code: coupon.couponCode,
        name: coupon.couponName,
        discountType,
        discountValue: discountPrice
      }
    });

  } catch (err) {
    console.error(' COUPON ERROR:', err);
    res.status(500).json({ success: false, message: 'Error applying coupon' });
  }
};

const recordCouponUsage = async (req, res) => {
  try {
    const { couponId, orderId } = req.body;
    const userId = req.session.user?._id || req.session.user?.id;

    console.log(' RECORD COUPON USAGE ');
    console.log('Coupon ID:', couponId);
    console.log('User ID:', userId);
    console.log('Order ID:', orderId);

    if (!userId || !couponId || !orderId) {
      console.error(' Missing required fields');
      return res.status(400).json({
        success: false,
        message: 'User ID, Coupon ID, and Order ID are required'
      });
    }

    const coupon = await Coupon.findById(couponId);

    if (!coupon) {
      console.error(' Coupon not found');
      return res.status(404).json({
        success: false,
        message: 'Coupon not found'
      });
    }

    console.log('Current usage before:', coupon.appliedUsers.length);

   
    coupon.appliedUsers.push({
      userId: userId,
      orderId: orderId,
      appliedDate: new Date() 
    });
  
    await coupon.save();

    console.log('Current usage after save:', coupon.appliedUsers.length);
    console.log(` Coupon ${coupon.couponCode} usage recorded!`);

    res.json({
      success: true,
      message: 'Coupon usage recorded successfully',
      usageCount: coupon.appliedUsers.length
    });

  } catch (err) {
    console.error(' Error recording coupon usage:', err);
    res.status(500).json({
      success: false,
      message: 'Error recording coupon usage'
    });
  }
};

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

    const userId = req.session.user?._id || req.session.user?.id;  

    const coupons = await Coupon.find({
      isListed: true,
      expireDate: { $gte: today },
      $or: [
        { couponCode: { $regex: query, $options: 'i' } },
        { couponName: { $regex: query, $options: 'i' } },
        { description: { $regex: query, $options: 'i' } }
      ]
    })
      .select('couponCode couponName description discountPrice discountType minimumPrice maxDiscountAmount limit activeDate expireDate appliedUsers')
      .populate('appliedUsers.userId', 'email')  
      .limit(10)
      .lean();

    const formattedCoupons = coupons.map(coupon => {
      const activeDate = new Date(coupon.activeDate);
      activeDate.setHours(0, 0, 0, 0);
      const expireDate = new Date(coupon.expireDate);
      expireDate.setHours(0, 0, 0, 0);

      let status = 'expired';
      if (expireDate >= today) {
        status = activeDate > today ? 'upcoming' : 'active';
      }
     
      const usageData = formatCouponWithUsage(coupon, userId);

      return {
        id: coupon._id,
        code: coupon.couponCode,
        name: coupon.couponName,
        description: coupon.description,
        discountValue: coupon.discountPrice,
        discountType: coupon.discountType,
        minPurchase: coupon.minimumPrice,
        maxDiscount: coupon.maxDiscountAmount,
        limit: coupon.limit,
        used: usageData.used,
        usagePercentage: usageData.usagePercentage,
        remainingUses: usageData.remainingUses,
        userHasUsed: usageData.userHasUsed,  
        status: status,
        isUsable: status === 'active' && !(coupon.usageType === 'once' && usageData.userHasUsed)
      };
    });

    res.json({
      success: true,
      coupons: formattedCoupons
    });

  } catch (err) {
    console.error(' Error searching coupons:', err);
    res.status(500).json({
      success: false,
      message: 'Error searching coupons'
    });
  }
};

const validateCouponCode = async (req, res) => {
  try {
    const { code } = req.query;

    if (!code) {
      return res.status(400).json({
        success: false,
        message: 'Coupon code is required'
      });
    }

    const userId = req.session.user?._id || req.session.user?.id;  

    const coupon = await Coupon.findOne({
      couponCode: code.toUpperCase(),
      isListed: true
    }).populate('appliedUsers.userId');  

    if (!coupon) {
      return res.status(404).json({
        success: false,
        message: 'Coupon code not found'
      });
    }

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const expireDate = new Date(coupon.expireDate);
    expireDate.setHours(0, 0, 0, 0);
    
    const activeDate = new Date(coupon.activeDate);
    activeDate.setHours(0, 0, 0, 0);

    if (expireDate < today) {
      return res.status(400).json({
        success: false,
        message: 'This coupon has expired'
      });
    }

    if (activeDate > today) {
      return res.status(400).json({
        success: false,
        message: `This coupon will be active from ${activeDate.toLocaleDateString()}`
      });
    }

    const usageData = formatCouponWithUsage(coupon, userId);
 
    if (usageData.used >= coupon.limit) {
      return res.status(400).json({ success: false, message: 'This coupon has reached its usage limit' });
    }
    if (coupon.usageType === 'once' && usageData.userHasUsed) {
      return res.status(400).json({ success: false, message: 'You have already used this one-time coupon' });
    }

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
        used: usageData.used,
        usageCount: usageData.used,
        usagePercentage: usageData.usagePercentage,
        limit: coupon.limit,
        remainingUses: usageData.remainingUses,
        userHasUsed: usageData.userHasUsed  
      }
    });

  } catch (err) {
    console.error(' Error validating coupon:', err);
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