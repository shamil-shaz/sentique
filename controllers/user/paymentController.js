const Razorpay = require('razorpay');
const crypto = require('crypto');
const mongoose = require('mongoose');
const Cart = require('../../models/cartSchema');
const Address = require('../../models/addressSchema');
const Product = require('../../models/productSchema');
const Order = require('../../models/orderSchema');
const Wallet = require('../../models/walletSchema');
const Coupon = require('../../models/couponSchema');

// Initialize Razorpay
const razorpay = new Razorpay({
  key_id: process.env.RAZORPAY_KEY_ID,
  key_secret: process.env.RAZORPAY_KEY_SECRET,
});

// ✅ ADD THIS - Check Authentication
const checkAuth = async (req, res) => {
  try {
    console.log('🔐 checkAuth - Checking authentication');
    console.log('   Session exists:', !!req.session);
    console.log('   User in session:', !!req.session?.user);

    if (!req.session || !req.session.user) {
      console.warn('❌ Not authenticated');
      return res.status(200).json({
        success: true,
        isAuthenticated: false,
        message: 'User not logged in'
      });
    }

    console.log('✅ User authenticated:', req.session.user._id || req.session.user.id);
    return res.status(200).json({
      success: true,
      isAuthenticated: true,
      user: {
        id: req.session.user._id || req.session.user.id,
        email: req.session.user.email,
        name: req.session.user.name
      }
    });
  } catch (err) {
    console.error('❌ checkAuth error:', err.message);
    return res.status(500).json({
      success: false,
      isAuthenticated: false,
      message: 'Authentication check failed'
    });
  }
};

// Create Razorpay Order
const createRazorpayOrder = async (req, res) => {
  try {
    console.log('createRazorpayOrder - Request body:', req.body);
    console.log('createRazorpayOrder - Session:', req.session);
    const { amount, currency = 'INR', orderId } = req.body;
    const userId = req.session.user?.id || req.session.user?._id;

    if (!userId || !mongoose.Types.ObjectId.isValid(userId)) {
      console.warn('createRazorpayOrder: Invalid or missing userId:', userId);
      return res.status(401).json({ success: false, message: 'User not authenticated' });
    }

    const amountInPaise = Math.round(parseFloat(amount));
    if (!amountInPaise || amountInPaise <= 0) {
      return res.status(400).json({ success: false, message: 'Invalid amount' });
    }

    // Validate cart stock before creating order
    const cart = await Cart.findOne({ userId }).populate({
      path: 'items.productId',
      select: 'productName price salePrice variants stock'
    });

    if (!cart || cart.items.length === 0) {
      return res.status(400).json({ success: false, message: 'Cart is empty' });
    }

    for (const item of cart.items) {
      const product = item.productId;
      const variant = product.variants?.find(v => v.size === item.variantSize);
      const availableStock = variant?.stock ?? product.stock ?? 0;
      if (availableStock < item.quantity) {
        return res.status(400).json({
          success: false,
          message: `${product.productName} is out of stock`
        });
      }
    }

    // Create Razorpay order
    const razorpayOrder = await razorpay.orders.create({
      amount: amountInPaise,
      currency,
      receipt: `order_${orderId || Date.now()}`,
      notes: {
        userId: userId,
        orderNote: 'E-commerce purchase'
      }
    });

    res.status(200).json({
      success: true,
      orderId: razorpayOrder.id,
      amount: razorpayOrder.amount,
      currency: razorpayOrder.currency,
      keyId: process.env.RAZORPAY_KEY_ID
    });
  } catch (err) {
    console.error('Razorpay order creation error:', {
      message: err.message,
      stack: err.stack,
      requestBody: req.body
    });
    res.status(500).json({ 
      success: false, 
      message: `Failed to create payment order: ${err.message}`,
      errorCode: err.code || 'UNKNOWN_ERROR'
    });
  }
};

