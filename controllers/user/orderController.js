
const mongoose = require('mongoose');
const Cart = require('../../models/cartSchema');
const Address = require('../../models/addressSchema');
const Product = require('../../models/productSchema');
const User = require('../../models/userSchema');
const Order=require('../../models/orderSchema')
const Wallet=require('../../models/walletSchema')

// const getOrderSuccess = async (req, res) => {
//   try {
//     const user = req.session.user;
//     console.log('Session user in getOrderSuccess:', user);

//     const userId = user?._id || user?.id;
//     if (!user || !mongoose.Types.ObjectId.isValid(userId)) {
//       console.log('Redirecting to /login due to invalid user or userId');
//       return res.redirect('/login');
//     }
 
//     const latestOrder = await Order.findOne({ user: userId })
//       .sort({ createdOn: -1 })
//       .populate('orderItems.product')
//       .lean();

//     console.log('Latest order:', latestOrder);

//     if (!latestOrder) {
//       console.log('No order found for user:', userId);
//       return res.render('orderSuccess', {
//           images: product.images?.length ? product.images : ['default.jpg'],
//         orderId: 'N/A',
//         date: 'N/A',
//         time: 'N/A',
//         paymentMethod: 'N/A',
//         amount: 'N/A',
//         deliveryDate: 'N/A',
//         items: [],
//         deliveryAddress: 'N/A',
//         success: req.flash('success'),
//       });
//     }

//     const orderDate = new Date(latestOrder.createdOn);
//     const formattedDate = orderDate.toLocaleDateString('en-IN', {
//       day: '2-digit',
//       month: 'short',
//       year: 'numeric',
//     });
//     const formattedTime = orderDate.toLocaleTimeString('en-IN', {
//       hour: '2-digit',
//       minute: '2-digit',
//     });
 
//     const deliveryDate = new Date(orderDate);
//     deliveryDate.setDate(deliveryDate.getDate() + 5);
//     const formattedDelivery = deliveryDate.toLocaleDateString('en-IN', {
//       day: '2-digit',
//       month: 'short',
//       year: 'numeric',
//     });

//     const deliveryAddress = latestOrder.deliveryAddress
//       ? `${latestOrder.deliveryAddress.name}, ${latestOrder.deliveryAddress.houseName}, ${latestOrder.deliveryAddress.city}, ${latestOrder.deliveryAddress.state} - ${latestOrder.deliveryAddress.pincode}`
//       : 'N/A';
   
//     const formattedItems = latestOrder.orderItems.map((item) => ({
//       productName: item.productName,
//        productId: item.product,
//       variantSize: item.variantSize ? `${item.variantSize}ml` : 'N/A',
//       quantity: item.quantity,
//       price: `₹${item.price}`,
//       total: `₹${item.total}`,
//     }));

//     console.log('Formatted items:', formattedItems);
//     console.log('Flash messages in getOrderSuccess:', req.flash());

//     res.render('orderSuccess', {
//       orderId: latestOrder.orderId || 'N/A',
//       date: formattedDate,
//       time: formattedTime,
//       paymentMethod: latestOrder.paymentMethod || 'Unknown',
//       amount: latestOrder.finalAmount ? `₹${latestOrder.finalAmount}` : 'N/A',
//       deliveryDate: formattedDelivery,
//       items: formattedItems,
//       deliveryAddress: deliveryAddress,
//       success: req.flash('success'),
//     });
//   } catch (error) {
//     console.error('Error loading order success page:', error.message, error.stack);
//     res.redirect('/pageNotFound');
//   }
// };

// const cancelSingleOrder = async (req, res) => {
//   try {
//     const user = req.session.user;
//     const userId = user?._id || user?.id;
//     const { orderId, itemIndex, variantSize } = req.params;
//     const { reason, details } = req.body;

//     if (!user || !mongoose.Types.ObjectId.isValid(userId)) {
//       return res.status(401).json({ success: false, error: 'Unauthorized' });
//     }

//     const order = await Order.findOne({ orderId, user: userId });
//     if (!order) {
//       return res.status(404).json({ success: false, error: 'Order not found' });
//     }

   
//     const idx = parseInt(itemIndex);
//     if (isNaN(idx) || idx < 0 || idx >= order.orderItems.length) {
//       return res.status(404).json({ success: false, error: 'Invalid item index' });
//     }

//     const item = order.orderItems[idx];
    
  
//     if (String(item.variantSize) !== String(variantSize)) {
//       return res.status(400).json({ 
//         success: false, 
//         error: `Variant mismatch. Expected ${item.variantSize}ml, got ${variantSize}ml` 
//       });
//     }

//     if (item.status === 'Cancelled') {
//       return res.status(400).json({ success: false, error: 'Item already cancelled' });
//     }

//     if (['Shipped', 'OutForDelivery', 'Out for Delivery', 'Delivered'].includes(item.status)) {
//       return res.status(400).json({ success: false, error: 'Cannot cancel item that is already shipped or delivered' });
//     }

//     let quantityToRestore = item.quantity || 1;
    
//     try {
//       const productId = item.product?._id || item.product || item.productId;
      
//       if (!productId || !mongoose.Types.ObjectId.isValid(productId)) {
//         throw new Error('Invalid product ID in order');
//       }

//       const product = await Product.findById(productId);
//       if (!product) {
//         throw new Error('Product not found in database');
//       }

//       const variantSizeFromOrder = String(item.variantSize);

//       if (variantSizeFromOrder && product.variants && Array.isArray(product.variants)) {
//         const variantIndex = product.variants.findIndex(v => String(v.size) === variantSizeFromOrder);

//         if (variantIndex !== -1) {
//           const oldStock = product.variants[variantIndex].stock;
//           const newStock = oldStock + quantityToRestore;
          
//           await Product.updateOne(
//             { _id: productId },
//             { $set: { [`variants.${variantIndex}.stock`]: newStock } }
//           );
//         } else {
//           throw new Error(`Variant size ${variantSizeFromOrder}ml not found`);
//         }
//       } else {
//         throw new Error('Variant size information missing');
//       }
//     } catch (stockError) {
//       console.error('Stock restoration error:', stockError.message);
//       throw stockError;
//     }
   
//     item.status = 'Cancelled';
//     item.cancelReason = reason;
//     item.cancelDetails = details;
//     item.cancelledAt = new Date();

//     order.finalAmount -= item.total;
//     if (order.finalAmount < 0) order.finalAmount = 0;

//     const allCancelled = order.orderItems.every(i => i.status === 'Cancelled');
//     if (allCancelled) {
//       order.status = 'Cancelled';
//       order.cancelReason = reason;
//       order.cancelDetails = details;
//       order.cancelledAt = new Date();
//     }

//     await order.save();

//     res.json({ 
//       success: true, 
//       message: `Item (${variantSize}ml) cancelled successfully. ${quantityToRestore} quantity restored to stock.`,
//       allCancelled: allCancelled
//     });
    
