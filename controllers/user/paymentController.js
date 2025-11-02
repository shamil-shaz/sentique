// const Razorpay = require('razorpay');
// const crypto = require('crypto');
// const mongoose = require('mongoose');
// const Cart = require('../../models/cartSchema');
// const Address = require('../../models/addressSchema');
// const Product = require('../../models/productSchema');
// const Order = require('../../models/orderSchema');
// const Wallet = require('../../models/walletSchema');
// const Coupon = require('../../models/couponSchema');

// // Initialize Razorpay
// const razorpay = new Razorpay({
//   key_id: process.env.RAZORPAY_KEY_ID,
//   key_secret: process.env.RAZORPAY_KEY_SECRET,
// });

// // ✅ ADD THIS - Check Authentication
// const checkAuth = async (req, res) => {
//   try {
//     console.log('🔐 checkAuth - Checking authentication');
//     console.log('   Session exists:', !!req.session);
//     console.log('   User in session:', !!req.session?.user);

//     if (!req.session || !req.session.user) {
//       console.warn('❌ Not authenticated');
//       return res.status(200).json({
//         success: true,
//         isAuthenticated: false,
//         message: 'User not logged in'
//       });
//     }

//     console.log('✅ User authenticated:', req.session.user._id || req.session.user.id);
//     return res.status(200).json({
//       success: true,
//       isAuthenticated: true,
//       user: {
//         id: req.session.user._id || req.session.user.id,
//         email: req.session.user.email,
//         name: req.session.user.name
//       }
//     });
//   } catch (err) {
//     console.error('❌ checkAuth error:', err.message);
//     return res.status(500).json({
//       success: false,
//       isAuthenticated: false,
//       message: 'Authentication check failed'
//     });
//   }
// };

// // Create Razorpay Order
// const createRazorpayOrder = async (req, res) => {
//   try {
//     console.log('createRazorpayOrder - Request body:', req.body);
//     console.log('createRazorpayOrder - Session:', req.session);
//     const { amount, currency = 'INR', orderId } = req.body;
//     const userId = req.session.user?.id || req.session.user?._id;

//     if (!userId || !mongoose.Types.ObjectId.isValid(userId)) {
//       console.warn('createRazorpayOrder: Invalid or missing userId:', userId);
//       return res.status(401).json({ success: false, message: 'User not authenticated' });
//     }

//     const amountInPaise = Math.round(parseFloat(amount));
//     if (!amountInPaise || amountInPaise <= 0) {
//       return res.status(400).json({ success: false, message: 'Invalid amount' });
//     }

//     // Validate cart stock before creating order
//     const cart = await Cart.findOne({ userId }).populate({
//       path: 'items.productId',
//       select: 'productName price salePrice variants stock'
//     });

//     if (!cart || cart.items.length === 0) {
//       return res.status(400).json({ success: false, message: 'Cart is empty' });
//     }

//     for (const item of cart.items) {
//       const product = item.productId;
//       const variant = product.variants?.find(v => v.size === item.variantSize);
//       const availableStock = variant?.stock ?? product.stock ?? 0;
//       if (availableStock < item.quantity) {
//         return res.status(400).json({
//           success: false,
//           message: `${product.productName} is out of stock`
//         });
//       }
//     }

//     // Create Razorpay order
//     const razorpayOrder = await razorpay.orders.create({
//       amount: amountInPaise,
//       currency,
//       receipt: `order_${orderId || Date.now()}`,
//       notes: {
//         userId: userId,
//         orderNote: 'E-commerce purchase'
//       }
//     });

//     res.status(200).json({
//       success: true,
//       orderId: razorpayOrder.id,
//       amount: razorpayOrder.amount,
//       currency: razorpayOrder.currency,
//       keyId: process.env.RAZORPAY_KEY_ID
//     });
//   } catch (err) {
//     console.error('Razorpay order creation error:', {
//       message: err.message,
//       stack: err.stack,
//       requestBody: req.body
//     });
//     res.status(500).json({ 
//       success: false, 
//       message: `Failed to create payment order: ${err.message}`,
//       errorCode: err.code || 'UNKNOWN_ERROR'
//     });
//   }
// };

// const verifyRazorpayPayment = async (req, res) => {
//   try {
//     console.log('verifyRazorpayPayment - Request body:', req.body);
//     const { 
//       razorpay_order_id, 
//       razorpay_payment_id, 
//       razorpay_signature,
//       addressId,
//       couponCode  // ✅ RECEIVE COUPON CODE
//     } = req.body;

//     const userId = req.session.user?.id || req.session.user?._id;

//     if (!userId || !mongoose.Types.ObjectId.isValid(userId)) {
//       console.warn('verifyRazorpayPayment: Invalid or missing userId:', userId);
//       return res.status(401).json({ success: false, message: 'User not authenticated' });
//     }

//     // Verify signature
//     const body = razorpay_order_id + '|' + razorpay_payment_id;
//     const expectedSignature = crypto
//       .createHmac('sha256', process.env.RAZORPAY_KEY_SECRET)
//       .update(body)
//       .digest('hex');

//     if (expectedSignature !== razorpay_signature) {
//       console.warn('Razorpay signature verification failed');
//       return res.status(400).json({ 
//         success: false, 
//         message: 'Payment verification failed: Invalid signature'
//       });
//     }

//     const cart = await Cart.findOne({ userId }).populate({
//       path: 'items.productId',
//       select: 'productName price salePrice variants stock'
//     });

//     if (!cart || cart.items.length === 0) {
//       return res.status(400).json({ success: false, message: 'Cart is empty' });
//     }

//     let subtotal = 0;
//     const orderItems = [];

//     for (const item of cart.items) {
//       const product = item.productId;
//       if (!product) {
//         return res.status(400).json({ success: false, message: 'Product not found' });
//       }

//       const variant = product.variants?.find(v => v.size === item.variantSize);
//       const availableStock = variant?.stock ?? product.stock ?? 0;

//       if (availableStock < item.quantity) {
//         return res.status(400).json({
//           success: false,
//           message: `${product.productName} is out of stock`
//         });
//       }

//       const price = variant?.salePrice || variant?.price || product.salePrice || product.price || 0;
//       const itemTotal = price * item.quantity;
//       subtotal += itemTotal;

//       orderItems.push({
//         product: product._id,
//         productName: product.productName,
//         variantSize: item.variantSize,
//         quantity: item.quantity,
//         price: price,
//         total: itemTotal
//       });
//     }

//     const addressDoc = await Address.findOne({ userId });
//     const deliveryAddress = addressDoc?.address.find(addr => addr._id.toString() === addressId);

//     if (!deliveryAddress) {
//       return res.status(404).json({ success: false, message: 'Address not found' });
//     }

//     // ✅ CALCULATE DISCOUNT FROM COUPON CODE
//     let discount = 0;
//     let couponApplied = false;
//     let appliedCouponCode = null;

//     if (couponCode) {
//       console.log('🎟️ Applying coupon:', couponCode);
//       const coupon = await Coupon.findOne({ 
//         couponCode: couponCode.toUpperCase(),
//         isListed: true
//       });

//       if (coupon) {
//         console.log('✅ Coupon found:', coupon.couponCode);
        
//         // Calculate discount based on type
//         if (coupon.discountType === 'percentage') {
//           discount = (subtotal * coupon.discountPrice) / 100;
          
//           // Apply max discount limit
//           if (coupon.maxDiscountAmount > 0 && discount > coupon.maxDiscountAmount) {
//             discount = coupon.maxDiscountAmount;
//           }
//         } else {
//           // Flat discount
//           discount = Math.min(coupon.discountPrice, subtotal);
//         }

//         discount = Math.round(discount * 100) / 100;
//         couponApplied = true;
//         appliedCouponCode = couponCode;
//         console.log('💰 Discount calculated:', discount);
//       } else {
//         console.log('❌ Coupon not found:', couponCode);
//       }
//     }

//     const finalAmount = Math.max(subtotal - discount, 0);

//     console.log('📊 Order amounts:', {
//       subtotal,
//       discount,
//       finalAmount
//     });

//     // ✅ NEW: Calculate proportional discount for each item
//     let finalOrderItems = orderItems;
//     if (discount > 0) {
//       finalOrderItems = calculateProportionalDiscount(orderItems, discount);
//     }