// Verify Razorpay Payment
const verifyRazorpayPayment = async (req, res) => {
  try {
    console.log('verifyRazorpayPayment - Request body:', req.body);
    const { 
      razorpay_order_id, 
      razorpay_payment_id, 
      razorpay_signature,
      addressId,
      couponCode
    } = req.body;

    const userId = req.session.user?.id || req.session.user?._id;

    if (!userId || !mongoose.Types.ObjectId.isValid(userId)) {
      console.warn('verifyRazorpayPayment: Invalid or missing userId:', userId);
      return res.status(401).json({ success: false, message: 'User not authenticated' });
    }

    // Verify signature
    const body = razorpay_order_id + '|' + razorpay_payment_id;
    const expectedSignature = crypto
      .createHmac('sha256', process.env.RAZORPAY_KEY_SECRET)
      .update(body)
      .digest('hex');

    if (expectedSignature !== razorpay_signature) {
      console.warn('Razorpay signature verification failed', {
        expectedSignature,
        receivedSignature: razorpay_signature
      });
      return res.status(400).json({ 
        success: false, 
        message: 'Payment verification failed: Invalid signature'
      });
    }

    // Signature verified - Process order
    const cart = await Cart.findOne({ userId }).populate({
      path: 'items.productId',
      select: 'productName price salePrice variants stock'
    });

    if (!cart || cart.items.length === 0) {
      return res.status(400).json({ success: false, message: 'Cart is empty' });
    }

    // Validate stock and calculate totals
    let subtotal = 0;
    const orderItems = [];

    for (const item of cart.items) {
      const product = item.productId;
      if (!product) {
        return res.status(400).json({ success: false, message: 'Product not found' });
      }

      const variant = product.variants?.find(v => v.size === item.variantSize);
      const availableStock = variant?.stock ?? product.stock ?? 0;

      if (availableStock < item.quantity) {
        return res.status(400).json({
          success: false,
          message: `${product.productName} is out of stock`
        });
      }

      const price = variant?.salePrice || variant?.price || product.salePrice || product.price || 0;
      const itemTotal = price * item.quantity;
      subtotal += itemTotal;

      orderItems.push({
        product: product._id,
        productName: product.productName,
        variantSize: item.variantSize,
        quantity: item.quantity,
        price: price,
        total: itemTotal
      });
    }

    // Get delivery address
    const addressDoc = await Address.findOne({ userId });
    const deliveryAddress = addressDoc?.address.find(addr => addr._id.toString() === addressId);

    if (!deliveryAddress) {
      return res.status(404).json({ success: false, message: 'Address not found' });
    }

    // Apply coupon if provided
    let discount = 0;
    let couponApplied = false;
    let appliedCouponCode = null;

    if (couponCode) {
      const coupon = await Coupon.findOne({ code: couponCode, isActive: true });
      if (coupon) {
        discount = (subtotal * coupon.discountPercentage) / 100;
        couponApplied = true;
        appliedCouponCode = couponCode;
        console.log(`Coupon applied: ${couponCode}, Discount: ${discount}`);
      }
    }

    const finalAmount = Math.max(subtotal - discount, 0);

    // Create order
    const orderData = {
      user: userId,
      orderItems,
      totalPrice: subtotal,
      discount,
      finalAmount,
      deliveryAddress: {
        name: deliveryAddress.name,
        phone: deliveryAddress.phone,
        houseName: deliveryAddress.houseName,
        buildingNumber: deliveryAddress.buildingNumber,
        landmark: deliveryAddress.landmark,
        city: deliveryAddress.city,
        state: deliveryAddress.state,
        pincode: deliveryAddress.pincode,
        addressType: deliveryAddress.addressType
      },
      paymentMethod: 'Online Payment',
      paymentStatus: 'Completed',
      couponApplied,
      couponCode: appliedCouponCode,
      status: 'Processing',
      createdOn: new Date(),
      razorpayPaymentId: razorpay_payment_id,
      razorpayOrderId: razorpay_order_id
    };

    const order = new Order(orderData);
    await order.save();

    // Update product stock
    for (const item of cart.items) {
      const product = await Product.findById(item.productId._id);
      if (product) {
        const variantIndex = product.variants?.findIndex(v => v.size === item.variantSize);
        if (variantIndex !== -1 && product.variants[variantIndex]) {
          const updateField = `variants.${variantIndex}.stock`;
          await Product.findByIdAndUpdate(
            item.productId._id,
            { $inc: { [updateField]: -item.quantity } },
            { runValidators: false }
          );
        } else {
          await Product.findByIdAndUpdate(
            item.productId._id,
            { $inc: { stock: -item.quantity } },
            { runValidators: false }
          );
        }
      }
    }

    // Clear cart
    cart.items = [];
    await cart.save();

    res.status(200).json({
      success: true,
      message: 'Payment verified and order placed',
      orderId: order.orderId,
      orderNumber: order._id
    });
  } catch (err) {
    console.error('Payment verification error:', {
      message: err.message,
      stack: err.stack,
      requestBody: req.body
    });
    res.status(500).json({ 
      success: false, 
      message: `Payment verification failed: ${err.message}`,
      errorCode: err.code || 'UNKNOWN_ERROR'
    });
  }
};