//   } catch (error) {
//     console.error('Error cancelling item:', error.message);
//     res.status(500).json({ success: false, error: `Failed to cancel item: ${error.message}` });
//   }
// };

// const cancelAllOrder = async (req, res) => {
//   try {
//     const user = req.session.user;
//     const userId = user?._id || user?.id;
//     const { orderId } = req.params;
//     const { reason, details } = req.body;

//     if (!user || !mongoose.Types.ObjectId.isValid(userId)) {
//       return res.status(401).json({ success: false, error: 'Unauthorized' });
//     }

//     const order = await Order.findOne({ orderId, user: userId });

//     if (!order) {
//       return res.status(404).json({ success: false, error: 'Order not found' });
//     }

//     if (order.status === 'Delivered' || order.status === 'Cancelled') {
//       return res.status(400).json({ success: false, error: 'Order cannot be cancelled' });
//     }


//     const hasShippedOrDeliveredItems = order.orderItems.some(item => 
//       item.status === 'Shipped' || 
//       item.status === 'OutForDelivery' || 
//       item.status === 'Out for Delivery' ||
//       item.status === 'Delivered'
//     );

//     if (hasShippedOrDeliveredItems) {
//       return res.status(400).json({ 
//         success: false, 
//         error: 'Cannot cancel entire order. Some items are already shipped or delivered. Please cancel individual items instead.' 
//       });
//     }

//     let cancelledCount = 0;
//     let totalRestoredQuantity = 0;
    
//     for (const item of order.orderItems) {

//       if (item.status !== 'Shipped' && 
//           item.status !== 'OutForDelivery' && 
//           item.status !== 'Out for Delivery' &&
//           item.status !== 'Delivered' &&
//           item.status !== 'Cancelled') {
      
//         try {
//           const productId = item.product?._id || item.product || item.productId;
          
//           if (!productId || !mongoose.Types.ObjectId.isValid(productId)) {
//             console.warn(` Invalid product ID for ${item.productName}`);
//             continue;
//           }

//           const product = await Product.findById(productId);
          
//           if (!product) {
//             console.warn(` Product not found: ${productId}`);
//             continue;
//           }

//           const quantityToRestore = item.quantity || 1;
//           const variantSizeFromOrder = String(item.variantSize);

//           console.log(` Restoring - Product: ${product.productName}, Size: ${variantSizeFromOrder}ml, Quantity: ${quantityToRestore}`);

//           if (variantSizeFromOrder && product.variants && Array.isArray(product.variants)) {
//             const variantIndex = product.variants.findIndex(v => 
//               String(v.size) === variantSizeFromOrder
//             );

//             if (variantIndex !== -1) {
//               const oldStock = product.variants[variantIndex].stock;
//               const newStock = oldStock + quantityToRestore;
              
//               console.log(` Stock update: ${oldStock} + ${quantityToRestore} = ${newStock}`);
              
//               await Product.updateOne(
//                 { _id: productId },
//                 { $set: { [`variants.${variantIndex}.stock`]: newStock } }
//               );
              
//               totalRestoredQuantity += quantityToRestore;
//             } else {
//               console.warn(` Variant ${variantSizeFromOrder}ml not found`);
//             }
//           }
//         } catch (stockError) {
//           console.error(` Error restoring stock for ${item.productName}:`, stockError.message);
        
//         }
        
        
//         item.status = 'Cancelled';
//         item.cancelReason = reason;
//         item.cancelDetails = details;
//         item.cancelledAt = new Date();
      
       
//         order.finalAmount -= item.total;
//         cancelledCount++;
//       }
//     }

//     if (cancelledCount === 0) {
//       return res.status(400).json({ 
//         success: false, 
//         error: 'No items available to cancel' 
//       });
//     }

//     if (order.finalAmount < 0) order.finalAmount = 0;
   
   
//     const allCancelled = order.orderItems.every(item => 
//       item.status === 'Cancelled' || 
//       item.status === 'Delivered' || 
//       item.status === 'Shipped' ||
//       item.status === 'OutForDelivery' ||
//       item.status === 'Out for Delivery'
//     );
    
//     if (allCancelled) {
//       order.status = 'Cancelled';
//       order.cancelReason = reason;
//       order.cancelDetails = details;
//       order.cancelledAt = new Date();
//     }

//     await order.save();

//     console.log(` ${cancelledCount} items cancelled, ${totalRestoredQuantity} quantity restored`);
    
//     res.json({ 
//       success: true, 
//       message: `${cancelledCount} item(s) cancelled successfully. ${totalRestoredQuantity} total quantity restored to stock.` 
//     });
    
//   } catch (error) {
//     console.error(' Error cancelling order:', error.message);
//     res.status(500).json({ success: false, error: `Failed to cancel order: ${error.message}` });
//   }
// };


// Cancel Single Item and Credit Wallet

const getOrderSuccess = async (req, res) => {
  try {
    const user = req.session.user;
    console.log('Session user in getOrderSuccess:', user);

    const userId = user?._id || user?.id;
    if (!user || !mongoose.Types.ObjectId.isValid(userId)) {
      console.log('Redirecting to /login due to invalid user or userId');
      return res.redirect('/login');
    }

    const latestOrder = await Order.findOne({ user: userId })
      .sort({ createdOn: -1 })
      .populate('orderItems.product')
      .lean();

    // ✅ Discount verification logging
    console.log('Latest order data:', {
      orderId: latestOrder?.orderId,
      totalPrice: latestOrder?.totalPrice,
      discount: latestOrder?.discount,
      finalAmount: latestOrder?.finalAmount,
      couponApplied: latestOrder?.couponApplied,
      couponCode: latestOrder?.couponCode
    });

    if (!latestOrder) {
      console.log('No order found for user:', userId);
      return res.render('orderSuccess', {
        orderId: 'N/A',
        date: 'N/A',
        time: 'N/A',
        paymentMethod: 'N/A',
        subtotal: '₹0',
        discount: '₹0',
        shipping: 'Free',
        amount: '₹0',
        deliveryDate: 'N/A',
        items: [],
        deliveryAddress: 'N/A',
        success: req.flash('success'),
      });
    }

    const orderDate = new Date(latestOrder.createdOn);
    const formattedDate = orderDate.toLocaleDateString('en-IN', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
    });
    const formattedTime = orderDate.toLocaleTimeString('en-IN', {
      hour: '2-digit',
      minute: '2-digit',
    });

    const deliveryDate = new Date(orderDate);
    deliveryDate.setDate(deliveryDate.getDate() + 5);
    const formattedDelivery = deliveryDate.toLocaleDateString('en-IN', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
    });

    const deliveryAddress = latestOrder.deliveryAddress
      ? `${latestOrder.deliveryAddress.name}, ${latestOrder.deliveryAddress.houseName}, ${latestOrder.deliveryAddress.city}, ${latestOrder.deliveryAddress.state} - ${latestOrder.deliveryAddress.pincode}`
      : 'N/A';

    const formattedItems = latestOrder.orderItems.map((item) => ({
      productName: item.productName,
      productId: item.product,
      variantSize: item.variantSize ? `${item.variantSize}ml` : 'N/A',
      quantity: item.quantity,
      price: `₹${item.price}`,
      total: `₹${item.total}`,
    }));

    console.log('Formatted items:', formattedItems);

    // ✅ Properly format discount and amounts
    const subtotalAmount = latestOrder.totalPrice || 0;
    const discountAmount = latestOrder.discount || 0;
    const finalAmount = latestOrder.finalAmount || 0;

    // Format for display
    const formattedSubtotal = `₹${subtotalAmount.toFixed(2)}`;
    const formattedDiscount = discountAmount > 0 ? `-₹${discountAmount.toFixed(2)}` : '₹0';
    const formattedFinalAmount = `₹${finalAmount.toFixed(2)}`;

    console.log('Formatted amounts:', {
      subtotal: formattedSubtotal,
      discount: formattedDiscount,
      final: formattedFinalAmount
    });

    // ✅ Pass all required data to template
    res.render('orderSuccess', {
      orderId: latestOrder.orderId || 'N/A',
      date: formattedDate,
      time: formattedTime,
      paymentMethod: latestOrder.paymentMethod || 'Unknown',
      subtotal: formattedSubtotal,
      discount: formattedDiscount,
      shipping: 'Free',
      amount: formattedFinalAmount,
      deliveryDate: formattedDelivery,
      items: formattedItems,
      deliveryAddress: deliveryAddress,
      couponApplied: latestOrder.couponApplied || false,
      couponCode: latestOrder.couponCode || null,
      success: req.flash('success'),
    });
  } catch (error) {
    console.error('Error loading order success page:', error.message, error.stack);
    res.redirect('/pageNotFound');
  }
};

