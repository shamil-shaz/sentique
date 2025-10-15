

const mongoose = require('mongoose');
const Cart = require('../../models/cartSchema');
const Address = require('../../models/addressSchema');
const Product = require('../../models/productSchema');
const User = require('../../models/userSchema');
const Order=require('../../models/orderSchema')

const getOrderSuccess = async (req, res) => {
  try {
    const user = req.session.user;
    console.log('Session user in getOrderSuccess:', user);

    // Use user.id if user._id is undefined
    const userId = user?._id || user?.id;
    if (!user || !mongoose.Types.ObjectId.isValid(userId)) {
      console.log('Redirecting to /login due to invalid user or userId');
      return res.redirect('/login');
    }

    // Get the latest order for this user
    const latestOrder = await Order.findOne({ user: userId })
      .sort({ createdOn: -1 })
      .populate('orderItems.product')
      .lean();

    console.log('Latest order:', latestOrder);

    if (!latestOrder) {
      console.log('No order found for user:', userId);
      return res.render('orderSuccess', {
          images: product.images?.length ? product.images : ['default.jpg'],
        orderId: 'N/A',
        date: 'N/A',
        time: 'N/A',
        paymentMethod: 'N/A',
        amount: 'N/A',
        deliveryDate: 'N/A',
        items: [],
        deliveryAddress: 'N/A',
        success: req.flash('success'),
      });
    }

    // Format date and time
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

    // Estimated delivery = 5 days later
    const deliveryDate = new Date(orderDate);
    deliveryDate.setDate(deliveryDate.getDate() + 5);
    const formattedDelivery = deliveryDate.toLocaleDateString('en-IN', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
    });

    // Format delivery address
    const deliveryAddress = latestOrder.deliveryAddress
      ? `${latestOrder.deliveryAddress.name}, ${latestOrder.deliveryAddress.houseName}, ${latestOrder.deliveryAddress.city}, ${latestOrder.deliveryAddress.state} - ${latestOrder.deliveryAddress.pincode}`
      : 'N/A';

    // Format order items
    const formattedItems = latestOrder.orderItems.map((item) => ({
      productName: item.productName,
       productId: item.product,
      variantSize: item.variantSize ? `${item.variantSize}ml` : 'N/A',
      quantity: item.quantity,
      price: `₹${item.price}`,
      total: `₹${item.total}`,
    }));

    console.log('Formatted items:', formattedItems);
    console.log('Flash messages in getOrderSuccess:', req.flash());

    res.render('orderSuccess', {
      orderId: latestOrder.orderId || 'N/A',
      date: formattedDate,
      time: formattedTime,
      paymentMethod: latestOrder.paymentMethod || 'Unknown',
      amount: latestOrder.finalAmount ? `₹${latestOrder.finalAmount}` : 'N/A',
      deliveryDate: formattedDelivery,
      items: formattedItems,
      deliveryAddress: deliveryAddress,
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
    const { orderId, productName } = req.params;
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

    // Decode product name in case it has special characters
    const decodedProductName = decodeURIComponent(productName);
    const item = order.orderItems.find(i => i.productName === decodedProductName);
    
    if (!item) {
      return res.status(404).json({ success: false, error: 'Item not found' });
    }

    // Check if item is already cancelled
    if (item.status === 'Cancelled') {
      return res.status(400).json({ success: false, error: 'Item already cancelled' });
    }

    // Mark item as cancelled
    item.status = 'Cancelled';
    item.cancelReason = reason;
    item.cancelDetails = details;
    item.cancelledAt = new Date();

    // Update total price
    order.finalAmount -= item.total;
    if (order.finalAmount < 0) order.finalAmount = 0;

    // If all items cancelled → mark entire order as cancelled
    const allCancelled = order.orderItems.every(i => i.status === 'Cancelled');
    if (allCancelled) {
      order.status = 'Cancelled';
      order.cancelReason = reason;
      order.cancelDetails = details;
      order.cancelledAt = new Date();
    }

    await order.save();

    console.log(`Item ${decodedProductName} cancelled successfully`);
    
    // Return success response
    res.json({ 
      success: true, 
      message: `Item ${decodedProductName} cancelled successfully`,
      allCancelled: allCancelled
    });
    
  } catch (error) {
    console.error('Error cancelling item:', error);
    res.status(500).json({ success: false, error: 'Failed to cancel item' });
  }
};


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

    // Update all items to "Cancelled"
    order.orderItems.forEach(item => {
      item.status = 'Cancelled';
      item.cancelReason = reason;
      item.cancelDetails = details;
      item.cancelledAt = new Date();
    });

    // Mark entire order as cancelled
    order.status = 'Cancelled';
    order.cancelReason = reason;
    order.cancelDetails = details;
    order.cancelledAt = new Date();
    order.finalAmount = 0; // Set final amount to 0 when entire order is cancelled

    await order.save();

    console.log('Order cancelled successfully');
    
    // Return success response
    res.json({ 
      success: true, 
      message: 'Order cancelled successfully' 
    });
    
  } catch (error) {
    console.error('Error cancelling order:', error);
    res.status(500).json({ success: false, error: 'Failed to cancel order' });
  }
};