//     // Create order with discount
//     const orderData = {
//       user: userId,
//       orderItems: finalOrderItems,  // ✅ USE ITEMS WITH DISCOUNT INFO
//       totalPrice: subtotal,
//       discount: discount,
//       finalAmount: finalAmount,
//       deliveryAddress: {
//         name: deliveryAddress.name,
//         phone: deliveryAddress.phone,
//         houseName: deliveryAddress.houseName,
//         buildingNumber: deliveryAddress.buildingNumber,
//         landmark: deliveryAddress.landmark,
//         city: deliveryAddress.city,
//         state: deliveryAddress.state,
//         pincode: deliveryAddress.pincode,
//         addressType: deliveryAddress.addressType
//       },
//       paymentMethod: 'Online Payment',
//       paymentStatus: 'Completed',
//       couponApplied: couponApplied,
//       couponCode: appliedCouponCode,
//       status: 'Processing',
//       createdOn: new Date(),
//       razorpayPaymentId: razorpay_payment_id,
//       razorpayOrderId: razorpay_order_id
//     };

//     const order = new Order(orderData);
//     await order.save();

//     console.log('✅ Order saved with discount:', {
//       orderId: order.orderId,
//       discount: order.discount,
//       finalAmount: order.finalAmount
//     });

//     // Update product stock
//     for (const item of cart.items) {
//       const product = await Product.findById(item.productId._id);
//       if (product) {
//         const variantIndex = product.variants?.findIndex(v => v.size === item.variantSize);
//         if (variantIndex !== -1 && product.variants[variantIndex]) {
//           const updateField = `variants.${variantIndex}.stock`;
//           await Product.findByIdAndUpdate(
//             item.productId._id,
//             { $inc: { [updateField]: -item.quantity } },
//             { runValidators: false }
//           );
//         } else {
//           await Product.findByIdAndUpdate(
//             item.productId._id,
//             { $inc: { stock: -item.quantity } },
//             { runValidators: false }
//           );
//         }
//       }
//     }

//     // Clear cart
//     cart.items = [];
//     await cart.save();

//     res.status(200).json({
//       success: true,
//       message: 'Payment verified and order placed',
//       orderId: order.orderId,
//       orderNumber: order._id
//     });
//   } catch (err) {
//     console.error('Payment verification error:', err.message);
//     res.status(500).json({ 
//       success: false, 
//       message: `Payment verification failed: ${err.message}`
//     });
//   }
// };

// const calculateProportionalDiscount = (orderItems, totalDiscount) => {
//   console.log('📊 Calculating proportional discount');
  
//   const totalCartAmount = orderItems.reduce((sum, item) => sum + item.total, 0);
  
//   if (totalCartAmount === 0 || totalDiscount === 0) {
//     return orderItems;
//   }

//   let distributedItems = [];
//   let totalDistributedDiscount = 0;

//   orderItems.forEach((item, index) => {
//     const itemSubtotal = item.total;
//     const itemDiscount = (itemSubtotal * totalDiscount) / totalCartAmount;
    
//     const itemFinalSubtotal = itemSubtotal - itemDiscount;

//     distributedItems.push({
//       ...item,
//       originalPrice: item.price,
//       originalSubtotal: itemSubtotal,
//       discountApplied: Math.round(itemDiscount * 100) / 100,
//       discountPercentage: Math.round((itemDiscount / itemSubtotal) * 100 * 100) / 100,
//       finalSubtotal: Math.round(itemFinalSubtotal * 100) / 100,
//       finalPrice: Math.round((itemFinalSubtotal / item.quantity) * 100) / 100
//     });

//     totalDistributedDiscount += itemDiscount;
    
//     console.log(`  Item ${index + 1} (${item.productName}): 
//     Original: ₹${itemSubtotal.toFixed(2)}
//     Discount: ₹${itemDiscount.toFixed(2)}
//     Final: ₹${itemFinalSubtotal.toFixed(2)}`);
//   });

//   // Handle rounding difference
//   const diff = totalDiscount - totalDistributedDiscount;
//   if (Math.abs(diff) > 0.01) {
//     let maxIdx = 0;
//     distributedItems.forEach((item, idx) => {
//       if (item.originalSubtotal > distributedItems[maxIdx].originalSubtotal) {
//         maxIdx = idx;
//       }
//     });
    
//     const adjustment = Math.round(diff * 100) / 100;
//     distributedItems[maxIdx].discountApplied += adjustment;
//     distributedItems[maxIdx].finalSubtotal -= adjustment;
    
//     console.log(`  ✓ Rounding adjustment applied to item ${maxIdx + 1}: ₹${adjustment.toFixed(2)}`);
//   }

//   console.log(`✅ Proportional discount calculated: Total ₹${totalDiscount.toFixed(2)}`);
//   return distributedItems;
// };


// // const placeOrder = async (req, res) => {
// //   try {
// //     const userId = req.session.user?.id || req.session.user?._id;
// //     const { addressId, paymentMethod, couponCode } = req.body;

// //     console.log('📦 Placing order:', {
// //       userId,
// //       addressId,
// //       paymentMethod,
// //       couponCode
// //     });

// //     if (!mongoose.Types.ObjectId.isValid(userId)) {
// //       console.warn('placeOrder: Invalid user ID:', userId);
// //       return res.status(400).json({ success: false, message: 'Invalid user ID' });
// //     }

// //     if (!addressId || !mongoose.Types.ObjectId.isValid(addressId)) {
// //       return res.status(400).json({ success: false, message: 'Please select a valid delivery address' });
// //     }

// //     if (!paymentMethod) {
// //       return res.status(400).json({ success: false, message: 'Please select a payment method' });
// //     }

// //     let normalizedPaymentMethod;
// //     if (paymentMethod.toLowerCase() === 'cod') {
// //       normalizedPaymentMethod = 'COD';
// //     } else if (paymentMethod.toLowerCase() === 'wallet') {
// //       normalizedPaymentMethod = 'Wallet';
// //     } else {
// //       return res.status(400).json({ success: false, message: 'Invalid payment method' });
// //     }

// //     const cart = await Cart.findOne({ userId }).populate({
// //       path: 'items.productId',
// //       select: 'productName price salePrice variants stock',
// //     });

// //     if (!cart || cart.items.length === 0) {
// //       return res.status(400).json({ success: false, message: 'Your cart is empty' });
// //     }

// //     const addressDoc = await Address.findOne({ userId });
// //     if (!addressDoc) {
// //       return res.status(404).json({ success: false, message: 'Address not found' });
// //     }

// //     const deliveryAddress = addressDoc.address.find((addr) => addr._id.toString() === addressId);
// //     if (!deliveryAddress) {
// //       return res.status(404).json({ success: false, message: 'Selected address not found' });
// //     }

// //     for (const item of cart.items) {
// //       const product = item.productId;
// //       if (!product) {
// //         return res.status(400).json({ success: false, message: 'Some products are no longer available' });
// //       }

// //       const variant = product.variants?.find((v) => v.size === item.variantSize);
// //       const availableStock = variant?.stock ?? product.stock ?? 0;

// //       if (availableStock < item.quantity) {
// //         return res.status(400).json({
// //           success: false,
// //           message: `${product.productName} (${item.variantSize}) is out of stock`,
// //         });
// //       }
// //     }

// //     let subtotal = 0;
// //     let orderItems = [];

// //     for (const item of cart.items) {
// //       const product = item.productId;
// //       const variant = product.variants?.find((v) => v.size === item.variantSize);
// //       const price = variant?.salePrice || variant?.price || product.salePrice || product.price || 0;
// //       const itemTotal = price * item.quantity;
// //       subtotal += itemTotal;

// //       orderItems.push({
// //         product: product._id,
// //         productName: product.productName,
// //         variantSize: item.variantSize,
// //         quantity: item.quantity,
// //         price: price,
// //         total: itemTotal,
// //       });
// //     }

// //     // ✅ CALCULATE DISCOUNT FROM COUPON CODE
// //     let discount = 0;
// //     let couponApplied = false;
// //     let appliedCouponCode = null;
// //     let discountType = 'flat';

// //     if (couponCode) {
// //       console.log('🎟️ Applying coupon:', couponCode);
// //       const coupon = await Coupon.findOne({ 
// //         couponCode: couponCode.toUpperCase(),
// //         isListed: true
// //       });

// //       if (coupon) {
// //         console.log('✅ Coupon found:', coupon.couponCode);
        
// //         discountType = coupon.discountType || 'flat';
        
// //         // Calculate discount based on type
// //         if (coupon.discountType === 'percentage') {
// //           discount = (subtotal * coupon.discountPrice) / 100;
          
// //           // Apply max discount limit
// //           if (coupon.maxDiscountAmount > 0 && discount > coupon.maxDiscountAmount) {
// //             discount = coupon.maxDiscountAmount;
// //           }
// //         } else {
// //           // Flat discount
// //           discount = Math.min(coupon.discountPrice, subtotal);
// //         }

// //         discount = Math.round(discount * 100) / 100;
// //         couponApplied = true;
// //         appliedCouponCode = couponCode;
// //         console.log('💰 Discount calculated:', discount);
        