const cancelSingleOrder = async (req, res) => {
  try {
    const user = req.session.user;
    const userId = user?._id || user?.id;
    const { orderId, itemIndex, variantSize } = req.params;
    const { reason, details } = req.body;

    if (!user || !mongoose.Types.ObjectId.isValid(userId)) {
      return res.status(401).json({ success: false, error: 'Unauthorized' });
    }

    const order = await Order.findOne({ orderId, user: userId });
    if (!order) {
      return res.status(404).json({ success: false, error: 'Order not found' });
    }

    const idx = parseInt(itemIndex);
    if (isNaN(idx) || idx < 0 || idx >= order.orderItems.length) {
      return res.status(404).json({ success: false, error: 'Invalid item index' });
    }

    const item = order.orderItems[idx];
    
    if (String(item.variantSize) !== String(variantSize)) {
      return res.status(400).json({ 
        success: false, 
        error: `Variant mismatch. Expected ${item.variantSize}ml, got ${variantSize}ml` 
      });
    }

    if (item.status === 'Cancelled') {
      return res.status(400).json({ success: false, error: 'Item already cancelled' });
    }

    if (['Shipped', 'OutForDelivery', 'Out for Delivery', 'Delivered'].includes(item.status)) {
      return res.status(400).json({ success: false, error: 'Cannot cancel item that is already shipped or delivered' });
    }

    let quantityToRestore = item.quantity || 1;
    
    try {
      const productId = item.product?._id || item.product || item.productId;
      
      if (!productId || !mongoose.Types.ObjectId.isValid(productId)) {
        throw new Error('Invalid product ID in order');
      }

      const product = await Product.findById(productId);
      if (!product) {
        throw new Error('Product not found in database');
      }

      const variantSizeFromOrder = String(item.variantSize);

      if (variantSizeFromOrder && product.variants && Array.isArray(product.variants)) {
        const variantIndex = product.variants.findIndex(v => String(v.size) === variantSizeFromOrder);

        if (variantIndex !== -1) {
          const oldStock = product.variants[variantIndex].stock;
          const newStock = oldStock + quantityToRestore;
          
          await Product.updateOne(
            { _id: productId },
            { $set: { [`variants.${variantIndex}.stock`]: newStock } }
          );
        } else {
          throw new Error(`Variant size ${variantSizeFromOrder}ml not found`);
        }
      } else {
        throw new Error('Variant size information missing');
      }
    } catch (stockError) {
      console.error('Stock restoration error:', stockError.message);
      throw stockError;
    }
   
   const itemDiscount = item.discountApplied || 0;
    const originalItemTotal = item.total;
    const refundAmount = originalItemTotal - itemDiscount;

    console.log(`Refund Calculation:
    Product: ${item.productName}
    Original Total: ₹${originalItemTotal}
    Discount Applied: ₹${itemDiscount}
    Refund Amount: ₹${refundAmount}`);
    
    item.status = 'Cancelled';
    item.cancelReason = reason;
    item.cancelDetails = details;
    item.cancelledAt = new Date();

    order.finalAmount -= item.total;
    if (order.finalAmount < 0) order.finalAmount = 0;

    const allCancelled = order.orderItems.every(i => i.status === 'Cancelled');
    if (allCancelled) {
      order.status = 'Cancelled';
      order.cancelReason = reason;
      order.cancelDetails = details;
      order.cancelledAt = new Date();
    }

    await order.save();

    // ✅ CREDIT WALLET (only for online payment or wallet payment)
    if (order.paymentMethod === 'Online Payment' || order.paymentMethod === 'Wallet') {
      try {
        let wallet = await Wallet.findOne({ user: userId });
        
        if (!wallet) {
          wallet = new Wallet({
            user: userId,
            balance: 0,
            transactions: []
          });
        }

        wallet.balance += refundAmount;
        wallet.transactions.push({
          type: 'credit',
          amount: refundAmount,
          description: 'Order Cancellation',  // ✅ Use valid description
          orderId: orderId,
          productName: item.productName || 'Item',
          date: new Date()
        });

        await wallet.save();
        console.log(`✅ Wallet credited: ₹${refundAmount} to user ${userId}`);
      } catch (walletError) {
        console.error('Wallet credit error:', walletError.message);
        // Don't fail the cancellation if wallet credit fails
      }
    }

    res.json({ 
      success: true, 
      message: `Item (${variantSize}ml) cancelled successfully. ${quantityToRestore} quantity restored to stock.`,
      refunded: order.paymentMethod === 'Online Payment' || order.paymentMethod === 'Wallet',
      refundAmount: refundAmount,
      allCancelled: allCancelled
    });
    
  } catch (error) {
    console.error('Error cancelling item:', error.message);
    res.status(500).json({ success: false, error: `Failed to cancel item: ${error.message}` });
  }
};