// const getOrderList = async (req, res) => {
//   try {
//     // Get user from session
//     const user = req.session.user;
//     const userId = user?._id || user?.id;

//     // Validate user and userId
//     if (!user || !userId || !mongoose.Types.ObjectId.isValid(userId)) {
//       console.log('Redirecting to /login due to invalid user or userId:', { user, userId });
//       return res.redirect('/login');
//     }

//     // Fetch user data
//     const userData = await User.findById(userId).lean();
//     if (!userData) {
//       console.log('User not found in database:', userId);
//       return res.redirect('/login');
//     }

//     // Fetch all orders for the user
//     const orders = await Order.find({ user: userId })
//       .populate('orderItems.product')
//       .sort({ createdOn: -1 })
//       .lean();

//     // Format orders for the view
//     const formattedOrders = orders.map((order) => {
//       // Get the first item for display
//       const firstItem = order.orderItems[0] || {};

//       // Calculate return eligibility and date
//       const deliveredDate = order.deliveredAt || order.createdOn;
//       const returnDate = new Date(deliveredDate);
//       returnDate.setDate(returnDate.getDate() + 7); // 7-day return window
//       const isReturnEligible = order.status === 'delivered' && Date.now() <= returnDate;

//       // Check if order is new (within 7 days)
//       const isNew = (Date.now() - new Date(order.createdOn).getTime()) < (7 * 24 * 60 * 60 * 1000);

//       // Format delivery address
//       const deliveryAddress = order.deliveryAddress
//         ? `${order.deliveryAddress.name}, ${order.deliveryAddress.houseName}, ${order.deliveryAddress.city}, ${order.deliveryAddress.state} - ${order.deliveryAddress.pincode}`
//         : userData.name || 'N/A';

//       return {
//         orderId: order.orderId || order._id.toString(),
//         date: order.createdOn,
//         status: order.status || 'pending',
//         total: order.finalAmount || 0,
//         productName: firstItem.productName || firstItem.product?.productName || 'Product',
//         productVariant: firstItem.variantSize ? `${firstItem.variantSize}ml` : 'Standard',
//         shipTo: deliveryAddress,
//         quantity: firstItem.quantity || 1,
//         returnEligible: isReturnEligible,
//         returnDate: isReturnEligible ? returnDate : null,
//         isNew: isNew,
//         product: {
//           images: firstItem.product?.images || ['/placeholder.jpg']
//         }
//       };
//     });

//     console.log('Formatted orders:', JSON.stringify(formattedOrders, null, 2));

//     res.render('orderList', {
//       customerName: userData.name || 'Guest',
//       user: userData,
//       orders: formattedOrders,
//       success: req.flash('success'),
//     });
//   } catch (error) {
//     console.error('Error fetching orders:', error.message, error.stack);
//     res.status(500).render('orderList', {
//       customerName: 'Guest',
//       user: null,
//       orders: [],
//       error: 'Failed to load orders',
//       success: req.flash('success'),
//     });
//   }
// };