// //         if (discount > 0) {
// //     orderItems = calculateProportionalDiscount(orderItems, discount);
// //   }
// //       } else {
// //         console.log('❌ Coupon not found:', couponCode);
// //       }
// //     }

// //     const finalAmount = Math.max(subtotal - discount, 0);

// //     console.log('📊 Order amounts:', {
// //       subtotal,
// //       discount,
// //       finalAmount
// //     });


// //     // Wallet payment logic
// //     if (normalizedPaymentMethod === 'Wallet') {
// //       const wallet = await Wallet.findOne({ user: userId });
// //       if (!wallet) {
// //         return res.status(404).json({ success: false, message: 'Wallet not found' });
// //       }
// //       if (wallet.balance < finalAmount) {
// //         return res.status(400).json({
// //           success: false,
// //           message: `Insufficient wallet balance. Available: ₹${wallet.balance.toFixed(2)}, Required: ₹${finalAmount.toFixed(2)}`
// //         });
// //       }
// //       // Deduct amount from wallet
// //       wallet.balance -= finalAmount;
// //       wallet.transactions.push({
// //         type: 'debit',
// //         amount: finalAmount,
// //         description: 'Purchase',
// //         orderId: `order_${Date.now()}`,
// //         date: new Date(),
// //       });
// //       await wallet.save();
// //     }

// //     // Create order with discount
// //     const orderData = {
// //       user: userId,
// //       orderItems,
// //       totalPrice: subtotal,
// //       discount: discount,  // ✅ SAVE DISCOUNT
// //       finalAmount: finalAmount,
// //       deliveryAddress: {
// //         name: deliveryAddress.name,
// //         phone: deliveryAddress.phone,
// //         houseName: deliveryAddress.houseName,
// //         buildingNumber: deliveryAddress.buildingNumber,
// //         landmark: deliveryAddress.landmark,
// //         city: deliveryAddress.city,
// //         state: deliveryAddress.state,
// //         pincode: deliveryAddress.pincode,
// //         addressType: deliveryAddress.addressType,
// //       },
// //       paymentMethod: normalizedPaymentMethod,
// //       paymentStatus: normalizedPaymentMethod === 'COD' ? 'Pending' : 'Completed',
// //       couponApplied: couponApplied,
// //       couponCode: appliedCouponCode,
// //       status: 'Processing',
// //       createdOn: new Date(),
// //     };

// //     const order = new Order(orderData);
// //     await order.save();

// //     console.log('✅ Order saved with discount:', {
// //       orderId: order.orderId,
// //       discount: order.discount,
// //       finalAmount: order.finalAmount
// //     });

// //     for (const item of cart.items) {
// //       const product = await Product.findById(item.productId._id);
// //       if (product) {
// //         const variantIndex = product.variants?.findIndex((v) => v.size === item.variantSize);
// //         if (variantIndex !== -1 && product.variants[variantIndex]) {
// //           const updateField = `variants.${variantIndex}.stock`;
// //           await Product.findByIdAndUpdate(
// //             item.productId._id,
// //             { $inc: { [updateField]: -item.quantity } },
// //             { runValidators: false }
// //           );
// //         } else if (typeof product.stock === 'number') {
// //           await Product.findByIdAndUpdate(
// //             item.productId._id,
// //             { $inc: { stock: -item.quantity } },
// //             { runValidators: false }
// //           );
// //         }
// //       }
// //     }

// //     cart.items = [];
// //     await cart.save();

// //     console.log('Order placed successfully:', order.orderId);

// //     return res.status(200).json({
// //       success: true,
// //       message: 'Order placed successfully',
// //       orderId: order.orderId,
// //     });
// //   } catch (err) {
// //     console.error('Place order error:', err.message);
// //     return res.status(500).json({
// //       success: false,
// //       message: `Server error: ${err.message}`
// //     });
// //   }
// // };


// const placeOrder = async (req, res) => {
//   try {
//     const userId = req.session.user?.id || req.session.user?._id;
//     const { addressId, paymentMethod, couponCode } = req.body;

//     console.log('📦 Placing order:', {
//       userId: userId.toString(),
//       addressId,
//       paymentMethod,
//       couponCode
//     });

//     if (!mongoose.Types.ObjectId.isValid(userId)) {
//       console.warn('placeOrder: Invalid user ID:', userId);
//       return res.status(400).json({ success: false, message: 'Invalid user ID' });
//     }

//     if (!addressId || !mongoose.Types.ObjectId.isValid(addressId)) {
//       return res.status(400).json({ success: false, message: 'Please select a valid delivery address' });
//     }

//     if (!paymentMethod) {
//       return res.status(400).json({ success: false, message: 'Please select a payment method' });
//     }

//     let normalizedPaymentMethod;
//     let isPaymentSync = true; // Flag for sync payments (COD, Wallet, etc.)

//     if (paymentMethod.toLowerCase() === 'cod') {
//       normalizedPaymentMethod = 'COD';
//     } else if (paymentMethod.toLowerCase() === 'wallet') {
//       normalizedPaymentMethod = 'Wallet';
//     } else if (paymentMethod.toLowerCase() === 'online' || paymentMethod.toLowerCase() === 'razorpay' || paymentMethod.toLowerCase() === 'card') {
//       normalizedPaymentMethod = 'ONLINE';
//       isPaymentSync = false; // Async - record usage later via webhook
//       console.log('⚠️ Async payment detected:', normalizedPaymentMethod + '. Deferring coupon usage to payment callback.');
//     } else {
//       // Fallback for any other method - treat as sync
//       normalizedPaymentMethod = paymentMethod.toUpperCase();
//       console.log('ℹ️ Unknown payment method treated as sync:', normalizedPaymentMethod);
//     }

//     const cart = await Cart.findOne({ userId }).populate({
//       path: 'items.productId',
//       select: 'productName price salePrice variants stock',
//     });

//     if (!cart || cart.items.length === 0) {
//       return res.status(400).json({ success: false, message: 'Your cart is empty' });
//     }

//     const addressDoc = await Address.findOne({ userId });
//     if (!addressDoc) {
//       return res.status(404).json({ success: false, message: 'Address not found' });
//     }

//     const deliveryAddress = addressDoc.address.find((addr) => addr._id.toString() === addressId);
//     if (!deliveryAddress) {
//       return res.status(404).json({ success: false, message: 'Selected address not found' });
//     }

//     // Stock check loop (unchanged)
//     for (const item of cart.items) {
//       const product = item.productId;
//       if (!product) {
//         return res.status(400).json({ success: false, message: 'Some products are no longer available' });
//       }

//       const variant = product.variants?.find((v) => v.size === item.variantSize);
//       const availableStock = variant?.stock ?? product.stock ?? 0;

//       if (availableStock < item.quantity) {
//         return res.status(400).json({
//           success: false,
//           message: `${product.productName} (${item.variantSize}) is out of stock`,
//         });
//       }
//     }

//     let subtotal = 0;
//     let orderItems = [];

//     // Build orderItems & subtotal (unchanged)
//     for (const item of cart.items) {
//       const product = item.productId;
//       const variant = product.variants?.find((v) => v.size === item.variantSize);
//       const price = variant?.salePrice || variant?.price || product.salePrice || product.price || 0;
//       const itemTotal = price * item.quantity;
//       subtotal += itemTotal;

//       orderItems.push({
//         product: product._id,
//         productName: product.productName,
//         variantSize: item.variantSize,
//         quantity: item.quantity,
//         price: price,
//         total: itemTotal,
//       });
//     }

//     // Coupon validation & discount calculation (unchanged, but log method)
//     let discount = 0;
//     let couponApplied = false;
//     let appliedCouponCode = null;
//     let discountType = 'flat';
//     let coupon = null;

//     if (couponCode) {
//       console.log('🎟️ Validating coupon for payment:', normalizedPaymentMethod);
//       coupon = await Coupon.findOne({ 
//         couponCode: couponCode.toUpperCase(),
//         isListed: true
//       }).populate('appliedUsers.userId');

//       if (coupon) {
//         // ... (unchanged: date, min, limit, once validations)

//         // Calculate discount (unchanged)
//         // ...

//         discount = Math.round(discount * 100) / 100;
//         couponApplied = discount > 0;
//         appliedCouponCode = couponCode;
//         console.log('💰 Discount OK for', normalizedPaymentMethod + ':', discount);
//       } else {
//         return res.status(400).json({ success: false, message: 'Invalid coupon code' });
//       }
//     }

//     if (couponApplied && discount > 0) {
//       orderItems = calculateProportionalDiscount(orderItems, discount);
//     }

//     const finalAmount = Math.max(subtotal - discount, 0);

//     console.log('📊 Amounts for ' + normalizedPaymentMethod + ':', { subtotal, discount, finalAmount });