// Cancel All Items and Credit Wallet
const cancelAllOrder = async (req, res) => {
  try {
    const user = req.session.user;
    const userId = user?._id || user?.id;
    const { orderId } = req.params;
    const { reason, details } = req.body;

    if (!user || !mongoose.Types.ObjectId.isValid(userId)) {
      return res.status(401).json({ success: false, error: 'Unauthorized' });
    }

    const order = await Order.findOne({ orderId, user: userId });

    if (!order) {
      return res.status(404).json({ success: false, error: 'Order not found' });
    }

    if (order.status === 'Delivered' || order.status === 'Cancelled') {
      return res.status(400).json({ success: false, error: 'Order cannot be cancelled' });
    }

    const hasShippedOrDeliveredItems = order.orderItems.some(item => 
      item.status === 'Shipped' || 
      item.status === 'OutForDelivery' || 
      item.status === 'Out for Delivery' ||
      item.status === 'Delivered'
    );

    if (hasShippedOrDeliveredItems) {
      return res.status(400).json({ 
        success: false, 
        error: 'Cannot cancel entire order. Some items are already shipped or delivered. Please cancel individual items instead.' 
      });
    }

    let cancelledCount = 0;
    let totalRestoredQuantity = 0;
    let totalRefundAmount = 0;
    
    for (const item of order.orderItems) {

      if (item.status !== 'Shipped' && 
          item.status !== 'OutForDelivery' && 
          item.status !== 'Out for Delivery' &&
          item.status !== 'Delivered' &&
          item.status !== 'Cancelled') {
      
        try {
          const productId = item.product?._id || item.product || item.productId;
          
          if (!productId || !mongoose.Types.ObjectId.isValid(productId)) {
            console.warn(`Invalid product ID for ${item.productName}`);
            continue;
          }

          const product = await Product.findById(productId);
          
          if (!product) {
            console.warn(`Product not found: ${productId}`);
            continue;
          }

          const quantityToRestore = item.quantity || 1;
          const variantSizeFromOrder = String(item.variantSize);

          console.log(`Restoring - Product: ${product.productName}, Size: ${variantSizeFromOrder}ml, Quantity: ${quantityToRestore}`);

          if (variantSizeFromOrder && product.variants && Array.isArray(product.variants)) {
            const variantIndex = product.variants.findIndex(v => 
              String(v.size) === variantSizeFromOrder
            );

            if (variantIndex !== -1) {
              const oldStock = product.variants[variantIndex].stock;
              const newStock = oldStock + quantityToRestore;
              
              console.log(`Stock update: ${oldStock} + ${quantityToRestore} = ${newStock}`);
              
              await Product.updateOne(
                { _id: productId },
                { $set: { [`variants.${variantIndex}.stock`]: newStock } }
              );
              
              totalRestoredQuantity += quantityToRestore;
            } else {
              console.warn(`Variant ${variantSizeFromOrder}ml not found`);
            }
          }
        } catch (stockError) {
          console.error(`Error restoring stock for ${item.productName}:`, stockError.message);
        }
        
        // ✅ ADD REFUND AMOUNT TO TOTAL
        const itemDiscount = item.discountApplied || 0;
        const itemRefund = item.total - itemDiscount;
        totalRefundAmount += itemRefund;

        console.log(`Item ${item.productName}:
        Original: ₹${item.total}
        Discount: ₹${itemDiscount}
        Refund: ₹${itemRefund}`);
        
        item.status = 'Cancelled';
        item.cancelReason = reason;
        item.cancelDetails = details;
        item.cancelledAt = new Date();
      
        order.finalAmount -= item.total;
        cancelledCount++;
      }
    }

    if (cancelledCount === 0) {
      return res.status(400).json({ 
        success: false, 
        error: 'No items available to cancel' 
      });
    }

    if (order.finalAmount < 0) order.finalAmount = 0;
   
    const allCancelled = order.orderItems.every(item => 
      item.status === 'Cancelled' || 
      item.status === 'Delivered' || 
      item.status === 'Shipped' ||
      item.status === 'OutForDelivery' ||
      item.status === 'Out for Delivery'
    );
    
    if (allCancelled) {
      order.status = 'Cancelled';
      order.cancelReason = reason;
      order.cancelDetails = details;
      order.cancelledAt = new Date();
    }

    await order.save();

    // ✅ CREDIT WALLET (only for online payment or wallet payment)
    let walletCredited = false;
    if (order.paymentMethod === 'Online Payment' || order.paymentMethod === 'Wallet') {
      try {
        let wallet = await Wallet.findOne({ user: userId });
        
        if (!wallet) {
          wallet = new Wallet({
            user: userId,
            balance: 0,
            transactions: []
          });
        }

        wallet.balance += totalRefundAmount;
        wallet.transactions.push({
          type: 'credit',
          amount: totalRefundAmount,
          description: 'Order Cancellation',  // ✅ Use valid description
          orderId: orderId,
          productName: `${cancelledCount} items`,
          date: new Date()
        });

        await wallet.save();
        console.log(`✅ Wallet credited: ₹${totalRefundAmount} to user ${userId}`);
        walletCredited = true;
      } catch (walletError) {
        console.error('Wallet credit error:', walletError.message);
        // Don't fail the cancellation if wallet credit fails
      }
    }

    console.log(`${cancelledCount} items cancelled, ${totalRestoredQuantity} quantity restored`);
    
    res.json({ 
      success: true, 
      message: `${cancelledCount} item(s) cancelled successfully. ${totalRestoredQuantity} total quantity restored to stock.`,
      refunded: walletCredited,
      refundAmount: totalRefundAmount,
      paymentMethod: order.paymentMethod
    });
    
  } catch (error) {
    console.error('Error cancelling order:', error.message);
    res.status(500).json({ success: false, error: `Failed to cancel order: ${error.message}` });
  }
};

// const getOrderDetails = async (req, res) => {
//   try {
//     const user = req.session.user;
//     const userId = user?._id || user?.id;
//     if (!user || !mongoose.Types.ObjectId.isValid(userId)) {
//       return res.redirect('/login');
//     }

//     const orderId = req.params.orderId;
//     const latestOrder = await Order.findOne({ orderId, user: userId })
//       .populate('orderItems.product')
//       .lean();

//     if (!latestOrder) {
//       return res.redirect('/pageNotFound');
//     }

//     const formattedDate = latestOrder.createdOn
//       ? new Date(latestOrder.createdOn).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })
//       : 'N/A';
   
//     const deliveryAddress = latestOrder.deliveryAddress || {
//       name: 'N/A',
//       houseName: 'N/A',
//       city: 'N/A',
//       state: 'N/A',
//       pincode: 'N/A',
//       phone: 'N/A',
//     };

//     // MAP WITH INDEX - THIS IS KEY
//     const formattedItems = latestOrder.orderItems.map((item, index) => {
//       let itemStatus = item.status || 'Placed';
//       if (itemStatus === 'Active') {
//         itemStatus = latestOrder.status || 'Placed';
//       }
      
//       const itemDeliveredDate = item.deliveredAt || latestOrder.deliveredAt || latestOrder.createdOn;
//       const returnDate = new Date(itemDeliveredDate);
//       returnDate.setDate(returnDate.getDate() + 7);
//       const isItemReturnEligible = itemStatus === 'Delivered' && Date.now() <= returnDate.getTime();
      
//       const isReturnRejected = item.returnRejected === true;