const getOrderList = async (req, res) => {
  try {
    // Get user from session
    const user = req.session.user;
    const userId = user?._id || user?.id;

    // Validate user and userId
    if (!user || !userId || !mongoose.Types.ObjectId.isValid(userId)) {
      console.log('Redirecting to /login due to invalid user or userId:', { user, userId });
      return res.redirect('/login');
    }

    // Fetch user data
    const userData = await User.findById(userId).lean();
    if (!userData) {
      console.log('User not found in database:', userId);
      return res.redirect('/login');
    }

    // Fetch all orders for the user
    const orders = await Order.find({ user: userId })
      .populate('orderItems.product')
      .sort({ createdOn: -1 })
      .lean();

    // Calculate stats for items (not orders)
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
        // Only include non-cancelled items in totalSpent
        if (itemStatus !== 'cancelled') {
          itemStats.totalSpent += (item.total || item.price || 0) * quantity;
        }
      });
    });

    // Format orders for the view
    const formattedOrders = orders.map((order) => {
      // Calculate return eligibility and date
      const deliveredDate = order.deliveredAt || order.createdOn;
      const returnDate = new Date(deliveredDate);
      returnDate.setDate(returnDate.getDate() + 7); // 7-day return window
      const isReturnEligible = order.orderItems.some(
        item => item.status === 'Delivered' && Date.now() <= returnDate
      );

      // Check if order is new (within 7 days)
      const isNew = (Date.now() - new Date(order.createdOn).getTime()) < (7 * 24 * 60 * 60 * 1000);

      // Format delivery address
      const deliveryAddress = order.deliveryAddress
        ? `${order.deliveryAddress.name}, ${order.deliveryAddress.houseName}, ${order.deliveryAddress.city}, ${order.deliveryAddress.state} - ${order.deliveryAddress.pincode}`
        : userData.name || 'N/A';

      // Format all order items
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

    res.render('orderList', {
      customerName: userData.name || 'Guest',
      user: userData,
      orders: formattedOrders,
      itemStats: itemStats,
      success: req.flash('success'),
    });
  } catch (error) {
    console.error('Error fetching orders:', error.message, error.stack);
    res.status(500).render('orderList', {
      customerName: 'Guest',
      user: null,
      orders: [],
      itemStats: { totalItems: 0, processing: 0, delivered: 0, totalSpent: 0 },
      error: 'Failed to load orders',
      success: req.flash('success'),
    });
  }
};

// const getOrderDetails = async (req, res) => {
//   try {
//     const user = req.session.user;
//     console.log('Session user in getOrderDetails:', user);

//     const userId = user?._id || user?.id;
//     if (!user || !mongoose.Types.ObjectId.isValid(userId)) {
//       console.log('Redirecting to /login due to invalid user or userId');
//       return res.redirect('/login');
//     }

//     const orderId = req.params.orderId;
//     const latestOrder = await Order.findOne({ orderId, user: userId })
//       .populate('orderItems.product')
//       .lean();

//     console.log('Latest order:', JSON.stringify(latestOrder, null, 2));

//     if (!latestOrder) {
//       console.log('No order found for user:', userId, 'with orderId:', orderId);
//       return res.render('orderDetails', {
//         orderId: 'N/A',
//         date: 'N/A',
//         status: 'N/A',
//         paymentMethod: 'N/A',
//         amount: 'N/A',
//         deliveryDate: 'N/A',
//         items: [],
//         deliveryAddress: {
//           name: 'N/A',
//           houseName: 'N/A',
//           city: 'N/A',
//           state: 'N/A',
//           pincode: 'N/A',
//           phone: 'N/A',
//         },
//         isReturnEligible: false,
//         isShippedOrOut: false,
//         canCancelEntireOrder: false, // Added for safety
//         success: req.flash('success'),
//         tracking: null,
//       });
//     }

//     // Format date
//     const orderDate = new Date(latestOrder.createdOn);
//     const formattedDate = orderDate.toLocaleDateString('en-IN', {
//       day: '2-digit',
//       month: 'short',
//       year: 'numeric',
//     });

//     // Estimated delivery = 5 days later
//     const deliveryDate = new Date(orderDate);
//     deliveryDate.setDate(deliveryDate.getDate() + 5);
//     const formattedDelivery = deliveryDate.toLocaleDateString('en-IN', {
//       day: '2-digit',
//       month: 'short',
//       year: 'numeric',
//     });

//     // Format delivery address
//     const deliveryAddress = latestOrder.deliveryAddress || {
//       name: 'N/A',
//       houseName: 'N/A',
//       city: 'N/A',
//       state: 'N/A',
//       pincode: 'N/A',
//       phone: 'N/A',
//     };

//     // Format order items with per-item return eligibility
//     const formattedItems = latestOrder.orderItems.map((item) => {
//       let itemStatus = item.status || 'Active';
//       if (itemStatus === 'Active') {
//         itemStatus = latestOrder.status;
//       }
//       // Calculate return eligibility per item (7-day window from deliveredAt or createdOn)
//       const itemDeliveredDate = item.deliveredAt || latestOrder.deliveredAt || latestOrder.createdOn;
//       const returnDate = new Date(itemDeliveredDate);
//       returnDate.setDate(returnDate.getDate() + 7);
//       const isItemReturnEligible = itemStatus === 'Delivered' && Date.now() <= returnDate.getTime();