//     // ✅ Handle SYNC payments (Wallet/COD) - Deduct/Validate before order
//     if (normalizedPaymentMethod === 'Wallet' && isPaymentSync) {
//       const wallet = await Wallet.findOne({ user: userId });
//       if (!wallet) {
//         return res.status(404).json({ success: false, message: 'Wallet not found' });
//       }
//       if (wallet.balance < finalAmount) {
//         return res.status(400).json({
//           success: false,
//           message: `Insufficient wallet balance. Available: ₹${wallet.balance.toFixed(2)}, Required: ₹${finalAmount.toFixed(2)}`
//         });
//       }
//       // Deduct
//       wallet.balance -= finalAmount;
//       wallet.transactions.push({
//         type: 'debit',
//         amount: finalAmount,
//         description: 'Purchase',
//         orderId: `temp_${Date.now()}`, // Temp - update after order save if needed
//         date: new Date(),
//       });
//       await wallet.save();
//       console.log('💳 Wallet deducted for ' + normalizedPaymentMethod + ': ₹' + finalAmount.toFixed(2));
//     }

//     // For COD - no deduction needed

//     // For ASYNC (e.g., ONLINE) - Create order as Pending, return payment intent
//     let orderStatus = 'Processing';
//     let paymentStatus = isPaymentSync ? 'Completed' : 'Pending';

//     const orderData = {
//       user: userId,
//       orderItems,
//       totalPrice: subtotal,
//       discount: discount,
//       finalAmount: finalAmount,
//       deliveryAddress: { /* unchanged */ },
//       paymentMethod: normalizedPaymentMethod,
//       paymentStatus: paymentStatus,
//       couponApplied: couponApplied,
//       couponCode: appliedCouponCode,
//       status: orderStatus,
//       createdOn: new Date(),
//     };

//     const order = new Order(orderData);
//     await order.save();

//     console.log('✅ Order saved for ' + normalizedPaymentMethod + ':', {
//       orderId: order.orderId,
//       paymentStatus: paymentStatus,
//       isSync: isPaymentSync
//     });

//     // ✅ RECORD USAGE IMMEDIATELY FOR SYNC PAYMENTS ONLY
//     if (couponApplied && coupon && isPaymentSync) {
//       await recordCouponUsageInternal(coupon, userId, order._id);
//       console.log('✅ Usage recorded immediately for sync payment:', normalizedPaymentMethod);
//     } else if (!isPaymentSync && couponApplied) {
//       console.log('⏳ Usage deferred for async payment:', normalizedPaymentMethod + '. Handle in payment callback.');
//       // Store couponId in order for later (add field if needed: order.pendingCouponId = coupon._id;)
//     }

//     // For ASYNC: Return payment details (e.g., Razorpay order ID)
//     if (!isPaymentSync) {
//       // Example: Generate Razorpay order - integrate your payment lib here
//       // const razorpayOrder = await createRazorpayOrder(finalAmount, order._id);
//       // return res.json({ success: true, razorpayOrder, orderId: order.orderId });
//     }

//     // Update stock & clear cart (unchanged, but after order save)
//     // ... (stock update loop)
//     cart.items = [];
//     await cart.save();

//     console.log('Order placed successfully via ' + normalizedPaymentMethod + ':', order.orderId);

//     return res.status(200).json({
//       success: true,
//       message: 'Order placed successfully',
//       orderId: order.orderId,
//       paymentStatus: paymentStatus, // For frontend to handle async
//     });
//   } catch (err) {
//     console.error('Place order error:', err.message);
//     return res.status(500).json({
//       success: false,
//       message: `Server error: ${err.message}`
//     });
//   }
// };

// // ✅ NEW: Internal helper for coupon usage recording (reusable for sync/async)
// async function recordCouponUsageInternal(coupon, userId, orderId) {
//   try {
//     console.log('📝 Internal recording usage:', {
//       couponCode: coupon.couponCode,
//       currentUsed: coupon.used || 0,
//       userId: userId.toString(),
//       orderId: orderId.toString()
//     });

//     const userObjectId = new mongoose.Types.ObjectId(userId);
//     const orderObjectId = new mongoose.Types.ObjectId(orderId);

//     coupon.appliedUsers.push({
//       userId: userObjectId,
//       orderId: orderObjectId,
//       appliedDate: new Date()
//     });

//     coupon.markModified('appliedUsers');

//     const savedCoupon = await coupon.save();

//     console.log('✅ Internal usage recorded!', {
//       newUsed: savedCoupon.used || 0,
//       total: `${savedCoupon.used || 0}/${savedCoupon.limit}`
//     });

//     return savedCoupon;
//   } catch (usageError) {
//     console.error('❌ Internal usage recording failed:', usageError);
//     throw usageError; // Re-throw for caller handling
//   }
// }


// // Example payment success handler
// const handlePaymentSuccess = async (req, res) => {
//   try {
//     const { orderId, paymentId } = req.body; // From webhook/payload
//     const order = await Order.findById(orderId);

//     if (!order || order.paymentStatus === 'Completed') {
//       return res.status(400).json({ success: false, message: 'Invalid order' });
//     }

//     // Update order
//     order.paymentStatus = 'Completed';
//     order.status = 'Processing';
//     await order.save();

//     // Record coupon if pending
//     if (order.couponApplied && order.couponCode) {
//       const coupon = await Coupon.findOne({ couponCode: order.couponCode.toUpperCase() });
//       if (coupon && order.user.toString() !== undefined) {
//         await recordCouponUsageInternal(coupon, order.user, order._id);
//         console.log('✅ Deferred usage recorded on payment success');
//       }
//     }

//     res.json({ success: true, message: 'Payment confirmed' });
//   } catch (err) {
//     console.error('Payment success error:', err);
//     res.status(500).json({ success: false });
//   }
// };



// const getOrderFailure = async (req, res) => {
//   try {
//     const { 
//       transactionId = 'N/A',
//       errorReason = 'Transaction declined by your bank',
//       paymentMethod = 'Card',
//       amount = '₹0'
//     } = req.query;

//     const now = new Date();
//     const date = now.toLocaleDateString('en-IN', { 
//       year: 'numeric', 
//       month: 'short', 
//       day: 'numeric' 
//     });
//     const time = now.toLocaleTimeString('en-IN');

//     res.render('orderFailure', {
//       transactionId,
//       errorReason,
//       paymentMethod,
//       amount,
//       date,
//       time
//     });
//   } catch (error) {
//     res.redirect('/pageNotFound');
//   }
// };

// module.exports = {
//   checkAuth,           
//   createRazorpayOrder,
//   verifyRazorpayPayment,
//   placeOrder,
//   getOrderFailure,
//   handlePaymentSuccess
// };











const Razorpay = require('razorpay');
const crypto = require('crypto');
const mongoose = require('mongoose');
const Cart = require('../../models/cartSchema');
const Address = require('../../models/addressSchema');
const Product = require('../../models/productSchema');
const Order = require('../../models/orderSchema');
const Wallet = require('../../models/walletSchema');
const Coupon = require('../../models/couponSchema');
const User = require('../../models/userSchema');



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

// const verifyRazorpayPayment = async (req, res) => {
//   try {
//     console.log('verifyRazorpayPayment - Request body:', req.body);
//     const { 
//       razorpay_order_id, 
//       razorpay_payment_id, 
//       razorpay_signature,
//       addressId,
//       couponCode  // ✅ RECEIVE COUPON CODE
//     } = req.body;

//     const userId = req.session.user?.id || req.session.user?._id;

//     if (!userId || !mongoose.Types.ObjectId.isValid(userId)) {
//       console.warn('verifyRazorpayPayment: Invalid or missing userId:', userId);
//       return res.status(401).json({ success: false, message: 'User not authenticated' });
//     }

//     // Verify signature
//     const body = razorpay_order_id + '|' + razorpay_payment_id;
//     const expectedSignature = crypto
//       .createHmac('sha256', process.env.RAZORPAY_KEY_SECRET)
//       .update(body)
//       .digest('hex');

//     if (expectedSignature !== razorpay_signature) {
//       console.warn('Razorpay signature verification failed');
//       return res.status(400).json({ 
//         success: false, 
//         message: 'Payment verification failed: Invalid signature'
//       });
//     }

//     const cart = await Cart.findOne({ userId }).populate({
//       path: 'items.productId',
//       select: 'productName price salePrice variants stock'
//     });

//     if (!cart || cart.items.length === 0) {
//       return res.status(400).json({ success: false, message: 'Cart is empty' });
//     }

//     let subtotal = 0;
//     const orderItems = [];

//     for (const item of cart.items) {
//       const product = item.productId;
//       if (!product) {
//         return res.status(400).json({ success: false, message: 'Product not found' });
//       }

//       const variant = product.variants?.find(v => v.size === item.variantSize);
//       const availableStock = variant?.stock ?? product.stock ?? 0;