//       const tracking = {
//         placedDate: item.tracking?.placedDate || null,
//         placedTime: item.tracking?.placedTime || null,
//         confirmedDate: item.tracking?.confirmedDate || null,
//         confirmedTime: item.tracking?.confirmedTime || null,
//         processingDate: item.tracking?.processingDate || null,
//         processingTime: item.tracking?.processingTime || null,
//         shippedDate: item.tracking?.shippedDate || null,
//         shippedTime: item.tracking?.shippedTime || null,
//         shippedLocation: item.tracking?.shippedLocation || 'Warehouse',
//         outForDeliveryDate: item.tracking?.outForDeliveryDate || null,
//         outForDeliveryTime: item.tracking?.outForDeliveryTime || null,
//         outForDeliveryLocation: item.tracking?.outForDeliveryLocation || deliveryAddress.city,
//         deliveredDate: item.tracking?.deliveredDate || null,
//         deliveredTime: item.tracking?.deliveredTime || null,
//         estimatedDeliveryDate: item.tracking?.estimatedDeliveryDate || 'N/A'
//       };

//       return {
//         itemIndex: index, // CRITICAL: Array index as unique identifier
//         productId: item.product?._id,
//         productName: item.productName || item.product?.name || 'Unknown Product',
//         variantSize: item.variantSize ? `${item.variantSize}ml` : 'N/A',
//         variantSizeRaw: item.variantSize || null, // Raw value for passing to backend
//         quantity: item.quantity || 1,
//         price: item.price ? `₹${item.price.toFixed(2)}` : 'N/A',
//         total: item.total ? `₹${item.total.toFixed(2)}` : 'N/A',
//         status: itemStatus,
//         isReturnEligible: isItemReturnEligible && !isReturnRejected,
//         returnRejected: isReturnRejected, 
//         returnRejectionReason: item.returnRejectionReason || 'Return request was not approved', 
//         image: item.product?.images?.[0]
//           ? (item.product.images[0].startsWith('http')
//               ? item.product.images[0]
//               : `/Uploads/product-images/${item.product.images[0]}`)
//           : 'https://via.placeholder.com/130x130?text=No+Image',
//         tracking
//       };
//     });
    
//     const canCancelEntireOrder = formattedItems.some(
//       item => ['Placed', 'Confirmed', 'Processing', 'Active'].includes(item.status)
//     );

//     const isShippedOrOut = formattedItems.some(
//       item => item.status === 'Shipped' || item.status === 'OutForDelivery'
//     );
    
//     const hasAnyRejectedReturn = formattedItems.some(item => item.returnRejected === true);
   
//     const isReturnEligible = formattedItems.some(
//       item => item.status === 'Delivered' && item.isReturnEligible && !item.returnRejected
//     );
  
//     const statusPriority = {
//       'Placed': 1,
//       'Confirmed': 2,
//       'Processing': 3,
//       'Shipped': 4,
//       'OutForDelivery': 5,
//       'Delivered': 6,
//       'Cancelled': 7,
//       'Return Request': 8,
//       'Returned': 9
//     };

//     const activeStatuses = [...new Set(
//       formattedItems
//         .filter(item => !['Cancelled', 'Returned', 'Return Request'].includes(item.status))
//         .map(item => item.status)
//     )].sort((a, b) => statusPriority[a] - statusPriority[b]);

//     res.render('orderDetails', {
//       orderId: latestOrder.orderId || latestOrder._id,
//       status: activeStatuses.join(', '),
//       date: formattedDate,
//       deliveryAddress: deliveryAddress,
//       paymentMethod: latestOrder.paymentMethod || 'N/A',
//       amount: latestOrder.finalAmount ? `₹${latestOrder.finalAmount.toFixed(2)}` : 'N/A',
//       deliveryDate: latestOrder.estimatedDeliveryDate || 'N/A',
//       items: formattedItems,
//       canCancelEntireOrder,
//       isReturnEligible,
//       isShippedOrOut,
//       hasAnyRejectedReturn, 
//       activeStatuses,
//       success: req.flash('success')
//     });
//   } catch (error) {
//     console.error('Error fetching order details:', error);
//     res.redirect('/pageNotFound');
//   }
// };