//       return {
//         productName: item.productName,
//         variantSize: item.variantSize ? `${item.variantSize}ml` : 'N/A',
//         quantity: item.quantity,
//         price: `₹${item.price}`,
//         total: `₹${item.total}`,
//         status: itemStatus,
//         isReturnEligible: isItemReturnEligible,
//         image: item.product?.images && item.product.images[0]
//           ? (item.product.images[0].startsWith('http')
//               ? item.product.images[0]
//               : `/Uploads/product-images/${item.product.images[0]}`)
//           : 'https://via.placeholder.com/130x130?text=No+Image',
//       };
//     });

//     // Compute status summary
//     const statusSummary = formattedItems.reduce((acc, item) => {
//       const status = item.status === 'OutForDelivery' ? 'Out for Delivery' : item.status;
//       acc[status] = (acc[status] || 0) + 1;
//       return acc;
//     }, {});

//     const statusSummaryString = Object.entries(statusSummary)
//       .map(([status, count]) => `${count} ${status}`)
//       .join(', ');

//     // Check if all non-cancelled items are delivered
//     const allNonCancelledDelivered = formattedItems.every(
//       item => item.status === 'Delivered' || item.status === 'Cancelled'
//     );

//     // Overall return eligibility for the order
//     const isReturnEligible = allNonCancelledDelivered && formattedItems.some(
//       item => item.isReturnEligible && item.status !== 'Cancelled'
//     );

//     // Check if any items are shipped or out for delivery
//     const isShippedOrOut = formattedItems.some(
//       item => item.status === 'Shipped' || item.status === 'OutForDelivery'
//     );

//     // Check if can cancel entire order (all non-cancelled items are in Pending, Processing, or Active)
//     const canCancelEntireOrder = formattedItems.every(
//       item => item.status === 'Cancelled' || item.status === 'Pending' || item.status === 'Processing' || item.status === 'Active'
//     ) && !formattedItems.every(item => item.status === 'Cancelled');

//     // Tracking data
//     const tracking = {
//       placedDate: latestOrder.tracking?.placedDate
//         ? new Date(latestOrder.tracking.placedDate).toLocaleDateString('en-IN', {
//             day: '2-digit',
//             month: 'short',
//             year: 'numeric',
//           })
//         : formattedDate,
//       confirmedDate: latestOrder.tracking?.confirmedDate
//         ? new Date(latestOrder.tracking.confirmedDate).toLocaleDateString('en-IN', {
//             day: '2-digit',
//             month: 'short',
//             year: 'numeric',
//           })
//         : 'Pending',
//       processingDate: latestOrder.tracking?.processingDate
//         ? new Date(latestOrder.tracking.processingDate).toLocaleDateString('en-IN', {
//             day: '2-digit',
//             month: 'short',
//             year: 'numeric',
//           })
//         : 'Pending',
//       shippedDate: latestOrder.tracking?.shippedDate
//         ? new Date(latestOrder.tracking.shippedDate).toLocaleDateString('en-IN', {
//             day: '2-digit',
//             month: 'short',
//             year: 'numeric',
//           })
//         : 'Pending',
//       shippedLocation: latestOrder.tracking?.shippedLocation || null,
//       outForDeliveryDate: latestOrder.tracking?.outForDeliveryDate
//         ? new Date(latestOrder.tracking.outForDeliveryDate).toLocaleDateString('en-IN', {
//             day: '2-digit',
//             month: 'short',
//             year: 'numeric',
//           })
//         : 'Pending',
//       outForDeliveryLocation: latestOrder.tracking?.outForDeliveryLocation || null,
//       deliveredDate: latestOrder.tracking?.deliveredDate
//         ? new Date(latestOrder.tracking.deliveredDate).toLocaleDateString('en-IN', {
//             day: '2-digit',
//             month: 'short',
//             year: 'numeric',
//           })
//         : 'Pending',
//       estimatedDeliveryDate: latestOrder.tracking?.estimatedDeliveryDate
//         ? new Date(latestOrder.tracking.estimatedDeliveryDate).toLocaleDateString('en-IN', {
//             day: '2-digit',
//             month: 'short',
//             year: 'numeric',
//           })
//         : formattedDelivery,
//     };

//     console.log('Formatted items:', JSON.stringify(formattedItems, null, 2));
//     console.log('Tracking data:', JSON.stringify(tracking, null, 2));
//     console.log('Status summary:', statusSummaryString);
//     console.log('All non-cancelled delivered:', allNonCancelledDelivered);
//     console.log('Is return eligible:', isReturnEligible);
//     console.log('Can cancel entire order:', canCancelEntireOrder);
//     console.log('Flash messages in getOrderDetails:', req.flash());

