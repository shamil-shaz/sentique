

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


// const getOrderDetails = async (req, res) => {
//   try {
//     const user = req.session.user;
//     console.log('Session user in getOrderDetails:', user);

//     // Use user.id if user._id is undefined
//     const userId = user?._id || user?.id;
//     if (!user || !mongoose.Types.ObjectId.isValid(userId)) {
//       console.log('Redirecting to /login due to invalid user or userId');
//       return res.redirect('/login');
//     }

//     // Get the latest order for this user
//     const latestOrder = await Order.findOne({ user: userId })
//       .sort({ createdOn: -1 })
//       .lean();

//     console.log('Latest order:', latestOrder);

//     if (!latestOrder) {
//       console.log('No order found for user:', userId);
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
//         success: req.flash('success'),
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

//     // Format order items
//     const formattedItems = latestOrder.orderItems.map((item) => ({
//       productName: item.productName,
//       variantSize: item.variantSize ? `${item.variantSize}ml` : 'N/A',
//       quantity: item.quantity,
//       price: `₹${item.price}`,
//       total: `₹${item.total}`,
//       image: item.image || 'data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" width="130" height="130"%3E%3Crect fill="%23ddd" width="130" height="130"/%3E%3Ctext x="50%25" y="50%25" dominant-baseline="middle" text-anchor="middle" font-family="sans-serif" font-size="14" fill="%23666"%3EProduct%3C/text%3E%3C/svg%3E', // Fallback image
//     }));

//     console.log('Formatted items:', formattedItems);
//     console.log('Flash messages in getOrderDetails:', req.flash());

//     res.render('orderDetails', {
//       orderId: latestOrder.orderId || 'N/A',
//       date: formattedDate,
//       status: latestOrder.status || 'Pending',
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
//       success: req.flash('success'),
//     });
//   } catch (error) {
//     console.error('Error loading order details page:', error.message, error.stack);
//     res.redirect('/pageNotFound');
//   }
// };


// const getOrderDetails = async (req, res) => {
//   try {
//     const user = req.session.user;
//     console.log('Session user in getOrderDetails:', user);

//     // Use user.id if user._id is undefined
//     const userId = user?._id || user?.id;
//     if (!user || !mongoose.Types.ObjectId.isValid(userId)) {
//       console.log('Redirecting to /login due to invalid user or userId');
//       return res.redirect('/login');
//     }

//     // Get the order by orderId from params
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
//         success: req.flash('success'),
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

//     // Format order items
//     const formattedItems = latestOrder.orderItems.map((item) => ({
//       productName: item.productName,
//       variantSize: item.variantSize ? `${item.variantSize}ml` : 'N/A',
//       quantity: item.quantity,
//       price: `₹${item.price}`,
//       total: `₹${item.total}`,
//       image: item.product?.images && item.product.images[0]
//         ? (item.product.images[0].startsWith('http')
//             ? item.product.images[0]
//             : `/uploads/product-images/${item.product.images[0]}`)
//         : 'https://via.placeholder.com/130x130?text=No+Image',
//     }));

//     console.log('Formatted items:', JSON.stringify(formattedItems, null, 2));
//     console.log('Flash messages in getOrderDetails:', req.flash());

//     res.render('orderDetails', {
//       orderId: latestOrder.orderId || 'N/A',
//       date: formattedDate,
//       status: latestOrder.status || 'Pending',
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
//       success: req.flash('success'),
//     });
//   } catch (error) {
//     console.error('Error loading order details page:', error.message, error.stack);
//     res.redirect('/pageNotFound');
//   }
// };

// const cancelSingleOrder = async (req, res) => {
//   try {
//     const user = req.session.user;
//     const userId = user?._id || user?.id;
//     const { orderId, productName } = req.params;
//     const { reason, details } = req.body;

//     if (!user || !mongoose.Types.ObjectId.isValid(userId)) {
//       return res.status(401).json({ error: 'Unauthorized' });
//     }