const getOrderDetails = async (req, res) => {
  try {
    const user = req.session.user;
    const userId = user?._id || user?.id;
    if (!user || !mongoose.Types.ObjectId.isValid(userId)) {
      return res.redirect('/login');
    }

    const orderId = req.params.orderId;
    const latestOrder = await Order.findOne({ orderId, user: userId })
      .populate('orderItems.product')
      .lean();

    if (!latestOrder) {
      return res.redirect('/pageNotFound');
    }

    const formattedDate = latestOrder.createdOn
      ? new Date(latestOrder.createdOn).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })
      : 'N/A';
   
    const deliveryAddress = latestOrder.deliveryAddress || {
      name: 'N/A',
      houseName: 'N/A',
      city: 'N/A',
      state: 'N/A',
      pincode: 'N/A',
      phone: 'N/A',
    };

    // ✅ CALCULATE AMOUNTS
    const subtotal = latestOrder.totalPrice || 0;
    const discount = latestOrder.discount || 0;
    const finalAmount = latestOrder.finalAmount || 0;

    console.log('💰 Order amounts:', {
      subtotal,
      discount,
      finalAmount,
      couponApplied: latestOrder.couponApplied,
      couponCode: latestOrder.couponCode
    });

    // MAP WITH INDEX - THIS IS KEY
    const formattedItems = latestOrder.orderItems.map((item, index) => {
      let itemStatus = item.status || 'Placed';
      if (itemStatus === 'Active') {
        itemStatus = latestOrder.status || 'Placed';
      }
      
      const itemDeliveredDate = item.deliveredAt || latestOrder.deliveredAt || latestOrder.createdOn;
      const returnDate = new Date(itemDeliveredDate);
      returnDate.setDate(returnDate.getDate() + 7);
      const isItemReturnEligible = itemStatus === 'Delivered' && Date.now() <= returnDate.getTime();
      
      const isReturnRejected = item.returnRejected === true;

      const tracking = {
        placedDate: item.tracking?.placedDate || null,
        placedTime: item.tracking?.placedTime || null,
        confirmedDate: item.tracking?.confirmedDate || null,
        confirmedTime: item.tracking?.confirmedTime || null,
        processingDate: item.tracking?.processingDate || null,
        processingTime: item.tracking?.processingTime || null,
        shippedDate: item.tracking?.shippedDate || null,
        shippedTime: item.tracking?.shippedTime || null,
        shippedLocation: item.tracking?.shippedLocation || 'Warehouse',
        outForDeliveryDate: item.tracking?.outForDeliveryDate || null,
        outForDeliveryTime: item.tracking?.outForDeliveryTime || null,
        outForDeliveryLocation: item.tracking?.outForDeliveryLocation || deliveryAddress.city,
        deliveredDate: item.tracking?.deliveredDate || null,
        deliveredTime: item.tracking?.deliveredTime || null,
        estimatedDeliveryDate: item.tracking?.estimatedDeliveryDate || 'N/A'
      };

      return {
        itemIndex: index,
        productId: item.product?._id,
        productName: item.productName || item.product?.name || 'Unknown Product',
        variantSize: item.variantSize ? `${item.variantSize}ml` : 'N/A',
        variantSizeRaw: item.variantSize || null,
        quantity: item.quantity || 1,
        price: item.price ? `₹${item.price.toFixed(2)}` : 'N/A',
        total: item.total ? `₹${item.total.toFixed(2)}` : 'N/A',
        status: itemStatus,
        isReturnEligible: isItemReturnEligible && !isReturnRejected,
        returnRejected: isReturnRejected, 
        returnRejectionReason: item.returnRejectionReason || 'Return request was not approved', 
        image: item.product?.images?.[0]
          ? (item.product.images[0].startsWith('http')
              ? item.product.images[0]
              : `/Uploads/product-images/${item.product.images[0]}`)
          : 'https://via.placeholder.com/130x130?text=No+Image',
        tracking
      };
    });
    
    const canCancelEntireOrder = formattedItems.some(
      item => ['Placed', 'Confirmed', 'Processing', 'Active'].includes(item.status)
    );

    const isShippedOrOut = formattedItems.some(
      item => item.status === 'Shipped' || item.status === 'OutForDelivery'
    );
    
    const hasAnyRejectedReturn = formattedItems.some(item => item.returnRejected === true);
   
    const isReturnEligible = formattedItems.some(
      item => item.status === 'Delivered' && item.isReturnEligible && !item.returnRejected
    );
  
    const statusPriority = {
      'Placed': 1,
      'Confirmed': 2,
      'Processing': 3,
      'Shipped': 4,
      'OutForDelivery': 5,
      'Delivered': 6,
      'Cancelled': 7,
      'Return Request': 8,
      'Returned': 9
    };

    const activeStatuses = [...new Set(
      formattedItems
        .filter(item => !['Cancelled', 'Returned', 'Return Request'].includes(item.status))
        .map(item => item.status)
    )].sort((a, b) => statusPriority[a] - statusPriority[b]);

    // ✅ PASS ALL AMOUNTS TO TEMPLATE
    res.render('orderDetails', {
      orderId: latestOrder.orderId || latestOrder._id,
      status: activeStatuses.join(', '),
      date: formattedDate,
      deliveryAddress: deliveryAddress,
      paymentMethod: latestOrder.paymentMethod || 'N/A',
      subtotal: `₹${subtotal.toFixed(2)}`,  // ✅ NEW
      discount: `₹${discount.toFixed(2)}`,  // ✅ NEW
      amount: `₹${finalAmount.toFixed(2)}`,
      couponApplied: latestOrder.couponApplied || false,  // ✅ NEW
      couponCode: latestOrder.couponCode || null,  // ✅ NEW
      deliveryDate: latestOrder.estimatedDeliveryDate || 'N/A',
      items: formattedItems,
      canCancelEntireOrder,
      isReturnEligible,
      isShippedOrOut,
      hasAnyRejectedReturn, 
      activeStatuses,
      success: req.flash('success')
    });
  } catch (error) {
    console.error('Error fetching order details:', error);
    res.redirect('/pageNotFound');
  }
};

const returnSingleOrder = async (req, res) => {
  try {
    const user = req.session.user;
    const userId = user?._id || user?.id;
    const { orderId, itemIndex, variantSize } = req.params;
    const { reason, details } = req.body;

    if (!user || !mongoose.Types.ObjectId.isValid(userId)) {
      return res.status(401).json({ success: false, error: 'Unauthorized' });
    }

    const order = await Order.findOne({ orderId, user: userId });
    if (!order) {
      return res.status(404).json({ success: false, error: 'Order not found' });
    }

    const idx = parseInt(itemIndex);
    if (isNaN(idx) || idx < 0 || idx >= order.orderItems.length) {
      return res.status(404).json({ success: false, error: 'Invalid item index' });
    }

    const item = order.orderItems[idx];
    
    // CRITICAL: Verify variant matches
    if (String(item.variantSize) !== String(variantSize)) {
      return res.status(400).json({ 
        success: false, 
        error: `Variant mismatch. Cannot process return.` 
      });
    }

    if (item.status !== 'Delivered') {
      return res.status(400).json({ success: false, error: 'Return can only be requested for delivered items' });
    }

    const deliveredDate = item.deliveredAt || order.deliveredAt || order.createdOn;
    const returnWindow = new Date(deliveredDate);
    returnWindow.setDate(returnWindow.getDate() + 7);
    
    if (Date.now() > returnWindow.getTime()) {
      return res.status(400).json({ success: false, error: 'Return window has expired' });
    }

    item.status = 'Return Request';
    item.returnReason = reason;
    item.returnDetails = details;
    item.returnRequestedAt = new Date();
   
    const allNonCancelledReturnRequested = order.orderItems.every(
      i => i.status === 'Return Request' || i.status === 'Returned' || i.status === 'Cancelled'
    );
    if (allNonCancelledReturnRequested) {
      order.status = 'Return Request';
      order.returnReason = reason;
      order.returnDetails = details;
      order.returnRequestedAt = new Date();
    }

    await order.save();

    res.json({ 
      success: true, 
      message: `Return request for ${item.productName} (${variantSize}ml) submitted successfully`
    });
    
  } catch (error) {
    console.error('Error submitting return request:', error.message);
    res.status(500).json({ success: false, error: 'Failed to submit return request' });
  }
};


const returnAllOrder = async (req, res) => {
  try {
    const user = req.session.user;
    const userId = user?._id || user?.id;
    const { orderId } = req.params;
    const { reason, details } = req.body;

    console.log('Return entire order request:', { orderId, reason, details });

    if (!user || !mongoose.Types.ObjectId.isValid(userId)) {
      console.log('Unauthorized: Invalid user or userId');
      return res.status(401).json({ success: false, error: 'Unauthorized' });
    }

    const order = await Order.findOne({ orderId, user: userId });
    if (!order) {
      console.log('Order not found:', { orderId, userId });
      return res.status(404).json({ success: false, error: 'Order not found' });
    }
 
    const allNonCancelledDelivered = order.orderItems.every(
      item => item.status === 'Delivered' || item.status === 'Cancelled'
    );
    if (!allNonCancelledDelivered) {
      console.log('Not all non-cancelled items are delivered:', order.orderItems.map(i => ({ productName: i.productName, status: i.status })));
      return res.status(400).json({ success: false, error: 'Return can only be requested when all non-cancelled items are delivered' });
    }

    const now = Date.now();
    const allWithinReturnWindow = order.orderItems.every(item => {
      if (item.status === 'Cancelled') return true;
      const deliveredDate = item.deliveredAt || order.deliveredAt || order.createdOn;
      const returnWindow = new Date(deliveredDate);
      returnWindow.setDate(returnWindow.getDate() + 7);
      return now <= returnWindow.getTime();
    });

    if (!allWithinReturnWindow) {
      console.log('Return window expired for some items:', order.orderItems.map(i => ({ productName: i.productName, deliveredAt: i.deliveredAt })));
      return res.status(400).json({ success: false, error: 'Return window has expired for some items' });
    }


    order.orderItems.forEach(item => {
      if (item.status === 'Delivered') {
        item.status = 'Return Request';
        item.returnReason = reason;
        item.returnDetails = details;
        item.returnRequestedAt = new Date();
      }
    });
    
    order.status = 'Return Request';
    order.returnReason = reason;
    order.returnDetails = details;
    order.returnRequestedAt = new Date();

    await order.save();

    console.log('Return request submitted for entire order:', orderId);
    res.json({ 
      success: true, 
      message: 'Return request for entire order submitted successfully' 
    });
    
  } catch (error) {
    console.error('Error submitting return request for order:', error.message, error.stack);
    res.status(500).json({ success: false, error: 'Failed to submit return request' });
  }
};