//       if (availableStock < item.quantity) {
//         return res.status(400).json({
//           success: false,
//           message: `${product.productName} is out of stock`
//         });
//       }

//       const price = variant?.salePrice || variant?.price || product.salePrice || product.price || 0;
//       const itemTotal = price * item.quantity;
//       subtotal += itemTotal;

//       orderItems.push({
//         product: product._id,
//         productName: product.productName,
//         variantSize: item.variantSize,
//         quantity: item.quantity,
//         price: price,
//         total: itemTotal
//       });
//     }

//     const addressDoc = await Address.findOne({ userId });
//     const deliveryAddress = addressDoc?.address.find(addr => addr._id.toString() === addressId);

//     if (!deliveryAddress) {
//       return res.status(404).json({ success: false, message: 'Address not found' });
//     }

//     // ✅ UPDATED: FULL COUPON VALIDATION & DISCOUNT CALCULATION (like in placeOrder)
//     let discount = 0;
//     let couponApplied = false;
//     let appliedCouponCode = null;
//     let discountType = 'flat';
//     let coupon = null; // Store for usage recording

//     if (couponCode) {
//       console.log('🎟️ Validating and applying coupon in Razorpay verification:', couponCode);
//       coupon = await Coupon.findOne({ 
//         couponCode: couponCode.toUpperCase(),
//         isListed: true
//       }).populate('appliedUsers.userId'); // For once-type check

//       if (coupon) {
//         console.log('✅ Coupon found in Razorpay:', coupon.couponCode, 'Current used:', coupon.used || 0);
        
//         // Full validation (dates, min purchase, usage limits)
//         const today = new Date();
//         today.setHours(0, 0, 0, 0);
//         const expireDate = new Date(coupon.expireDate);
//         expireDate.setHours(0, 0, 0, 0);
//         const activeDate = new Date(coupon.activeDate);
//         activeDate.setHours(0, 0, 0, 0);

//         if (expireDate < today) {
//           return res.status(400).json({ success: false, message: 'This coupon has expired' });
//         }
        
//         if (activeDate > today) {
//           return res.status(400).json({ 
//             success: false, 
//             message: `This coupon will be active from ${activeDate.toLocaleDateString()}` 
//           });
//         }

//         if (subtotal < coupon.minimumPrice) {
//           return res.status(400).json({
//             success: false,
//             message: `Minimum purchase of ₹${coupon.minimumPrice} required`
//           });
//         }

//         const usageCount = coupon.used || 0;
//         if (usageCount >= coupon.limit) {
//           return res.status(400).json({ success: false, message: 'This coupon has reached its usage limit' });
//         }

//         if (coupon.usageType === 'once') {
//           const userHasUsed = coupon.appliedUsers?.some(
//             applied => applied.userId && applied.userId._id.toString() === userId.toString()
//           );
//           if (userHasUsed) {
//             return res.status(400).json({ success: false, message: 'You have already used this coupon' });
//           }
//         }

//         // Calculate discount based on type
//         discountType = coupon.discountType || 'flat';
        
//         if (coupon.discountType === 'percentage') {
//           discount = (subtotal * coupon.discountPrice) / 100;
          
//           // Apply max discount limit
//           if (coupon.maxDiscountAmount > 0 && discount > coupon.maxDiscountAmount) {
//             discount = coupon.maxDiscountAmount;
//           }
//         } else {
//           // Flat discount
//           discount = Math.min(coupon.discountPrice, subtotal);
//         }

//         discount = Math.round(discount * 100) / 100;
//         couponApplied = discount > 0;
//         appliedCouponCode = couponCode;
//         console.log('💰 Discount calculated in Razorpay:', discount);
//       } else {
//         console.log('❌ Coupon not found in Razorpay:', couponCode);
//         return res.status(400).json({ success: false, message: 'Invalid coupon code' });
//       }
//     }

//     const finalAmount = Math.max(subtotal - discount, 0);

//     console.log('📊 Order amounts in Razorpay:', {
//       subtotal,
//       discount,
//       finalAmount
//     });

//     // ✅ NEW: Calculate proportional discount for each item
//     let finalOrderItems = orderItems;
//     if (couponApplied && discount > 0) {
//       finalOrderItems = calculateProportionalDiscount(orderItems, discount);
//     }

//     // Create order with discount
//     const orderData = {
//       user: userId,
//       orderItems: finalOrderItems,  // ✅ USE ITEMS WITH DISCOUNT INFO
//       totalPrice: subtotal,
//       discount: discount,
//       finalAmount: finalAmount,
//       deliveryAddress: {
//         name: deliveryAddress.name,
//         phone: deliveryAddress.phone,
//         houseName: deliveryAddress.houseName,
//         buildingNumber: deliveryAddress.buildingNumber,
//         landmark: deliveryAddress.landmark,
//         city: deliveryAddress.city,
//         state: deliveryAddress.state,
//         pincode: deliveryAddress.pincode,
//         addressType: deliveryAddress.addressType
//       },
//       paymentMethod: 'Online Payment',
//       paymentStatus: 'Completed',
//       couponApplied: couponApplied,
//       couponCode: appliedCouponCode,
//       status: 'Processing',
//       createdOn: new Date(),
//       razorpayPaymentId: razorpay_payment_id,
//       razorpayOrderId: razorpay_order_id
//     };

//     const order = new Order(orderData);
//     await order.save();

//     console.log('✅ Order saved with discount in Razorpay:', {
//       orderId: order.orderId,
//       discount: order.discount,
//       finalAmount: order.finalAmount
//     });

//     // ✅ UPDATED: RECORD COUPON USAGE AFTER ORDER CREATION (for Razorpay success)
//     if (couponApplied && coupon) {
//       try {
//         console.log('📝 Recording coupon usage for Razorpay:', {
//           couponCode: coupon.couponCode,
//           currentUsed: coupon.used || 0,
//           userId: userId.toString(),
//           orderId: order._id.toString()
//         });

//         // Cast to ObjectId for safety
//         const userObjectId = new mongoose.Types.ObjectId(userId);
//         const orderObjectId = new mongoose.Types.ObjectId(order._id);

//         // Push subdoc
//         coupon.appliedUsers.push({
//           userId: userObjectId,
//           orderId: orderObjectId,
//           appliedDate: new Date()  // Matches schema field
//         });

//         // Explicitly mark array as modified
//         coupon.markModified('appliedUsers');

//         // Save
//         const savedCoupon = await coupon.save();

//         console.log('✅ Coupon usage RECORDED for Razorpay!', {
//           newUsed: savedCoupon.used || 0,
//           total: `${savedCoupon.used || 0}/${savedCoupon.limit}`,
//           appliedUsersLength: savedCoupon.appliedUsers.length
//         });

//       } catch (usageError) {
//         console.error('❌ ERROR recording coupon usage for Razorpay:', usageError.message);
//         console.error('Full usage error:', usageError);
//         // Log but don't fail response - order is still valid
//       }
//     }

//     // Update product stock
//     for (const item of cart.items) {
//       const product = await Product.findById(item.productId._id);
//       if (product) {
//         const variantIndex = product.variants?.findIndex(v => v.size === item.variantSize);
//         if (variantIndex !== -1 && product.variants[variantIndex]) {
//           const updateField = `variants.${variantIndex}.stock`;
//           await Product.findByIdAndUpdate(
//             item.productId._id,
//             { $inc: { [updateField]: -item.quantity } },
//             { runValidators: false }
//           );
//         } else {
//           await Product.findByIdAndUpdate(
//             item.productId._id,
//             { $inc: { stock: -item.quantity } },
//             { runValidators: false }
//           );
//         }
//       }
//     }

//     // Clear cart
//     cart.items = [];
//     await cart.save();