//     res.render('orderDetails', {
//       orderId: latestOrder.orderId || 'N/A',
//       date: formattedDate,
//       status: statusSummaryString || 'N/A',
//       paymentMethod: latestOrder.paymentMethod || 'Unknown',
//       amount: latestOrder.finalAmount ? `₹${latestOrder.finalAmount}` : 'N/A',
//       deliveryDate: formattedDelivery,
//       items: formattedItems,
//       deliveryAddress: {
//         name: deliveryAddress.name,
//         houseName: deliveryAddress.houseName,
//         city: deliveryAddress.city,
//         state: deliveryAddress.state,
//         pincode: deliveryAddress.pincode,
//         phone: deliveryAddress.phone,
//       },
//       isReturnEligible,
//       isShippedOrOut,
//       canCancelEntireOrder, // New flag for cancel button
//       success: req.flash('success'),
//       tracking,
//     });
//   } catch (error) {
//     console.error('Error loading order details page:', error.message, error.stack);
//     res.redirect('/pageNotFound');
//   }
// };



// const getOrderDetails = async (req, res) => {
//     try {
//         const user = req.session.user;
//         console.log('Session user in getOrderDetails:', user);

//         const userId = user?._id || user?.id;
//         if (!user || !mongoose.Types.ObjectId.isValid(userId)) {
//             console.log('Redirecting to /login due to invalid user or userId');
//             return res.redirect('/login');
//         }

//         const orderId = req.params.orderId;
//         const latestOrder = await Order.findOne({ orderId, user: userId })
//             .populate('orderItems.product')
//             .lean();

//         if (!latestOrder) {
//             console.log('No order found for user:', userId, 'with orderId:', orderId);
//             return res.redirect('/pageNotFound');
//         }

//         console.log('Latest order items:', JSON.stringify(latestOrder.orderItems, null, 2));

//         // Format date
//         const formattedDate = latestOrder.createdOn
//             ? new Date(latestOrder.createdOn).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })
//             : 'N/A';

//         // Estimated delivery = 5 days later
//         const deliveryDate = new Date(latestOrder.createdOn);
//         deliveryDate.setDate(deliveryDate.getDate() + 5);
//         const formattedDelivery = latestOrder.estimatedDeliveryDate
//             ? new Date(latestOrder.estimatedDeliveryDate).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })
//             : deliveryDate.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });

//         // Format delivery address
//         const deliveryAddress = latestOrder.deliveryAddress || {
//             name: 'N/A',
//             houseName: 'N/A',
//             city: 'N/A',
//             state: 'N/A',
//             pincode: 'N/A',
//             phone: 'N/A',
//         };

//         // Helper function to format date and time
//         const formatDateTime = (date) => {
//             if (!date) return { date: null, time: null };
//             const d = new Date(date);
//             return {
//                 date: d.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }),
//                 time: d.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: true })
//             };
//         };

//         // Format order items with per-item tracking
//         const formattedItems = latestOrder.orderItems.map(item => {
//             let itemStatus = item.status || 'Active';
//             if (itemStatus === 'Active') {
//                 itemStatus = latestOrder.status || 'Placed';
//             }
//             // Calculate return eligibility per item (7-day window from deliveredAt or createdOn)
//             const itemDeliveredDate = item.deliveredAt || latestOrder.deliveredAt || latestOrder.createdOn;
//             const returnDate = new Date(itemDeliveredDate);
//             returnDate.setDate(returnDate.getDate() + 7);
//             const isItemReturnEligible = itemStatus === 'Delivered' && Date.now() <= returnDate.getTime();

//             // Per-item tracking
//             const tracking = {
//                 placedDate: null,
//                 placedTime: null,
//                 confirmedDate: null,
//                 confirmedTime: null,
//                 processingDate: null,
//                 processingTime: null,
//                 shippedDate: null,
//                 shippedTime: null,
//                 shippedLocation: item.shippedLocation || latestOrder.tracking?.shippedLocation || 'Warehouse',
//                 outForDeliveryDate: null,
//                 outForDeliveryTime: null,
//                 outForDeliveryLocation: item.outForDeliveryLocation || latestOrder.tracking?.outForDeliveryLocation || deliveryAddress.city,
//                 deliveredDate: null,
//                 deliveredTime: null,
//                 estimatedDeliveryDate: formattedDelivery
//             };