const cancelReturnSingleOrder = async (req, res) => {
  try {
    const user = req.session.user;
    const userId = user?._id || user?.id;
    const { orderId, itemIndex, variantSize } = req.params;

    if (!user || !mongoose.Types.ObjectId.isValid(userId)) {
      return res.status(401).json({ success: false, error: 'Unauthorized' });
    }

    const order = await Order.findOne({ orderId, user: userId });
    if (!order) {
      return res.status(404).json({ success: false, error: 'Order not found' });
    }

    const idx = parseInt(itemIndex);
    if (isNaN(idx) || idx < 0 || idx >= order.orderItems.length) {
      return res.status(404).json({ success: false, error: 'Invalid item index' });
    }

    const item = order.orderItems[idx];
    
    // CRITICAL: Verify variant matches
    if (String(item.variantSize) !== String(variantSize)) {
      return res.status(400).json({ 
        success: false, 
        error: 'Variant mismatch. Cannot cancel return.' 
      });
    }

    if (item.status !== 'Return Request') {
      return res.status(400).json({ success: false, error: 'Can only cancel pending return requests' });
    }

    item.status = 'Delivered';
    item.returnReason = undefined;
    item.returnDetails = undefined;
    item.returnRequestedAt = undefined;

    const allReturnRequest = order.orderItems.every(i => i.status === 'Return Request' || i.status === 'Returned');
    if (!allReturnRequest) {
      order.status = 'Delivered';
      order.returnReason = undefined;
      order.returnDetails = undefined;
      order.returnRequestedAt = undefined;
    }

    await order.save();

    res.json({ 
      success: true, 
      message: `Return request for ${item.productName} (${variantSize}ml) cancelled successfully`
    });
    
  } catch (error) {
    console.error('Error cancelling return request:', error);
    res.status(500).json({ success: false, error: 'Failed to cancel return request' });
  }
};

const cancelReturnAllOrder = async (req, res) => {
  try {
    const user = req.session.user;
    const userId = user?._id || user?.id;
    const { orderId } = req.params;

    if (!user || !mongoose.Types.ObjectId.isValid(userId)) {
      return res.status(401).json({ success: false, error: 'Unauthorized' });
    }

    const order = await Order.findOne({ orderId, user: userId });
    if (!order) {
      return res.status(404).json({ success: false, error: 'Order not found' });
    }

    if (order.status !== 'Return Request') {
      return res.status(400).json({ success: false, error: 'Can only cancel pending return requests' });
    }

    order.orderItems.forEach(item => {
      if (item.status === 'Return Request') {
        item.status = 'Delivered';
        item.returnReason = undefined;
        item.returnDetails = undefined;
        item.returnRequestedAt = undefined;
      }
    });

    order.status = 'Delivered';
    order.returnReason = undefined;
    order.returnDetails = undefined;
    order.returnRequestedAt = undefined;

    await order.save();

    res.json({ 
      success: true, 
      message: 'Return request for entire order cancelled successfully' 
    });
    
  } catch (error) {
    console.error('Error cancelling return request for order:', error);
    res.status(500).json({ success: false, error: 'Failed to cancel return request' });
  }
};

const updateItemStatus = async (orderId, productName, newStatus, shippedLocation = null, outForDeliveryLocation = null) => {
  const order = await Order.findOne({ orderId });
  if (!order) throw new Error('Order not found');

  const item = order.orderItems.find(item => item.productName === productName);
  if (!item) throw new Error('Item not found');

  const now = new Date();
  const formatDateTime = (date) => ({
    date: date.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }),
    time: date.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: true })
  });

  if (!item.tracking.estimatedDeliveryDate && newStatus !== 'Delivered') {
    const deliveryDate = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
    item.tracking.estimatedDeliveryDate = deliveryDate.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
  }
 
  const statusTimestamps = [
    { status: 'Placed', dateField: 'placedDate', timeField: 'placedTime' },
    { status: 'Confirmed', dateField: 'confirmedDate', timeField: 'confirmedTime' },
    { status: 'Processing', dateField: 'processingDate', timeField: 'processingTime' },
    { status: 'Shipped', dateField: 'shippedDate', timeField: 'shippedTime' },
    { status: 'OutForDelivery', dateField: 'outForDeliveryDate', timeField: 'outForDeliveryTime' },
    { status: 'Delivered', dateField: 'deliveredDate', timeField: 'deliveredTime' }
  ];

  const statusPriority = {
    'Placed': 1,
    'Confirmed': 2,
    'Processing': 3,
    'Shipped': 4,
    'OutForDelivery': 5,
    'Delivered': 6,
    'Cancelled': 7,
    'Return Request': 8,
    'Returned': 9
  };

  item.status = newStatus;

  const currentPriority = statusPriority[newStatus] || 0;
  statusTimestamps.forEach(({ status, dateField, timeField }, index) => {
    if (statusPriority[status] <= currentPriority && status !== 'Delivered' && newStatus !== 'Cancelled' && newStatus !== 'Return Request' && newStatus !== 'Returned') {
      if (!item.tracking[dateField]) {
        const simulatedDate = new Date(now.getTime() - (currentPriority - statusPriority[status]) * 24 * 60 * 60 * 1000);
        const formatted = formatDateTime(simulatedDate);
        item.tracking[dateField] = formatted.date;
        item.tracking[timeField] = formatted.time;
      }
    }
  });

  
  switch (newStatus) {
    case 'Confirmed':
      if (!item.tracking.confirmedDate) {
        const formatted = formatDateTime(now);
        item.tracking.confirmedDate = formatted.date;
        item.tracking.confirmedTime = formatted.time;
      }
      break;
    case 'Processing':
      if (!item.tracking.processingDate) {
        const formatted = formatDateTime(now);
        item.tracking.processingDate = formatted.date;
        item.tracking.processingTime = formatted.time;
      }
      break;
    case 'Shipped':
      if (!item.tracking.shippedDate) {
        const formatted = formatDateTime(now);
        item.tracking.shippedDate = formatted.date;
        item.tracking.shippedTime = formatted.time;
      }
      item.tracking.shippedLocation = shippedLocation || 'Warehouse XYZ';
      break;
    case 'OutForDelivery':
      if (!item.tracking.outForDeliveryDate) {
        const formatted = formatDateTime(now);
        item.tracking.outForDeliveryDate = formatted.date;
        item.tracking.outForDeliveryTime = formatted.time;
      }
      item.tracking.outForDeliveryLocation = outForDeliveryLocation || 'Local Hub ABC';
      break;
    case 'Delivered':
      if (!item.tracking.deliveredDate) {
        const formatted = formatDateTime(now);
        item.tracking.deliveredDate = formatted.date;
        item.tracking.deliveredTime = formatted.time;
      }
      item.tracking.estimatedDeliveryDate = null; 
      break;
    case 'Cancelled':
      item.cancelledAt = now;
      break;
    case 'Return Request':
      item.returnRequestedAt = now;
      break;
    case 'Returned':
      item.returnedAt = now;
      break;
  }

  
  const allStatuses = order.orderItems.map(item => item.status);
  order.status = allStatuses.every(s => s === 'Delivered') ? 'Delivered' :
                 allStatuses.includes('Cancelled') && allStatuses.every(s => s === 'Cancelled' || s === 'Delivered') ? 'Cancelled' :
                 allStatuses.includes('Return Request') ? 'Return Request' :
                 allStatuses.includes('Returned') ? 'Returned' :
                 allStatuses.includes('OutForDelivery') ? 'OutForDelivery' :
                 allStatuses.includes('Shipped') ? 'Shipped' :
                 allStatuses.includes('Processing') ? 'Processing' :
                 'Placed';

  await order.save();
  return order;
};