//     res.status(200).json({
//       success: true,
//       message: 'Payment verified and order placed',
//       orderId: order.orderId,
//       orderNumber: order._id
//     });
//   } catch (err) {
//     console.error('Payment verification error:', err.message);
//     res.status(500).json({ 
//       success: false, 
//       message: `Payment verification failed: ${err.message}`
//     });
//   }
// };



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
      console.warn('Razorpay signature verification failed');
      return res.status(400).json({ 
        success: false, 
        message: 'Payment verification failed: Invalid signature'
      });
    }

    const cart = await Cart.findOne({ userId }).populate({
      path: 'items.productId',
      select: 'productName price salePrice variants stock'
    });

    if (!cart || cart.items.length === 0) {
      return res.status(400).json({ success: false, message: 'Cart is empty' });
    }

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

    const addressDoc = await Address.findOne({ userId });
    const deliveryAddress = addressDoc?.address.find(addr => addr._id.toString() === addressId);

    if (!deliveryAddress) {
      return res.status(404).json({ success: false, message: 'Address not found' });
    }

    // Handle coupon discount
    let discount = 0;
    let couponApplied = false;
    let appliedCouponCode = null;

    if (couponCode) {
      console.log('🎟️ Validating coupon:', couponCode);
      const coupon = await Coupon.findOne({ 
        couponCode: couponCode.toUpperCase(),
        isListed: true
      }).populate('appliedUsers.userId');

      if (coupon) {
        // Full validation - dates, min, limit, once
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

        if (subtotal < coupon.minimumPrice) {
          return res.status(400).json({
            success: false,
            message: `Minimum purchase of ₹${coupon.minimumPrice} required`
          });
        }

        const usageCount = coupon.used || 0;
        if (usageCount >= coupon.limit) {
          return res.status(400).json({ success: false, message: 'This coupon has reached its usage limit' });
        }

        if (coupon.usageType === 'once') {
          const userHasUsed = coupon.appliedUsers?.some(
            applied => applied.userId && applied.userId._id.toString() === userId.toString()
          );
          if (userHasUsed) {
            return res.status(400).json({ success: false, message: 'You have already used this coupon' });
          }
        }

        // Calculate discount
        if (coupon.discountType === 'percentage') {
          discount = (subtotal * coupon.discountPrice) / 100;
          
          if (coupon.maxDiscountAmount > 0 && discount > coupon.maxDiscountAmount) {
            discount = coupon.maxDiscountAmount;
          }
        } else {
          discount = Math.min(coupon.discountPrice, subtotal);
        }

        discount = Math.round(discount * 100) / 100;
        couponApplied = discount > 0;
        appliedCouponCode = couponCode;
        console.log('💰 Discount applied:', discount);
      } else {
        return res.status(400).json({ success: false, message: 'Invalid coupon code' });
      }
    }

    const finalAmount = Math.max(subtotal - discount, 0);

    console.log('📊 Order amounts:', { subtotal, discount, finalAmount });

    // Create order
    const orderData = {
      user: userId,
      orderItems: orderItems,
      totalPrice: subtotal,
      discount: discount,
      finalAmount: finalAmount,
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
      couponApplied: couponApplied,
      couponCode: appliedCouponCode,
      status: 'Processing',
      createdOn: new Date(),
      razorpayPaymentId: razorpay_payment_id,
      razorpayOrderId: razorpay_order_id
    };

    const order = new Order(orderData);
    await order.save();

    console.log('✅ Order saved:', order._id);

    // ========== ✅ CALL REFERRAL PROCESSING FUNCTION ==========
    await processReferralReward(userId, order._id, finalAmount);

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
    console.error('Payment verification error:', err.message);
    res.status(500).json({ 
      success: false, 
      message: `Payment verification failed: ${err.message}`
    });
  }
};

const calculateProportionalDiscount = (orderItems, totalDiscount) => {
  console.log('📊 Calculating proportional discount');
  
  const totalCartAmount = orderItems.reduce((sum, item) => sum + item.total, 0);
  
  if (totalCartAmount === 0 || totalDiscount === 0) {
    return orderItems;
  }

  let distributedItems = [];
  let totalDistributedDiscount = 0;

  orderItems.forEach((item, index) => {
    const itemSubtotal = item.total;
    const itemDiscount = (itemSubtotal * totalDiscount) / totalCartAmount;
    
    const itemFinalSubtotal = itemSubtotal - itemDiscount;

    distributedItems.push({
      ...item,
      originalPrice: item.price,
      originalSubtotal: itemSubtotal,
      discountApplied: Math.round(itemDiscount * 100) / 100,
      discountPercentage: Math.round((itemDiscount / itemSubtotal) * 100 * 100) / 100,
      finalSubtotal: Math.round(itemFinalSubtotal * 100) / 100,
      finalPrice: Math.round((itemFinalSubtotal / item.quantity) * 100) / 100
    });

    totalDistributedDiscount += itemDiscount;
    
    console.log(`  Item ${index + 1} (${item.productName}): 
    Original: ₹${itemSubtotal.toFixed(2)}
    Discount: ₹${itemDiscount.toFixed(2)}
    Final: ₹${itemFinalSubtotal.toFixed(2)}`);
  });

  // Handle rounding difference
  const diff = totalDiscount - totalDistributedDiscount;
  if (Math.abs(diff) > 0.01) {
    let maxIdx = 0;
    distributedItems.forEach((item, idx) => {
      if (item.originalSubtotal > distributedItems[maxIdx].originalSubtotal) {
        maxIdx = idx;
      }
    });
    
    const adjustment = Math.round(diff * 100) / 100;
    distributedItems[maxIdx].discountApplied += adjustment;
    distributedItems[maxIdx].finalSubtotal -= adjustment;
    
    console.log(`  ✓ Rounding adjustment applied to item ${maxIdx + 1}: ₹${adjustment.toFixed(2)}`);
  }

  console.log(`✅ Proportional discount calculated: Total ₹${totalDiscount.toFixed(2)}`);
  return distributedItems;
};



// const placeOrder = async (req, res) => {
//   try {
//     const userId = req.session.user?.id || req.session.user?._id;
//     const { addressId, paymentMethod, couponCode } = req.body;

//     console.log('📦 Placing order (SYNC):', {
//       userId: userId.toString(),
//       addressId,
//       paymentMethod,
//       couponCode
//     });

//     if (!mongoose.Types.ObjectId.isValid(userId)) {
//       console.warn('placeOrder: Invalid user ID:', userId);
//       return res.status(400).json({ success: false, message: 'Invalid user ID' });
//     }

//     if (!addressId || !mongoose.Types.ObjectId.isValid(addressId)) {
//       return res.status(400).json({ success: false, message: 'Please select a valid delivery address' });
//     }

//     if (!paymentMethod) {
//       return res.status(400).json({ success: false, message: 'Please select a payment method' });
//     }

//     let normalizedPaymentMethod;
//     if (paymentMethod.toLowerCase() === 'cod') {
//       normalizedPaymentMethod = 'COD';
//     } else if (paymentMethod.toLowerCase() === 'wallet') {
//       normalizedPaymentMethod = 'Wallet';
//     } else {
//       return res.status(400).json({ success: false, message: 'Invalid payment method for sync order' });
//     }

//     const cart = await Cart.findOne({ userId }).populate({
//       path: 'items.productId',
//       select: 'productName price salePrice variants stock',
//     });

//     if (!cart || cart.items.length === 0) {
//       return res.status(400).json({ success: false, message: 'Your cart is empty' });
//     }

//     const addressDoc = await Address.findOne({ userId });
//     if (!addressDoc) {
//       return res.status(404).json({ success: false, message: 'Address not found' });
//     }

//     const deliveryAddress = addressDoc.address.find((addr) => addr._id.toString() === addressId);
//     if (!deliveryAddress) {
//       return res.status(404).json({ success: false, message: 'Selected address not found' });
//     }

//     // Stock check (unchanged)
//     for (const item of cart.items) {
//       const product = item.productId;
//       if (!product) {
//         return res.status(400).json({ success: false, message: 'Some products are no longer available' });
//       }

//       const variant = product.variants?.find((v) => v.size === item.variantSize);
//       const availableStock = variant?.stock ?? product.stock ?? 0;

//       if (availableStock < item.quantity) {
//         return res.status(400).json({
//           success: false,
//           message: `${product.productName} (${item.variantSize}) is out of stock`,
//         });
//       }
//     }

//     let subtotal = 0;
//     let orderItems = [];

//     // Build orderItems & subtotal (unchanged)
//     for (const item of cart.items) {
//       const product = item.productId;
//       const variant = product.variants?.find((v) => v.size === item.variantSize);
//       const price = variant?.salePrice || variant?.price || product.salePrice || product.price || 0;
//       const itemTotal = price * item.quantity;
//       subtotal += itemTotal;

//       orderItems.push({
//         product: product._id,
//         productName: product.productName,
//         variantSize: item.variantSize,
//         quantity: item.quantity,
//         price: price,
//         total: itemTotal,
//       });
//     }

//     // ✅ FULL COUPON VALIDATION & DISCOUNT (same as Razorpay)
//     let discount = 0;
//     let couponApplied = false;
//     let appliedCouponCode = null;
//     let discountType = 'flat';
//     let coupon = null;

//     if (couponCode) {
//       console.log('🎟️ Validating coupon for sync payment:', normalizedPaymentMethod);
//       coupon = await Coupon.findOne({ 
//         couponCode: couponCode.toUpperCase(),
//         isListed: true
//       }).populate('appliedUsers.userId');