//             // Set tracking fields based on item status
//             if (item.placedAt || latestOrder.createdOn) {
//                 const formatted = formatDateTime(item.placedAt || latestOrder.createdOn);
//                 tracking.placedDate = formatted.date;
//                 tracking.placedTime = formatted.time;
//             }
//             if (item.confirmedAt) {
//                 const formatted = formatDateTime(item.confirmedAt);
//                 tracking.confirmedDate = formatted.date;
//                 tracking.confirmedTime = formatted.time;
//             }
//             if (item.processingAt) {
//                 const formatted = formatDateTime(item.processingAt);
//                 tracking.processingDate = formatted.date;
//                 tracking.processingTime = formatted.time;
//             }
//             if (item.shippedAt) {
//                 const formatted = formatDateTime(item.shippedAt);
//                 tracking.shippedDate = formatted.date;
//                 tracking.shippedTime = formatted.time;
//             }
//             if (item.outForDeliveryAt) {
//                 const formatted = formatDateTime(item.outForDeliveryAt);
//                 tracking.outForDeliveryDate = formatted.date;
//                 tracking.outForDeliveryTime = formatted.time;
//             }
//             if (item.deliveredAt) {
//                 const formatted = formatDateTime(item.deliveredAt);
//                 tracking.deliveredDate = formatted.date;
//                 tracking.deliveredTime = formatted.time;
//             }

//             return {
//                 productName: item.productName || item.product?.name || 'Unknown Product',
//                 variantSize: item.variantSize ? `${item.variantSize}ml` : 'N/A',
//                 quantity: item.quantity || 1,
//                 price: item.price ? `₹${item.price.toFixed(2)}` : 'N/A',
//                 total: item.total ? `₹${item.total.toFixed(2)}` : 'N/A',
//                 status: itemStatus,
//                 isReturnEligible: isItemReturnEligible,
//                 image: item.product?.images?.[0]
//                     ? (item.product.images[0].startsWith('http')
//                         ? item.product.images[0]
//                         : `/Uploads/product-images/${item.product.images[0]}`)
//                     : 'https://via.placeholder.com/130x130?text=No+Image',
//                 placedAt: item.placedAt || latestOrder.createdOn,
//                 confirmedAt: item.confirmedAt,
//                 processingAt: item.processingAt,
//                 shippedAt: item.shippedAt,
//                 outForDeliveryAt: item.outForDeliveryAt,
//                 deliveredAt: item.deliveredAt,
//                 tracking
//             };
//         });

//         // Check if can cancel entire order
//         const canCancelEntireOrder = formattedItems.some(
//             item => ['Placed', 'Confirmed', 'Processing', 'Active'].includes(item.status)
//         );

//         // Check if any items are shipped or out for delivery
//         const isShippedOrOut = formattedItems.some(
//             item => item.status === 'Shipped' || item.status === 'OutForDelivery'
//         );

//         // Overall return eligibility for the order
//         const isReturnEligible = formattedItems.some(
//             item => item.status === 'Delivered' && item.isReturnEligible
//         );

//         // Collect unique active statuses
//         const statusPriority = {
//             'Placed': 1,
//             'Confirmed': 2,
//             'Processing': 3,
//             'Shipped': 4,
//             'OutForDelivery': 5,
//             'Delivered': 6,
//             'Cancelled': 7,
//             'Returned': 8,
//             'Return Request': 9
//         };

//         const activeStatuses = [...new Set(
//             formattedItems
//                 .filter(item => !['Cancelled', 'Returned', 'Return Request'].includes(item.status))
//                 .map(item => item.status)
//         )].sort((a, b) => statusPriority[a] - statusPriority[b]);

//         console.log('Active statuses:', activeStatuses);
//         console.log('Formatted items with tracking:', JSON.stringify(formattedItems.map(item => ({
//             productName: item.productName,
//             status: item.status,
//             tracking: item.tracking
//         })), null, 2));

//         res.render('orderDetails', {
//             orderId: latestOrder.orderId || latestOrder._id,
//             status: activeStatuses.join(', '), // Display all active statuses
//             date: formattedDate,
//             deliveryAddress: deliveryAddress,
//             paymentMethod: latestOrder.paymentMethod || 'N/A',
//             amount: latestOrder.finalAmount ? `₹${latestOrder.finalAmount.toFixed(2)}` : 'N/A',
//             deliveryDate: formattedDelivery,
//             items: formattedItems,
//             canCancelEntireOrder,
//             isReturnEligible,
//             isShippedOrOut,
//             activeStatuses,
//             success: req.flash('success')
//         });
//     } catch (error) {
//         console.error('Error fetching order details:', error);
//         res.redirect('/pageNotFound');
//     }
// };


