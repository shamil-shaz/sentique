

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
      .lean();

    console.log('Latest order:', latestOrder);

    if (!latestOrder) {
      console.log('No order found for user:', userId);
      return res.render('orderSuccess', {
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

    // Get the latest order for this user
    const latestOrder = await Order.findOne({ user: userId })
      .sort({ createdOn: -1 })
      .lean();

    console.log('Latest order:', latestOrder);

    if (!latestOrder) {
      console.log('No order found for user:', userId);
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

    // Format order items
    const formattedItems = latestOrder.orderItems.map((item) => ({
      productName: item.productName,
      variantSize: item.variantSize ? `${item.variantSize}ml` : 'N/A',
      quantity: item.quantity,
      price: `₹${item.price}`,
      total: `₹${item.total}`,
      image: item.image || 'data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" width="130" height="130"%3E%3Crect fill="%23ddd" width="130" height="130"/%3E%3Ctext x="50%25" y="50%25" dominant-baseline="middle" text-anchor="middle" font-family="sans-serif" font-size="14" fill="%23666"%3EProduct%3C/text%3E%3C/svg%3E', // Fallback image
    }));

    console.log('Formatted items:', formattedItems);
    console.log('Flash messages in getOrderDetails:', req.flash());

    res.render('orderDetails', {
      orderId: latestOrder.orderId || 'N/A',
      date: formattedDate,
      status: latestOrder.status || 'Pending',
      paymentMethod: latestOrder.paymentMethod || 'Unknown',
      amount: latestOrder.finalAmount ? `₹${latestOrder.finalAmount}` : 'N/A',
      deliveryDate: formattedDelivery,
      items: formattedItems,
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



const getOrderList = async (req, res) => {
  try {
    // Get user from session
    const user = req.session.user;
    const userId = user?._id || user?.id;

    // Validate user and userId
    if (!user || !mongoose.Types.ObjectId.isValid(userId)) {
      console.log('Redirecting to /login due to invalid user or userId');
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
      .sort({ createdOn: -1 }) // Sort by creation date, newest first
      .lean();

    // Format orders for the view
    const formattedOrders = orders.map((order) => {
      // Get the first item for display (as per template)
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
        productName: firstItem.productName || 'Product',
        productImage: firstItem.image || '/placeholder.jpg',
        productVariant: firstItem.variantSize ? `${firstItem.variantSize}ml` : 'Standard',
        shipTo: deliveryAddress,
        quantity: firstItem.quantity || 1,
        returnEligible: isReturnEligible,
        returnDate: isReturnEligible ? returnDate : null,
        isNew: isNew,
      };
    });

    console.log('Formatted orders:', formattedOrders);

    res.render('orderList', {
      customerName: userData.name || 'Guest',
      user: userData, // Pass user object for profile-sidebar.ejs
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
  getOrderList
};