//       if (coupon) {
//         // Full validation (dates, min, limit, once - unchanged from previous)
//         const today = new Date();
//         today.setHours(0, 0, 0, 0);
//         const expireDate = new Date(coupon.expireDate);
//         expireDate.setHours(0, 0, 0, 0);
//         const activeDate = new Date(coupon.activeDate);
//         activeDate.setHours(0, 0, 0, 0);

//         if (expireDate < today) {
//           return res.status(400).json({ success: false, message: 'This coupon has expired' });
//         }
        
//         if (activeDate > today) {
//           return res.status(400).json({ 
//             success: false, 
//             message: `This coupon will be active from ${activeDate.toLocaleDateString()}` 
//           });
//         }

//         if (subtotal < coupon.minimumPrice) {
//           return res.status(400).json({
//             success: false,
//             message: `Minimum purchase of ₹${coupon.minimumPrice} required`
//           });
//         }

//         const usageCount = coupon.used || 0;
//         if (usageCount >= coupon.limit) {
//           return res.status(400).json({ success: false, message: 'This coupon has reached its usage limit' });
//         }

//         if (coupon.usageType === 'once') {
//           const userHasUsed = coupon.appliedUsers?.some(
//             applied => applied.userId && applied.userId._id.toString() === userId.toString()
//           );
//           if (userHasUsed) {
//             return res.status(400).json({ success: false, message: 'You have already used this coupon' });
//           }
//         }

//         // Calculate discount (unchanged)
//         discountType = coupon.discountType || 'flat';
        
//         if (coupon.discountType === 'percentage') {
//           discount = (subtotal * coupon.discountPrice) / 100;
          
//           if (coupon.maxDiscountAmount > 0 && discount > coupon.maxDiscountAmount) {
//             discount = coupon.maxDiscountAmount;
//           }
//         } else {
//           discount = Math.min(coupon.discountPrice, subtotal);
//         }

//         discount = Math.round(discount * 100) / 100;
//         couponApplied = discount > 0;
//         appliedCouponCode = couponCode;
//         console.log('💰 Discount OK for', normalizedPaymentMethod + ':', discount);
//       } else {
//         return res.status(400).json({ success: false, message: 'Invalid coupon code' });
//       }
//     }

//     if (couponApplied && discount > 0) {
//       orderItems = calculateProportionalDiscount(orderItems, discount);
//     }

//     const finalAmount = Math.max(subtotal - discount, 0);

//     console.log('📊 Amounts for ' + normalizedPaymentMethod + ':', { subtotal, discount, finalAmount });

//     // Handle Wallet (unchanged)
//     if (normalizedPaymentMethod === 'Wallet') {
//       const wallet = await Wallet.findOne({ user: userId });
//       if (!wallet) {
//         return res.status(404).json({ success: false, message: 'Wallet not found' });
//       }
//       if (wallet.balance < finalAmount) {
//         return res.status(400).json({
//           success: false,
//           message: `Insufficient wallet balance. Available: ₹${wallet.balance.toFixed(2)}, Required: ₹${finalAmount.toFixed(2)}`
//         });
//       }
//       // Deduct
//       wallet.balance -= finalAmount;
//       wallet.transactions.push({
//         type: 'debit',
//         amount: finalAmount,
//         description: 'Purchase',
//         orderId: `temp_${Date.now()}`,
//         date: new Date(),
//       });
//       await wallet.save();
//       console.log('💳 Wallet deducted for ' + normalizedPaymentMethod + ': ₹' + finalAmount.toFixed(2));
//     }

//     // Create order (unchanged, paymentStatus 'Completed' for sync)
//     const orderData = {
//       user: userId,
//       orderItems,
//       totalPrice: subtotal,
//       discount: discount,
//       finalAmount: finalAmount,
//       deliveryAddress: {
//         name: deliveryAddress.name,
//         phone: deliveryAddress.phone,
//         houseName: deliveryAddress.houseName,
//         buildingNumber: deliveryAddress.buildingNumber,
//         landmark: deliveryAddress.landmark,
//         city: deliveryAddress.city,
//         state: deliveryAddress.state,
//         pincode: deliveryAddress.pincode,
//         addressType: deliveryAddress.addressType,
//       },
//       paymentMethod: normalizedPaymentMethod,
//       paymentStatus: 'Completed',
//       couponApplied: couponApplied,
//       couponCode: appliedCouponCode,
//       status: 'Processing',
//       createdOn: new Date(),
//     };

//     const order = new Order(orderData);
//     await order.save();

//     console.log('✅ Order saved for sync ' + normalizedPaymentMethod + ':', {
//       orderId: order.orderId,
//       paymentStatus: 'Completed'
//     });


// if (finalAmount >= 1000) {
//   try {
//     console.log('🎁 Processing referral reward for order:', order._id);
    
//     const referredUser = await User.findById(userId).select('redeemed');
    
//     if (referredUser && referredUser.redeemed) {
//       const referrer = await User.findOne({
//         redeemedUsers: { $in: [userId] }
//       });

//       if (referrer) {
//         const previousOrder = await Order.findOne({
//           user: userId,
//           _id: { $ne: order._id },
//           paymentStatus: 'Completed',
//           finalAmount: { $gte: 1000 }
//         });

//         if (!previousOrder) {
//           // Credit Referrer ₹100 (already credited on signup, but document it)
//           let referrerWallet = await Wallet.findOne({ user: referrer._id });
//           if (!referrerWallet) {
//             referrerWallet = new Wallet({ user: referrer._id });
//           }
          
//           // Log transaction
//           referrerWallet.transactions.push({
//             type: 'credit',
//             amount: 0, // No new credit (already given at signup)
//             description: 'Referral',
//             reason: `${referredUser.name} completed first order (reward already credited at signup)`,
//             orderId: order._id.toString(),
//             date: new Date(),
//           });
//           await referrerWallet.save();

//           // Credit Referee ₹50
//           let refereeWallet = await Wallet.findOne({ user: userId });
//           if (!refereeWallet) {
//             refereeWallet = new Wallet({ user: userId });
//           }
          
//           refereeWallet.balance += 50;
//           refereeWallet.transactions.push({
//             type: 'credit',
//             amount: 50,
//             description: 'Referral',
//             reason: 'Bonus for completing first order ≥ ₹1000 using referral code',
//             orderId: order._id.toString(),
//             date: new Date(),
//           });
          
//           await refereeWallet.save();
//           console.log(`✅ Referee credited ₹50 for completing order`);
//         }
//       }
//     }
//   } catch (referralError) {
//     console.error('⚠️ Error processing referral reward:', referralError.message);
//   }
// }

//     // ✅ RECORD USAGE FOR SYNC (using internal helper)
//     if (couponApplied && coupon) {
//       try {
//         await recordCouponUsageInternal(coupon, userId, order._id);
//         console.log('✅ Usage recorded for sync payment:', normalizedPaymentMethod);
//       } catch (usageError) {
//         console.error('❌ Usage recording failed for sync:', usageError.message);
//       }
//     }

//     // Update stock & clear cart (unchanged)
//     for (const item of cart.items) {
//       const product = await Product.findById(item.productId._id);
//       if (product) {
//         const variantIndex = product.variants?.findIndex((v) => v.size === item.variantSize);
//         if (variantIndex !== -1 && product.variants[variantIndex]) {
//           const updateField = `variants.${variantIndex}.stock`;
//           await Product.findByIdAndUpdate(
//             item.productId._id,
//             { $inc: { [updateField]: -item.quantity } },
//             { runValidators: false }
//           );
//         } else if (typeof product.stock === 'number') {
//           await Product.findByIdAndUpdate(
//             item.productId._id,
//             { $inc: { stock: -item.quantity } },
//             { runValidators: false }
//           );
//         }
//       }
//     }

//     cart.items = [];
//     await cart.save();

//     console.log('Order placed successfully via sync ' + normalizedPaymentMethod + ':', order.orderId);

//     return res.status(200).json({
//       success: true,
//       message: 'Order placed successfully',
//       orderId: order.orderId,
//     });
//   } catch (err) {
//     console.error('Place order error:', err.message);
//     return res.status(500).json({
//       success: false,
//       message: `Server error: ${err.message}`
//     });
//   }
// };