const getOrderDetails = async (req, res) => {
  try {
    const user = req.session.user;
    console.log('Session user in getOrderDetails:', user);

    const userId = user?._id || user?.id;
    if (!user || !mongoose.Types.ObjectId.isValid(userId)) {
      console.log('Redirecting to /login due to invalid user or userId');
      return res.redirect('/login');
    }

    const orderId = req.params.orderId;
    const latestOrder = await Order.findOne({ orderId, user: userId })
      .populate('orderItems.product')
      .lean();

    if (!latestOrder) {
      console.log('No order found for user:', userId, 'with orderId:', orderId);
      return res.redirect('/pageNotFound');
    }

    console.log('Latest order items:', JSON.stringify(latestOrder.orderItems, null, 2));

    // Format order date
    const formattedDate = latestOrder.createdOn
      ? new Date(latestOrder.createdOn).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })
      : 'N/A';

    // Format delivery address
    const deliveryAddress = latestOrder.deliveryAddress || {
      name: 'N/A',
      houseName: 'N/A',
      city: 'N/A',
      state: 'N/A',
      pincode: 'N/A',
      phone: 'N/A',
    };

    // Format order items with tracking
    const formattedItems = latestOrder.orderItems.map(item => {
      let itemStatus = item.status || 'Placed';
      if (itemStatus === 'Active') {
        itemStatus = latestOrder.status || 'Placed';
      }

      // Calculate return eligibility (7-day window from deliveredAt or createdOn)
      const itemDeliveredDate = item.deliveredAt || latestOrder.deliveredAt || latestOrder.createdOn;
      const returnDate = new Date(itemDeliveredDate);
      returnDate.setDate(returnDate.getDate() + 7);
      const isItemReturnEligible = itemStatus === 'Delivered' && Date.now() <= returnDate.getTime();

      // Use tracking data directly (already formatted in updateItemStatus)
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
        productName: item.productName || item.product?.name || 'Unknown Product',
        variantSize: item.variantSize ? `${item.variantSize}ml` : 'N/A',
        quantity: item.quantity || 1,
        price: item.price ? `₹${item.price.toFixed(2)}` : 'N/A',
        total: item.total ? `₹${item.total.toFixed(2)}` : 'N/A',
        status: itemStatus,
        isReturnEligible: isItemReturnEligible,
        image: item.product?.images?.[0]
          ? (item.product.images[0].startsWith('http')
              ? item.product.images[0]
              : `/Uploads/product-images/${item.product.images[0]}`)
          : 'https://via.placeholder.com/130x130?text=No+Image',
        tracking
      };
    });

    // Check if can cancel entire order
    const canCancelEntireOrder = formattedItems.some(
      item => ['Placed', 'Confirmed', 'Processing', 'Active'].includes(item.status)
    );

    // Check if any items are shipped or out for delivery
    const isShippedOrOut = formattedItems.some(
      item => item.status === 'Shipped' || item.status === 'OutForDelivery'
    );

    // Overall return eligibility for the order
    const isReturnEligible = formattedItems.some(
      item => item.status === 'Delivered' && item.isReturnEligible
    );

    // Collect unique active statuses
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

    console.log('Active statuses:', activeStatuses);
    console.log('Formatted items with tracking:', JSON.stringify(formattedItems.map(item => ({
      productName: item.productName,
      status: item.status,
      tracking: item.tracking
    })), null, 2));

    res.render('orderDetails', {
      orderId: latestOrder.orderId || latestOrder._id,
      status: activeStatuses.join(', '),
      date: formattedDate,
      deliveryAddress: deliveryAddress,
      paymentMethod: latestOrder.paymentMethod || 'N/A',
      amount: latestOrder.finalAmount ? `₹${latestOrder.finalAmount.toFixed(2)}` : 'N/A',
      deliveryDate: latestOrder.estimatedDeliveryDate || 'N/A',
      items: formattedItems,
      canCancelEntireOrder,
      isReturnEligible,
      isShippedOrOut,
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
    const { orderId, productName } = req.params;
    const { reason, details } = req.body;

    console.log('Return single order request:', { orderId, productName, reason, details });

    if (!user || !mongoose.Types.ObjectId.isValid(userId)) {
      console.log('Unauthorized: Invalid user or userId');
      return res.status(401).json({ success: false, error: 'Unauthorized' });
    }

    const order = await Order.findOne({ orderId, user: userId });
    if (!order) {
      console.log('Order not found:', { orderId, userId });
      return res.status(404).json({ success: false, error: 'Order not found' });
    }

    const decodedProductName = decodeURIComponent(productName);
    const item = order.orderItems.find(i => i.productName === decodedProductName);
    
    if (!item) {
      console.log('Item not found:', decodedProductName);
      return res.status(404).json({ success: false, error: 'Item not found' });
    }

    // Check if item is delivered
    if (item.status !== 'Delivered') {
      console.log('Item not eligible for return:', { productName: decodedProductName, status: item.status });
      return res.status(400).json({ success: false, error: 'Return can only be requested for delivered items' });
    }

    // Check return window for the item
    const deliveredDate = item.deliveredAt || order.deliveredAt || order.createdOn;
    const returnWindow = new Date(deliveredDate);
    returnWindow.setDate(returnWindow.getDate() + 7);
    if (Date.now() > returnWindow.getTime()) {
      console.log('Return window expired for item:', { productName: decodedProductName, deliveredDate, returnWindow });
      return res.status(400).json({ success: false, error: 'Return window has expired' });
    }

    // Update item status to Return Request
    item.status = 'Return Request';
    item.returnReason = reason;
    item.returnDetails = details;
    item.returnRequestedAt = new Date();

    // Update order status if all non-cancelled items are in Return Request or Returned
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

    console.log('Return request submitted for item:', decodedProductName);
    res.json({ 
      success: true, 
      message: `Return request for ${decodedProductName} submitted successfully`
    });
    
  } catch (error) {
    console.error('Error submitting return request:', error.message, error.stack);
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

    // Check if all non-cancelled items are delivered
    const allNonCancelledDelivered = order.orderItems.every(
      item => item.status === 'Delivered' || item.status === 'Cancelled'
    );
    if (!allNonCancelledDelivered) {
      console.log('Not all non-cancelled items are delivered:', order.orderItems.map(i => ({ productName: i.productName, status: i.status })));
      return res.status(400).json({ success: false, error: 'Return can only be requested when all non-cancelled items are delivered' });
    }

    // Check return window for each delivered item
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

    // Update all non-cancelled items to Return Request
    order.orderItems.forEach(item => {
      if (item.status === 'Delivered') {
        item.status = 'Return Request';
        item.returnReason = reason;
        item.returnDetails = details;
        item.returnRequestedAt = new Date();
      }
    });

    // Update order status
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
    const { orderId, productName } = req.params;

    if (!user || !mongoose.Types.ObjectId.isValid(userId)) {
      return res.status(401).json({ success: false, error: 'Unauthorized' });
    }

    const order = await Order.findOne({ orderId, user: userId });
    if (!order) {
      return res.status(404).json({ success: false, error: 'Order not found' });
    }

    const decodedProductName = decodeURIComponent(productName);
    const item = order.orderItems.find(i => i.productName === decodedProductName);
    
    if (!item) {
      return res.status(404).json({ success: false, error: 'Item not found' });
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
      message: `Return request for ${decodedProductName} cancelled successfully`
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

  // Set estimated delivery date if not already set (7 days from now for non-Delivered statuses)
  if (!item.tracking.estimatedDeliveryDate && newStatus !== 'Delivered') {
    const deliveryDate = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
    item.tracking.estimatedDeliveryDate = deliveryDate.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
  }

  // Define status progression and timestamps
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

  // Set timestamps for the current status and all prior statuses
  const currentPriority = statusPriority[newStatus] || 0;
  statusTimestamps.forEach(({ status, dateField, timeField }, index) => {
    if (statusPriority[status] <= currentPriority && status !== 'Delivered' && newStatus !== 'Cancelled' && newStatus !== 'Return Request' && newStatus !== 'Returned') {
      if (!item.tracking[dateField]) {
        // Simulate realistic progression: add 1 day per status
        const simulatedDate = new Date(now.getTime() - (currentPriority - statusPriority[status]) * 24 * 60 * 60 * 1000);
        const formatted = formatDateTime(simulatedDate);
        item.tracking[dateField] = formatted.date;
        item.tracking[timeField] = formatted.time;
      }
    }
  });

  // Set specific fields for the current status
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
      item.tracking.estimatedDeliveryDate = null; // Clear estimated delivery
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

  // Update order status based on item statuses
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