//     const order = await Order.findOne({ orderId, user: userId });
//     if (!order) {
//       return res.status(404).json({ error: 'Order not found' });
//     }

//     if (order.status === 'Delivered' || order.status === 'Cancelled') {
//       return res.status(400).json({ error: 'Order cannot be cancelled' });
//     }

//     const item = order.orderItems.find(i => i.productName === productName);
//     if (!item) {
//       return res.status(404).json({ error: 'Item not found' });
//     }

//     // Add a status property if not already in schema
//     item.status = 'Cancelled';

//     // Update total price
//     order.finalAmount -= item.total;
//     if (order.finalAmount < 0) order.finalAmount = 0;

//     // If all items cancelled → mark entire order as cancelled
//     const allCancelled = order.orderItems.every(i => i.status === 'Cancelled');
//     if (allCancelled) {
//       order.status = 'Cancelled';
//       order.cancelReason = reason;
//       order.cancelDetails = details;
//     }

//     await order.save();

//     req.flash('success', `Item ${productName} cancelled successfully`);
//     res.json({ success: true });
//   } catch (error) {
//     console.error('Error cancelling item:', error);
//     res.status(500).json({ error: 'Failed to cancel item' });
//   }
// };


// const cancelAllOrder = async (req, res) => {
//   try {
//     const user = req.session.user;
//     const userId = user?._id || user?.id;
//     const { orderId } = req.params;
//     const { reason, details } = req.body;

//     if (!user || !mongoose.Types.ObjectId.isValid(userId)) {
//       return res.status(401).json({ error: 'Unauthorized' });
//     }

//     const order = await Order.findOne({ orderId, user: userId });
//     if (!order) {
//       return res.status(404).json({ error: 'Order not found' });
//     }

//     if (order.status === 'Delivered' || order.status === 'Cancelled') {
//       return res.status(400).json({ error: 'Order cannot be cancelled' });
//     }

//     // Update all items to "Cancelled"
//     order.orderItems.forEach(item => (item.status = 'Cancelled'));

//     order.status = 'Cancelled';
//     order.cancelReason = reason;
//     order.cancelDetails = details;

//     await order.save();

//     req.flash('success', 'Order cancelled successfully');
//     res.json({ success: true });
//   } catch (error) {
//     console.error('Error cancelling order:', error);
//     res.status(500).json({ error: 'Failed to cancel order' });
//   }
// };