const updateItemStatusRoute = async (req, res) => {
  try {
    const { orderId, productName } = req.params;
    const { status, shippedLocation, outForDeliveryLocation } = req.body;
    const order = await updateItemStatus(orderId, productName, status, shippedLocation, outForDeliveryLocation);
    res.json({ success: true, order });
  } catch (error) {
    console.error('Error updating status:', error);
    res.status(500).json({ success: false, error: error.message });
  }
};

const getOrderList = async (req, res) => {
  try {
    const user = req.session.user;
    const userId = user?._id || user?.id;

    if (!user || !userId || !mongoose.Types.ObjectId.isValid(userId)) {
      console.log('Redirecting to /login due to invalid user or userId:', { user, userId });
      return res.redirect('/login');
    }

 
    const userData = await User.findById(userId).lean();
    if (!userData) {
      console.log('User not found in database:', userId);
      return res.redirect('/login');
    }
    
    const orders = await Order.find({ user: userId })
      .populate('orderItems.product')
      .sort({ createdOn: -1 })
      .lean();

    const itemStats = {
      totalItems: 0,
      processing: 0,
      delivered: 0,
      totalSpent: 0
    };

    orders.forEach(order => {
      order.orderItems.forEach(item => {
        const quantity = item.quantity || 1;
        const itemStatus = (item.status || order.status || 'Pending').toLowerCase();
        console.log(`Item: ${item.productName || 'Unknown'}, Status: ${itemStatus}, Quantity: ${quantity}, Price: ${item.total || item.price || 0}`);
        itemStats.totalItems += quantity;
        if (itemStatus === 'processing') {
          itemStats.processing += quantity;
        } else if (itemStatus === 'delivered') {
          itemStats.delivered += quantity;
        }
      
        if (itemStatus !== 'cancelled') {
          itemStats.totalSpent += (item.total || item.price || 0) * quantity;
        }
      });
    });

    
    const formattedOrders = orders.map((order) => {
     
      const deliveredDate = order.deliveredAt || order.createdOn;
      const returnDate = new Date(deliveredDate);
      returnDate.setDate(returnDate.getDate() + 7); 
      const isReturnEligible = order.orderItems.some(
        item => item.status === 'Delivered' && Date.now() <= returnDate
      );
     
      const isNew = (Date.now() - new Date(order.createdOn).getTime()) < (7 * 24 * 60 * 60 * 1000);
      
      const deliveryAddress = order.deliveryAddress
        ? `${order.deliveryAddress.name}, ${order.deliveryAddress.houseName}, ${order.deliveryAddress.city}, ${order.deliveryAddress.state} - ${order.deliveryAddress.pincode}`
        : userData.name || 'N/A';

   
      const items = order.orderItems.map((item) => ({
        productName: item.productName || item.product?.productName || 'Product',
        productVariant: item.variantSize ? `${item.variantSize}ml` : 'Standard',
        quantity: item.quantity || 1,
        price: item.price || 0,
        status: item.status || order.status || 'Pending',
        returnEligible: item.status === 'Delivered' && Date.now() <= returnDate,
        returnDate: item.status === 'Delivered' ? returnDate : null,
        isNew: isNew,
        product: {
          images: item.product?.images || ['/placeholder.jpg']
        }
      }));

      return {
        orderId: order.orderId || order._id.toString(),
        date: order.createdOn,
        status: order.status || 'Pending',
        total: order.finalAmount || 0,
        shipTo: deliveryAddress,
        returnEligible: isReturnEligible,
        returnDate: isReturnEligible ? returnDate : null,
        isNew: isNew,
        items: items
      };
    });

    console.log('Item stats:', itemStats);
    console.log('Formatted orders:', JSON.stringify(formattedOrders.map(o => ({
      orderId: o.orderId,
      status: o.status,
      items: o.items.map(i => ({ productName: i.productName, status: i.status, price: i.price }))
    })), null, 2));

    const ordersPerPage = 5;
    const totalOrders = formattedOrders.length;
    const totalPages = Math.ceil(totalOrders / ordersPerPage);
    const currentPage = Math.max(1, parseInt(req.query.page) || 1);
    const startIndex = (currentPage - 1) * ordersPerPage;
    const paginatedOrders = formattedOrders.slice(startIndex, startIndex + ordersPerPage);

    res.render('orderList', {
      customerName: userData.name || 'Guest',
      user: userData,
      orders: paginatedOrders,
      itemStats: itemStats,
      totalOrders: totalOrders,
      totalPages: totalPages,
      currentPage: currentPage,
      ordersPerPage: ordersPerPage,
      success: req.flash('success'),
    });
  } catch (error) {
    console.error('Error fetching orders:', error.message, error.stack);
    res.status(500).render('orderList', {
      customerName: 'Guest',
      user: null,
      orders: [],
      itemStats: { totalItems: 0, processing: 0, delivered: 0, totalSpent: 0 },
      totalOrders: 0,
      totalPages: 0,
      currentPage: 1,
      ordersPerPage: 5,
      error: 'Failed to load orders',
      success: req.flash('success'),
    });
  }
};


module.exports = {
  getOrderSuccess,
  getOrderDetails,
  getOrderList,
  cancelSingleOrder,
  cancelAllOrder,
  returnSingleOrder,
  returnAllOrder,
  cancelReturnSingleOrder,
  cancelReturnAllOrder,
  updateItemStatus,
 updateItemStatusRoute
};