// Place Order (COD or Wallet)
const placeOrder = async (req, res) => {
  try {
    const userId = req.session.user?.id || req.session.user?._id;
    const { addressId, paymentMethod, couponCode } = req.body;

    console.log('Placing order - userId:', userId, 'addressId:', addressId, 'paymentMethod:', paymentMethod);

    if (!mongoose.Types.ObjectId.isValid(userId)) {
      console.warn('placeOrder: Invalid user ID:', userId);
      return res.status(400).json({ success: false, message: 'Invalid user ID' });
    }

    if (!addressId || !mongoose.Types.ObjectId.isValid(addressId)) {
      return res.status(400).json({ success: false, message: 'Please select a valid delivery address' });
    }

    if (!paymentMethod) {
      return res.status(400).json({ success: false, message: 'Please select a payment method' });
    }

    let normalizedPaymentMethod;
    if (paymentMethod.toLowerCase() === 'cod') {
      normalizedPaymentMethod = 'COD';
    } else if (paymentMethod.toLowerCase() === 'wallet') {
      normalizedPaymentMethod = 'Wallet';
    } else {
      return res.status(400).json({ success: false, message: 'Invalid payment method' });
    }

    const cart = await Cart.findOne({ userId }).populate({
      path: 'items.productId',
      select: 'productName price salePrice variants stock',
    });

    if (!cart || cart.items.length === 0) {
      return res.status(400).json({ success: false, message: 'Your cart is empty' });
    }

    const addressDoc = await Address.findOne({ userId });
    if (!addressDoc) {
      return res.status(404).json({ success: false, message: 'Address not found' });
    }

    const deliveryAddress = addressDoc.address.find((addr) => addr._id.toString() === addressId);
    if (!deliveryAddress) {
      return res.status(404).json({ success: false, message: 'Selected address not found' });
    }

    for (const item of cart.items) {
      const product = item.productId;
      if (!product) {
        return res.status(400).json({ success: false, message: 'Some products are no longer available' });
      }

      const variant = product.variants?.find((v) => v.size === item.variantSize);
      const availableStock = variant?.stock ?? product.stock ?? 0;

      if (availableStock < item.quantity) {
        return res.status(400).json({
          success: false,
          message: `${product.productName} (${item.variantSize}ml) is out of stock or has insufficient stock`,
        });
      }
    }

    let subtotal = 0;
    const orderItems = [];

    for (const item of cart.items) {
      const product = item.productId;
      const variant = product.variants?.find((v) => v.size === item.variantSize);
      const price = variant?.salePrice || variant?.price || product.salePrice || product.price || 0;
      const itemTotal = price * item.quantity;
      subtotal += itemTotal;

      orderItems.push({
        product: product._id,
        productName: product.productName,
        variantSize: item.variantSize,
        quantity: item.quantity,
        price: price,
        total: itemTotal,
      });
    }

    let discount = 0;
    let couponApplied = false;
    let appliedCouponCode = null;

    if (couponCode) {
      const coupon = await Coupon.findOne({ code: couponCode, isActive: true });
      if (coupon) {
        discount = (subtotal * coupon.discountPercentage) / 100;
        couponApplied = true;
        appliedCouponCode = couponCode;
        console.log(`Coupon applied: ${couponCode}, Discount: ${discount}`);
      } else {
        console.log(`Invalid coupon code: ${couponCode}`);
      }
    }

    const finalAmount = Math.max(subtotal - discount, 0);

    // Wallet payment logic
    if (normalizedPaymentMethod === 'Wallet') {
      const wallet = await Wallet.findOne({ user: userId });
      if (!wallet) {
        return res.status(404).json({ success: false, message: 'Wallet not found' });
      }
      if (wallet.balance < finalAmount) {
        return res.status(400).json({
          success: false,
          message: `Insufficient wallet balance. Available: ₹${wallet.balance.toFixed(2)}, Required: ₹${finalAmount.toFixed(2)}`
        });
      }
      // Deduct amount from wallet
      wallet.balance -= finalAmount;
      wallet.transactions.push({
        type: 'debit',
        amount: finalAmount,
        description: 'Purchase',
        orderId: `order_${Date.now()}`,
        date: new Date(),
      });
      await wallet.save();
    }

    const orderData = {
      user: userId,
      orderItems,
      totalPrice: subtotal,
      discount,
      finalAmount,
      deliveryAddress: {
        name: deliveryAddress.name,
        phone: deliveryAddress.phone,
        houseName: deliveryAddress.houseName,
        buildingNumber: deliveryAddress.buildingNumber,
        landmark: deliveryAddress.landmark,
        city: deliveryAddress.city,
        state: deliveryAddress.state,
        pincode: deliveryAddress.pincode,
        addressType: deliveryAddress.addressType,
      },
      paymentMethod: normalizedPaymentMethod,
      paymentStatus: normalizedPaymentMethod === 'COD' ? 'Pending' : 'Completed',
      couponApplied,
      couponCode: appliedCouponCode,
      status: 'Processing',
      createdOn: new Date(),
    };

    const order = new Order(orderData);
    await order.save();

    for (const item of cart.items) {
      const product = await Product.findById(item.productId._id);
      if (product) {
        const variantIndex = product.variants?.findIndex((v) => v.size === item.variantSize);
        if (variantIndex !== -1 && product.variants[variantIndex]) {
          const updateField = `variants.${variantIndex}.stock`;
          await Product.findByIdAndUpdate(
            item.productId._id,
            { $inc: { [updateField]: -item.quantity } },
            { runValidators: false }
          );
        } else if (typeof product.stock === 'number') {
          await Product.findByIdAndUpdate(
            item.productId._id,
            { $inc: { stock: -item.quantity } },
            { runValidators: false }
          );
        }
      }
    }

    cart.items = [];
    await cart.save();

    console.log('Order placed successfully:', order.orderId);

    return res.status(200).json({
      success: true,
      message: 'Order placed successfully',
      orderId: order.orderId,
    });
  } catch (err) {
    console.error('Place order error:', {
      message: err.message,
      stack: err.stack,
      requestBody: req.body
    });
    return res.status(500).json({
      success: false,
      message: `Server error: ${err.message}`,
      errorCode: err.code || 'UNKNOWN_ERROR'
    });
  }
};

module.exports = {
  checkAuth,           // ✅ ADD THIS EXPORT
  createRazorpayOrder,
  verifyRazorpayPayment,
  placeOrder
};