const getOrderDetails = async (req, res) => {
  try {
    const user = req.session.user;
    console.log('Session user in getOrderDetails:', user);

    // Use user.id if user._id is undefined
    const userId = user?._id || user?.id;
    if (!user || !mongoose.Types.ObjectId.isValid(userId)) {
      console.log('Redirecting to /login due to invalid user or userId');
      return res.redirect('/login');
    }

    // Get the order by orderId from params
    const orderId = req.params.orderId;
    const latestOrder = await Order.findOne({ orderId, user: userId })
      .populate('orderItems.product')
      .lean();

    console.log('Latest order:', JSON.stringify(latestOrder, null, 2));

    if (!latestOrder) {
      console.log('No order found for user:', userId, 'with orderId:', orderId);
      return res.render('orderDetails', {
        orderId: 'N/A',
        date: 'N/A',
        status: 'N/A',
        paymentMethod: 'N/A',
        amount: 'N/A',
        deliveryDate: 'N/A',
        items: [],
        deliveryAddress: {
          name: 'N/A',
          houseName: 'N/A',
          city: 'N/A',
          state: 'N/A',
          pincode: 'N/A',
          phone: 'N/A',
        },
        success: req.flash('success'),
      });
    }

    // Format date
    const orderDate = new Date(latestOrder.createdOn);
    const formattedDate = orderDate.toLocaleDateString('en-IN', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
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
    const deliveryAddress = latestOrder.deliveryAddress || {
      name: 'N/A',
      houseName: 'N/A',
      city: 'N/A',
      state: 'N/A',
      pincode: 'N/A',
      phone: 'N/A',
    };

    // Format order items with status check
    const formattedItems = latestOrder.orderItems.map((item) => ({
      productName: item.productName,
      variantSize: item.variantSize ? `${item.variantSize}ml` : 'N/A',
      quantity: item.quantity,
      price: `₹${item.price}`,
      total: `₹${item.total}`,
      // IMPORTANT: Pass the item status to frontend
      itemStatus: item.status || 'Active',
      status: item.status || 'Active', // Add both for compatibility
      image: item.product?.images && item.product.images[0]
        ? (item.product.images[0].startsWith('http')
            ? item.product.images[0]
            : `/uploads/product-images/${item.product.images[0]}`)
        : 'https://via.placeholder.com/130x130?text=No+Image',
    }));

    console.log('Formatted items:', JSON.stringify(formattedItems, null, 2));
    console.log('Flash messages in getOrderDetails:', req.flash());

    res.render('orderDetails', {
      orderId: latestOrder.orderId || 'N/A',
      date: formattedDate,
      status: latestOrder.status || 'Pending', // Pass order status
      paymentMethod: latestOrder.paymentMethod || 'Unknown',
      amount: latestOrder.finalAmount ? `₹${latestOrder.finalAmount}` : 'N/A',
      deliveryDate: formattedDelivery,
      items: formattedItems, // Items now include status
      deliveryAddress: {
        name: deliveryAddress.name,
        houseName: deliveryAddress.houseName,
        city: deliveryAddress.city,
        state: deliveryAddress.state,
        pincode: deliveryAddress.pincode,
        phone: deliveryAddress.phone,
      },
      success: req.flash('success'),
    });
  } catch (error) {
    console.error('Error loading order details page:', error.message, error.stack);
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

    // Format orders for the view
    const formattedOrders = orders.map((order) => {
      // Get the first item for display
      const firstItem = order.orderItems[0] || {};

      // Calculate return eligibility and date
      const deliveredDate = order.deliveredAt || order.createdOn;
      const returnDate = new Date(deliveredDate);
      returnDate.setDate(returnDate.getDate() + 7); // 7-day return window
      const isReturnEligible = order.status === 'delivered' && Date.now() <= returnDate;

      // Check if order is new (within 7 days)
      const isNew = (Date.now() - new Date(order.createdOn).getTime()) < (7 * 24 * 60 * 60 * 1000);

      // Format delivery address
      const deliveryAddress = order.deliveryAddress
        ? `${order.deliveryAddress.name}, ${order.deliveryAddress.houseName}, ${order.deliveryAddress.city}, ${order.deliveryAddress.state} - ${order.deliveryAddress.pincode}`
        : userData.name || 'N/A';

      return {
        orderId: order.orderId || order._id.toString(),
        date: order.createdOn,
        status: order.status || 'pending',
        total: order.finalAmount || 0,
        productName: firstItem.productName || firstItem.product?.productName || 'Product',
        productVariant: firstItem.variantSize ? `${firstItem.variantSize}ml` : 'Standard',
        shipTo: deliveryAddress,
        quantity: firstItem.quantity || 1,
        returnEligible: isReturnEligible,
        returnDate: isReturnEligible ? returnDate : null,
        isNew: isNew,
        product: {
          images: firstItem.product?.images || ['/placeholder.jpg']
        }
      };
    });

    console.log('Formatted orders:', JSON.stringify(formattedOrders, null, 2));

    res.render('orderList', {
      customerName: userData.name || 'Guest',
      user: userData,
      orders: formattedOrders,
      success: req.flash('success'),
    });
  } catch (error) {
    console.error('Error fetching orders:', error.message, error.stack);
    res.status(500).render('orderList', {
      customerName: 'Guest',
      user: null,
      orders: [],
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
};