const placeOrder = async (req, res) => {
  try {
    const userId = req.session.user?.id || req.session.user?._id;
    const { addressId, paymentMethod, couponCode } = req.body;

    console.log('📦 Placing order:', {
      userId: userId?.toString(),
      addressId,
      paymentMethod,
      couponCode
    });

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

    // Stock check
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
          message: `${product.productName} (${item.variantSize}) is out of stock`,
        });
      }
    }

    let subtotal = 0;
    let orderItems = [];

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

    // Handle coupon
    let discount = 0;
    let couponApplied = false;
    let appliedCouponCode = null;

    if (couponCode) {
      console.log('🎟️ Applying coupon:', couponCode);
      const coupon = await Coupon.findOne({ 
        couponCode: couponCode.toUpperCase(),
        isListed: true
      }).populate('appliedUsers.userId');

      if (coupon) {
        // Validation
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

        if (subtotal < coupon.minimumPrice) {
          return res.status(400).json({
            success: false,
            message: `Minimum purchase of ₹${coupon.minimumPrice} required`
          });
        }

        const usageCount = coupon.used || 0;
        if (usageCount >= coupon.limit) {
          return res.status(400).json({ success: false, message: 'This coupon has reached its usage limit' });
        }

        if (coupon.usageType === 'once') {
          const userHasUsed = coupon.appliedUsers?.some(
            applied => applied.userId && applied.userId._id.toString() === userId.toString()
          );
          if (userHasUsed) {
            return res.status(400).json({ success: false, message: 'You have already used this coupon' });
          }
        }

        // Calculate discount
        if (coupon.discountType === 'percentage') {
          discount = (subtotal * coupon.discountPrice) / 100;
          
          if (coupon.maxDiscountAmount > 0 && discount > coupon.maxDiscountAmount) {
            discount = coupon.maxDiscountAmount;
          }
        } else {
          discount = Math.min(coupon.discountPrice, subtotal);
        }

        discount = Math.round(discount * 100) / 100;
        couponApplied = discount > 0;
        appliedCouponCode = couponCode;
      } else {
        return res.status(400).json({ success: false, message: 'Invalid coupon code' });
      }
    }

    const finalAmount = Math.max(subtotal - discount, 0);

    console.log('📊 Order amounts:', { subtotal, discount, finalAmount });

    // Handle Wallet payment
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
      
      wallet.balance -= finalAmount;
      wallet.transactions.push({
        type: 'debit',
        amount: finalAmount,
        description: 'Purchase',
        orderId: `order_${Date.now()}`,
        date: new Date(),
      });
      await wallet.save();
      console.log('💳 Wallet debited:', finalAmount);
    }

    // Create order
    const orderData = {
      user: userId,
      orderItems,
      totalPrice: subtotal,
      discount: discount,
      finalAmount: finalAmount,
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
      paymentStatus: 'Completed',
      couponApplied: couponApplied,
      couponCode: appliedCouponCode,
      status: 'Processing',
      createdOn: new Date(),
    };

    const order = new Order(orderData);
    await order.save();

    console.log('✅ Order saved:', order._id);

    // ========== ✅ CALL REFERRAL PROCESSING FUNCTION ==========
    await processReferralReward(userId, order._id, finalAmount);

    // Update stock
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

    // Clear cart
    cart.items = [];
    await cart.save();

    console.log('✅ Order placed successfully:', order.orderId);

    return res.status(200).json({
      success: true,
      message: 'Order placed successfully',
      orderId: order.orderId,
    });
  } catch (err) {
    console.error('Place order error:', err.message);
    return res.status(500).json({
      success: false,
      message: `Server error: ${err.message}`
    });
  }
};



async function recordCouponUsageInternal(coupon, userId, orderId) {
  try {
    console.log('📝 Internal recording usage:', {
      couponCode: coupon.couponCode,
      currentUsed: coupon.used || 0,
      userId: userId.toString(),
      orderId: orderId.toString()
    });

    const userObjectId = new mongoose.Types.ObjectId(userId);
    const orderObjectId = new mongoose.Types.ObjectId(orderId);

    coupon.appliedUsers.push({
      userId: userObjectId,
      orderId: orderObjectId,
      appliedDate: new Date()
    });

    coupon.markModified('appliedUsers');

    const savedCoupon = await coupon.save();

    console.log('✅ Internal usage recorded!', {
      newUsed: savedCoupon.used || 0,
      total: `${savedCoupon.used || 0}/${savedCoupon.limit}`
    });

    return savedCoupon;
  } catch (usageError) {
    console.error('❌ Internal usage recording failed:', usageError);
    throw usageError; // Re-throw for caller handling
  }
}

// Example payment success handler (for webhook if needed)
const handlePaymentSuccess = async (req, res) => {
  try {
    const { orderId, paymentId } = req.body; // From webhook/payload
    const order = await Order.findById(orderId);

    if (!order || order.paymentStatus === 'Completed') {
      return res.status(400).json({ success: false, message: 'Invalid order' });
    }

    // Update order
    order.paymentStatus = 'Completed';
    order.status = 'Processing';
    await order.save();

    // Record coupon if pending
    if (order.couponApplied && order.couponCode) {
      const coupon = await Coupon.findOne({ couponCode: order.couponCode.toUpperCase() });
      if (coupon && order.user.toString() !== undefined) {
        await recordCouponUsageInternal(coupon, order.user, order._id);
        console.log('✅ Deferred usage recorded on payment success');
      }
    }

    res.json({ success: true, message: 'Payment confirmed' });
  } catch (err) {
    console.error('Payment success error:', err);
    res.status(500).json({ success: false });
  }
};

const getOrderFailure = async (req, res) => {
  try {
    const { 
      transactionId = 'N/A',
      errorReason = 'Transaction declined by your bank',
      paymentMethod = 'Card',
      amount = '₹0'
    } = req.query;

    const now = new Date();
    const date = now.toLocaleDateString('en-IN', { 
      year: 'numeric', 
      month: 'short', 
      day: 'numeric' 
    });
    const time = now.toLocaleTimeString('en-IN');

    res.render('orderFailure', {
      transactionId,
      errorReason,
      paymentMethod,
      amount,
      date,
      time
    });
  } catch (error) {
    res.redirect('/pageNotFound');
  }
};


const processReferralReward = async (userId, orderId, finalAmount) => {
  try {
    console.log('🎁 ========== REFERRAL REWARD PROCESSING START ==========');
    console.log('📊 Data:', { userId: userId.toString(), orderId: orderId.toString(), finalAmount });

    // Check if order amount is >= 1000
    if (finalAmount < 1000) {
      console.log('ℹ️ Order amount < 1000, skipping referral reward');
      return;
    }

    console.log('✅ Order amount >= 1000, checking referral...');

    // Get the referred user (User B)
    const referredUser = await User.findById(userId).select('redeemed email name');
    console.log('👤 Referred user found:', referredUser?.email, 'Redeemed:', referredUser?.redeemed);

    if (!referredUser) {
      console.log('❌ Referred user not found');
      return;
    }

    if (!referredUser.redeemed) {
      console.log('ℹ️ User was not referred (redeemed = false)');
      return;
    }

    console.log('✅ User was referred, finding referrer...');

    // Find the referrer (User A) - who added this user to redeemedUsers
    const referrer = await User.findOne({
      redeemedUsers: { $in: [userId] }
    }).select('_id email name');

    if (!referrer) {
      console.log('❌ Referrer not found');
      return;
    }

    console.log('👥 Referrer found:', referrer.email, 'ID:', referrer._id.toString());

    // Check if this is the FIRST qualifying order for this user
    const previousOrder = await Order.findOne({
      user: userId,
      _id: { $ne: orderId },
      paymentStatus: 'Completed',
      finalAmount: { $gte: 1000 }
    });

    if (previousOrder) {
      console.log('ℹ️ User already has a previous qualifying order, skipping reward');
      console.log('   Previous order ID:', previousOrder._id.toString());
      return;
    }

    console.log('✅ This is FIRST qualifying order, awarding ₹50 to referee...');

    // ========== CREDIT REFEREE (USER B) WITH ₹50 ==========
    let refereeWallet = await Wallet.findOne({ user: userId });
    
    if (!refereeWallet) {
      console.log('📝 Creating new wallet for referee:', userId.toString());
      refereeWallet = new Wallet({ 
        user: userId,
        balance: 0,
        transactions: []
      });
    }

    const oldBalance = refereeWallet.balance || 0;
    refereeWallet.balance += 50;

    refereeWallet.transactions.push({
      type: 'credit',
      amount: 50,
      description: 'Referral',
      reason: `Bonus for completing first order ≥ ₹1000 using referral code`,
      orderId: orderId.toString(),
      date: new Date(),
    });

    const savedRefereeWallet = await refereeWallet.save();
    console.log('✅ REFEREE CREDITED ₹50');
    console.log('   Old Balance:', oldBalance);
    console.log('   New Balance:', savedRefereeWallet.balance);
    console.log('   Transaction saved:', savedRefereeWallet.transactions.length, 'transactions');

    console.log('🎁 ========== REFERRAL REWARD PROCESSING END ==========');

  } catch (err) {
    console.error('❌ ERROR in processReferralReward:', err.message);
    console.error('Stack trace:', err.stack);
  }
};



module.exports = {
  checkAuth,           
  createRazorpayOrder,
  verifyRazorpayPayment,
  placeOrder,
  getOrderFailure,
  handlePaymentSuccess
};