// const Address = require('../../models/addressSchema');
// const Product = require('../../models/productSchema');
// const User = require('../../models/userSchema');
// const Order = require('../../models/orderSchema');

// const getAdminOrderList = async (req, res) => {
//     try {
//         // Fetch all orders with populated fields
//         const orders = await Order.find({})
//             .sort({ createdOn: -1 })
//             .populate('user')
//             .populate('orderItems.product')
//             .lean();

//         // Count pending cancellation requests
//         const pendingCancellations = orders.filter(order => 
//             order.cancellationRequest && 
//             order.cancellationRequest.status === 'pending'
//         );

//         // Prepare data for the view
//         const ordersData = orders.map(order => {
//             console.log('Processing Order:', order.orderId, 'Items:', order.orderItems.length);
//             const address = order.deliveryAddress 
//                 ? `${order.deliveryAddress.houseName}, ${order.deliveryAddress.city}, ${order.deliveryAddress.state} - ${order.deliveryAddress.pincode}` 
//                 : 'N/A';
            
//             return {
//                 id: order.orderId || order._id.toString().slice(-5).toUpperCase(),
//                 name: order.deliveryAddress ? order.deliveryAddress.name : (order.user ? order.user.name : 'N/A'),
//                 email: order.user ? order.user.email : 'N/A',
//                 phone: order.deliveryAddress ? order.deliveryAddress.phone : 'N/A',
//                 address,
//                 fullAddress: order.deliveryAddress || {},
//                 date: order.createdOn,
//                 status: order.status.toLowerCase(),
//                 paymentMethod: order.paymentMethod || 'N/A',
//                 paymentStatus: order.paymentStatus || 'N/A',
//                 totalAmount: order.finalAmount || 0,
//                 discount: order.discount || 0,
//                 couponApplied: order.couponApplied || null,
//                 cancellationRequest: order.cancellationRequest || null,
//                 products: order.orderItems.map(item => {
//                     let imagePath = 'https://via.placeholder.com/80x80?text=No+Image';

// if (item.product) {
//   const images = item.product.productImage || item.product.images;
//   if (images && images.length > 0) {
//     const firstImage = images[0];
//     imagePath = firstImage.startsWith('http') 
//       ? firstImage 
//       : `/uploads/product-images/${firstImage}`;
//   }
// }
// else {
//                         console.log('No image found for product:', item.productName, 'Product:', item.product);
//                     }
//                     return {
//                         productId: item.product ? item.product._id : null,
//                         product: item.productName || (item.product ? item.product.productName : 'Unknown Product'),
//                         variant: item.variantSize ? `${item.variantSize}ml` : 'N/A',
//                         quantity: item.quantity || 1,
//                         price: item.price || 0,
//                         status: item.status ? item.status.toLowerCase() : order.status.toLowerCase(),
//                         image: imagePath
//                     };
//                 })
//             };
//         });

//         res.render('orders', { 
//             orders: ordersData,
//             pendingCancellations: pendingCancellations.length,
//             cancellationRequests: pendingCancellations.map(order => ({
//                 id: order.orderId || order._id.toString().slice(-5).toUpperCase(),
//                 customerName: order.deliveryAddress ? order.deliveryAddress.name : (order.user ? order.user.name : 'N/A'),
//                 reason: order.cancellationRequest ? order.cancellationRequest.reason : 'N/A',
//                 requestDate: order.cancellationRequest ? order.cancellationRequest.requestedAt : order.createdOn,
//                 totalAmount: order.finalAmount || 0,
//                 products: order.orderItems.map(item => {
//                     let imagePath = 'https://via.placeholder.com/80x80?text=No+Image';
//                     if (item.product && item.product.productImage && item.product.productImage.length > 0) {
//                         const firstImage = item.product.productImage[0];
//                         imagePath = firstImage.startsWith('http') 
//                             ? firstImage 
//                             : `/uploads/product-images/${firstImage}`;
//                     }
//                     return {
//                         product: item.productName || (item.product ? item.product.productName : 'Unknown Product'),
//                         variant: item.variantSize ? `${item.variantSize}ml` : 'N/A',
//                         quantity: item.quantity || 1,
//                         image: imagePath
//                     };
//                 })
//             }))
//         });
//     } catch (error) {
//         console.error('Error fetching admin orders:', error);
//         res.redirect('/pageNotFound');
//     }
// };



// const updateProductStatus = async (req, res) => {
//     try {
//         const { orderId, productId, status } = req.body;

//         // Validate input
//         if (!orderId || !productId || !status) {
//             return res.status(400).json({ success: false, message: 'Order ID, Product ID, and status are required' });
//         }

//         // Validate status
//         const validStatuses = ['processing', 'shipping', 'outfordelivery', 'delivered'];
//         if (!validStatuses.includes(status)) {
//             return res.status(400).json({ success: false, message: 'Invalid status. Admins cannot set status to cancelled.' });
//         }

//         // Find the order
//         const order = await Order.findOne({
//             $or: [{ orderId }, { _id: orderId }]
//         });

//         if (!order) {
//             return res.status(404).json({ success: false, message: 'Order not found' });
//         }

//         // Find the product in orderItems
//         const item = order.orderItems.find(item => item.product.toString() === productId);
//         if (!item) {
//             return res.status(404).json({ success: false, message: 'Product not found in order' });
//         }

//         // Prevent status change if product is already cancelled
//         if (item.status === 'cancelled') {
//             return res.status(400).json({ success: false, message: 'Cannot change status of a cancelled product' });
//         }

//         // Update the product status
//         item.status = status;

//         // Update overall order status
//         const allCancelled = order.orderItems.every(i => i.status === 'cancelled');
//         const allDelivered = order.orderItems.every(i => i.status === 'delivered');
//         order.status = allCancelled ? 'cancelled' : allDelivered ? 'delivered' : 'processing';

//         await order.save();

//         res.json({ success: true, message: 'Product status updated successfully' });
//     } catch (error) {
//         console.error('Error updating product status:', error);
//         res.status(500).json({ success: false, message: 'Server error' });
//     }
// };



// // Handle cancellation approval
// const approveCancellation = async (req, res) => {
//     try {
//         const { orderId } = req.body;
        
//         const order = await Order.findOne({ orderId });
//         if (!order) {
//             return res.status(404).json({ success: false, message: 'Order not found' });
//         }

//         order.status = 'cancelled';
//         if (order.cancellationRequest) {
//             order.cancellationRequest.status = 'approved';
//             order.cancellationRequest.processedAt = new Date();
//         }
        
//         await order.save();

//         res.json({ success: true, message: 'Cancellation approved successfully' });
//     } catch (error) {
//         console.error('Error approving cancellation:', error);
//         res.status(500).json({ success: false, message: 'Error approving cancellation' });
//     }
// };

// // Handle cancellation rejection
// const rejectCancellation = async (req, res) => {
//     try {
//         const { orderId } = req.body;
        
//         const order = await Order.findOne({ orderId });
//         if (!order) {
//             return res.status(404).json({ success: false, message: 'Order not found' });
//         }

//         if (order.cancellationRequest) {
//             order.cancellationRequest.status = 'rejected';
//             order.cancellationRequest.processedAt = new Date();
//         }
        
//         await order.save();

//         res.json({ success: true, message: 'Cancellation rejected successfully' });
//     } catch (error) {
//         console.error('Error rejecting cancellation:', error);
//         res.status(500).json({ success: false, message: 'Error rejecting cancellation' });
//     }
// };

// module.exports = {
//     getAdminOrderList,
//     approveCancellation,
//     rejectCancellation,
//     updateProductStatus
// };




































// const Address = require('../../models/addressSchema');
// const Product = require('../../models/productSchema');
// const User = require('../../models/userSchema');
// const Order = require('../../models/orderSchema');

// const getAdminOrderList = async (req, res) => {
//     try {
//         const orders = await Order.find({})
//             .sort({ createdOn: -1 })
//             .populate('user')
//             .populate('orderItems.product')
//             .lean();

//         const pendingCancellations = orders.filter(order => 
//             order.cancellationRequest && 
//             order.cancellationRequest.status === 'pending'
//         );

//         const ordersData = orders.map(order => {
//             const address = order.deliveryAddress 
//                 ? `${order.deliveryAddress.houseName}, ${order.deliveryAddress.city}, ${order.deliveryAddress.state} - ${order.deliveryAddress.pincode}` 
//                 : 'N/A';
            
//             return {
//                 id: order.orderId || order._id.toString().slice(-5).toUpperCase(),
//                 name: order.deliveryAddress ? order.deliveryAddress.name : (order.user ? order.user.name : 'N/A'),
//                 email: order.user ? order.user.email : 'N/A',
//                 phone: order.deliveryAddress ? order.deliveryAddress.phone : 'N/A',
//                 address,
//                 fullAddress: order.deliveryAddress || {},
//                 date: order.createdOn,
//                 status: order.status.toLowerCase(),
//                 paymentMethod: order.paymentMethod || 'N/A',
//                 paymentStatus: order.paymentStatus || 'N/A',
//                 totalAmount: order.finalAmount || 0,
//                 discount: order.discount || 0,
//                 couponApplied: order.couponApplied || null,
//                 cancellationRequest: order.cancellationRequest || null,
//                 products: order.orderItems.map(item => {
//                     let imagePath = 'https://via.placeholder.com/80x80?text=No+Image';
//                     if (item.product && item.product.productImage && item.product.productImage.length > 0) {
//                         const firstImage = item.product.productImage[0];
//                         imagePath = firstImage.startsWith('http') 
//                             ? firstImage 
//                             : `/uploads/product-images/${firstImage}`;
//                     }
//                     return {
//                         productId: item.product ? item.product._id : null,
//                         product: item.productName || (item.product ? item.product.productName : 'Unknown Product'),
//                         variant: item.variantSize ? `${item.variantSize}ml` : 'N/A',
//                         quantity: item.quantity || 1,
//                         price: item.price || 0,
//                         status: item.status ? item.status.toLowerCase() : order.status.toLowerCase(),
//                         image: imagePath
//                     };
//                 })
//             };
//         });

//         res.render('orders', { 
//             orders: ordersData,
//             pendingCancellations: pendingCancellations.length,
//             cancellationRequests: pendingCancellations.map(order => ({
//                 id: order.orderId || order._id.toString().slice(-5).toUpperCase(),
//                 customerName: order.deliveryAddress ? order.deliveryAddress.name : (order.user ? order.user.name : 'N/A'),
//                 reason: order.cancellationRequest ? order.cancellationRequest.reason : 'N/A',
//                 requestDate: order.cancellationRequest ? order.cancellationRequest.requestedAt : order.createdOn,
//                 totalAmount: order.finalAmount || 0,
//                 products: order.orderItems.map(item => {
//                     let imagePath = 'https://via.placeholder.com/80x80?text=No+Image';
//                     if (item.product && item.product.productImage && item.product.productImage.length > 0) {
//                         const firstImage = item.product.productImage[0];
//                         imagePath = firstImage.startsWith('http') 
//                             ? firstImage 
//                             : `/uploads/product-images/${firstImage}`;
//                     }
//                     return {
//                         product: item.productName || (item.product ? item.product.productName : 'Unknown Product'),
//                         variant: item.variantSize ? `${item.variantSize}ml` : 'N/A',
//                         quantity: item.quantity || 1,
//                         status: item.status ? item.status.toLowerCase() : order.status.toLowerCase(),
//                         image: imagePath
//                     };
//                 })
//             }))
//         });
//     } catch (error) {
//         console.error('Error fetching admin orders:', error);
//         res.redirect('/pageNotFound');
//     }
// };

// const updateProductStatus = async (req, res) => {
//     try {
//         const { orderId, productId, status } = req.body;

//         // Validate input
//         if (!orderId || !productId || !status) {
//             return res.status(400).json({ success: false, message: 'Order ID, Product ID, and status are required' });
//         }

//         // Validate status
//         const validStatuses = ['cancelled', 'processing', 'shipping', 'outfordelivery', 'delivered'];
//         if (!validStatuses.includes(status)) {
//             return res.status(400).json({ success: false, message: 'Invalid status' });
//         }

//         // Find and update the order
//         const order = await Order.findOne({
//             $or: [{ orderId }, { _id: orderId }]
//         });

//         if (!order) {
//             return res.status(404).json({ success: false, message: 'Order not found' });
//         }

//         // Update the status of the specific product in orderItems
//         const item = order.orderItems.find(item => item.product.toString() === productId);
//         if (!item) {
//             return res.status(404).json({ success: false, message: 'Product not found in order' });
//         }

//         item.status = status;

//         // Update overall order status based on orderItems
//         const allCancelled = order.orderItems.every(i => i.status === 'cancelled');
//         const allDelivered = order.orderItems.every(i => i.status === 'delivered');
//         order.status = allCancelled ? 'cancelled' : allDelivered ? 'delivered' : 'processing';

//         await order.save();

//         res.json({ success: true, message: 'Product status updated successfully' });
//     } catch (error) {
//         console.error('Error updating product status:', error);
//         res.status(500).json({ success: false, message: 'Server error' });
//     }
// };

// module.exports = {
//     getAdminOrderList,
//     updateProductStatus
// };






const Address = require('../../models/addressSchema');
const Product = require('../../models/productSchema');
const User = require('../../models/userSchema');
const Order = require('../../models/orderSchema');

const getAdminOrderList = async (req, res) => {
    try {
        // Fetch all orders with populated fields
        const orders = await Order.find({})
            .sort({ createdOn: -1 })
            .populate('user')
            .populate('orderItems.product')
            .lean();

        // Count pending cancellation requests
        const pendingCancellations = orders.filter(order => 
            order.cancellationRequest && 
            order.cancellationRequest.status === 'pending'
        );

        // Prepare data for the view
        const ordersData = orders.map(order => {
            console.log('Processing Order:', order.orderId, 'Items:', order.orderItems.length);
            const address = order.deliveryAddress 
                ? `${order.deliveryAddress.houseName}, ${order.deliveryAddress.city}, ${order.deliveryAddress.state} - ${order.deliveryAddress.pincode}` 
                : 'N/A';
            
            return {
                id: order.orderId || order._id.toString().slice(-5).toUpperCase(),
                name: order.deliveryAddress ? order.deliveryAddress.name : (order.user ? order.user.name : 'N/A'),
                email: order.user ? order.user.email : 'N/A',
                phone: order.deliveryAddress ? order.deliveryAddress.phone : 'N/A',
                address,
                fullAddress: order.deliveryAddress || {},
                date: order.createdOn,
                status: order.status,
                paymentMethod: order.paymentMethod || 'N/A',
                paymentStatus: order.paymentStatus || 'N/A',
                totalAmount: order.finalAmount || 0,
                discount: order.discount || 0,
                couponApplied: order.couponApplied || null,
                cancellationRequest: order.cancellationRequest || null,
                products: order.orderItems.map(item => {
                    let imagePath = 'https://via.placeholder.com/80x80?text=No+Image';
                    if (item.product) {
                        const images = item.product.productImage || item.product.images;
                        if (images && images.length > 0) {
                            const firstImage = images[0];
                            imagePath = firstImage.startsWith('http') 
                                ? firstImage 
                                : `/uploads/product-images/${firstImage}`;
                        }
                    } else {
                        console.log('No image found for product:', item.productName, 'Product:', item.product);
                    }
                    return {
                        productId: item.product ? item.product._id : null,
                        product: item.productName || (item.product ? item.product.productName : 'Unknown Product'),
                        variant: item.variantSize ? `${item.variantSize}ml` : 'N/A',
                        quantity: item.quantity || 1,
                        price: item.price || 0,
                        status: item.status || order.status,
                        image: imagePath
                    };
                })
            };
        });

        res.render('orders', { 
            orders: ordersData,
            pendingCancellations: pendingCancellations.length,
            cancellationRequests: pendingCancellations.map(order => ({
                id: order.orderId || order._id.toString().slice(-5).toUpperCase(),
                customerName: order.deliveryAddress ? order.deliveryAddress.name : (order.user ? order.user.name : 'N/A'),
                reason: order.cancellationRequest ? order.cancellationRequest.reason : 'N/A',
                requestDate: order.cancellationRequest ? order.cancellationRequest.requestedAt : order.createdOn,
                totalAmount: order.finalAmount || 0,
                products: order.orderItems.map(item => {
                    let imagePath = 'https://via.placeholder.com/80x80?text=No+Image';
                    if (item.product && item.product.productImage && item.product.productImage.length > 0) {
                        const firstImage = item.product.productImage[0];
                        imagePath = firstImage.startsWith('http') 
                            ? firstImage 
                            : `/uploads/product-images/${firstImage}`;
                    }
                    return {
                        product: item.productName || (item.product ? item.product.productName : 'Unknown Product'),
                        variant: item.variantSize ? `${item.variantSize}ml` : 'N/A',
                        quantity: item.quantity || 1,
                        status: item.status || order.status,
                        image: imagePath
                    };
                })
            }))
        });
    } catch (error) {
        console.error('Error fetching admin orders:', error);
        res.redirect('/pageNotFound');
    }
};



// const updateProductStatus = async (req, res) => {
//     try {
//         const { orderId, productId, status } = req.body;

//         // Validate input
//         if (!orderId || !productId || !status) {
//             return res.status(400).json({ success: false, message: 'Order ID, Product ID, and status are required' });
//         }

//         // Map frontend statuses to schema-compatible statuses
//         const statusMap = {
//             'Processing': 'Processing',
//             'Shipped': 'Shipped',
//             'OutForDelivery': 'OutForDelivery',
//             'Delivered': 'Delivered'
//         };

//         // Validate status against schema enum
//         const validStatuses = ['Processing', 'Shipped', 'OutForDelivery', 'Delivered'];
//         if (!validStatuses.includes(status)) {
//             return res.status(400).json({ success: false, message: 'Invalid status. Admins cannot set status to Cancelled, Active, Pending, or Returned.' });
//         }

//         // Find the order by orderId only
//         const order = await Order.findOne({ orderId });

//         if (!order) {
//             return res.status(404).json({ success: false, message: 'Order not found' });
//         }

//         // Find the product in orderItems
//         const item = order.orderItems.find(item => item.product.toString() === productId);
//         if (!item) {
//             return res.status(404).json({ success: false, message: 'Product not found in order' });
//         }

//         // Prevent status change if product is already cancelled
//         if (item.status === 'Cancelled') {
//             return res.status(400).json({ success: false, message: 'Cannot change status of a cancelled product' });
//         }

//         // Update the product status
//         item.status = statusMap[status] || status;

//         // Update overall order status
//         const allCancelled = order.orderItems.every(i => i.status === 'Cancelled');
//         const allDelivered = order.orderItems.every(i => i.status === 'Delivered');
//         order.status = allCancelled ? 'Cancelled' : allDelivered ? 'Delivered' : 'Processing';

//         await order.save();

//         res.json({ success: true, message: 'Product status updated successfully' });
//     } catch (error) {
//         console.error('Error updating product status:', error);
//         if (error.name === 'CastError') {
//             return res.status(400).json({ success: false, message: 'Invalid order or product ID format' });
//         }
//         res.status(500).json({ success: false, message: 'Server error' });
//     }
// };


const updateProductStatus = async (req, res) => {
  try {
    const { orderId, productId, status } = req.body;

    // Validate input
    if (!orderId || !productId || !status) {
      return res.status(400).json({ success: false, message: 'Order ID, Product ID, and status are required' });
    }

    // Map frontend statuses to schema-compatible statuses
    const statusMap = {
      'Processing': 'Processing',
      'Shipped': 'Shipped',
      'OutForDelivery': 'OutForDelivery',
      'Delivered': 'Delivered'
    };

    // Validate status against schema enum
    const validStatuses = ['Processing', 'Shipped', 'OutForDelivery', 'Delivered'];
    if (!validStatuses.includes(status)) {
      return res.status(400).json({ success: false, message: 'Invalid status. Admins cannot set status to Cancelled, Active, Pending, or Returned.' });
    }

    // Find the order by orderId
    const order = await Order.findOne({ orderId });

    if (!order) {
      return res.status(404).json({ success: false, message: 'Order not found' });
    }

    // Find the product in orderItems
    const item = order.orderItems.find(item => item.product.toString() === productId);
    if (!item) {
      return res.status(404).json({ success: false, message: 'Product not found in order' });
    }

    // Prevent status change if product is already cancelled
    if (item.status === 'Cancelled') {
      return res.status(400).json({ success: false, message: 'Cannot change status of a cancelled product' });
    }

    // Update the product status
    item.status = statusMap[status] || status;

    // Format date and time in en-IN locale
    const formatDateTime = (date) => ({
      date: date.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }),
      time: date.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: true })
    });

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

    // Update tracking fields for current and prior statuses
    const now = new Date();
    const currentPriority = statusPriority[status] || 0;
    statusTimestamps.forEach(({ status: tsStatus, dateField, timeField }, index) => {
      if (statusPriority[tsStatus] <= currentPriority && tsStatus !== 'Delivered' && status !== 'Cancelled' && status !== 'Return Request' && status !== 'Returned') {
        if (!item.tracking[dateField]) {
          // Simulate realistic progression: subtract 1 day per prior status
          const simulatedDate = new Date(now.getTime() - (currentPriority - statusPriority[tsStatus]) * 24 * 60 * 60 * 1000);
          const formatted = formatDateTime(simulatedDate);
          item.tracking[dateField] = formatted.date;
          item.tracking[timeField] = formatted.time;
        }
      }
    });

    // Set specific tracking fields for the current status
    switch (status) {
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
          item.tracking.shippedLocation = item.tracking.shippedLocation || 'Warehouse XYZ';
        }
        break;
      case 'OutForDelivery':
        if (!item.tracking.outForDeliveryDate) {
          const formatted = formatDateTime(now);
          item.tracking.outForDeliveryDate = formatted.date;
          item.tracking.outForDeliveryTime = formatted.time;
          item.tracking.outForDeliveryLocation = item.tracking.outForDeliveryLocation || order.deliveryAddress?.city || 'Local Hub ABC';
        }
        break;
      case 'Delivered':
        if (!item.tracking.deliveredDate) {
          const formatted = formatDateTime(now);
          item.tracking.deliveredDate = formatted.date;
          item.tracking.deliveredTime = formatted.time;
          item.tracking.estimatedDeliveryDate = null; // Clear estimated delivery
        }
        break;
    }

    // Set estimated delivery date if not already set (7 days from now for non-Delivered statuses)
    if (!item.tracking.estimatedDeliveryDate && status !== 'Delivered') {
      const deliveryDate = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
      item.tracking.estimatedDeliveryDate = formatDateTime(deliveryDate).date;
    }

    // Update overall order status
    const allStatuses = order.orderItems.map(i => i.status);
    order.status = allStatuses.every(s => s === 'Delivered') ? 'Delivered' :
                   allStatuses.every(s => s === 'Cancelled') ? 'Cancelled' :
                   allStatuses.includes('Return Request') ? 'Return Request' :
                   allStatuses.includes('Returned') ? 'Returned' :
                   allStatuses.includes('OutForDelivery') ? 'OutForDelivery' :
                   allStatuses.includes('Shipped') ? 'Shipped' :
                   allStatuses.includes('Processing') ? 'Processing' :
                   'Pending'; // Changed from 'Placed' to 'Pending'

    await order.save();

    res.json({ success: true, message: 'Product status updated successfully' });
  } catch (error) {
    console.error('Error updating product status:', error);
    if (error.name === 'CastError') {
      return res.status(400).json({ success: false, message: 'Invalid order or product ID format' });
    }
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

const approveCancellation = async (req, res) => {
    try {
        const { orderId } = req.body;
        
        const order = await Order.findOne({ orderId });
        if (!order) {
            return res.status(404).json({ success: false, message: 'Order not found' });
        }

        // Update all order items to Cancelled
        order.orderItems.forEach(item => {
            item.status = 'Cancelled';
            item.cancelledAt = new Date();
        });

        order.status = 'Cancelled';
        if (order.cancellationRequest) {
            order.cancellationRequest.status = 'approved';
            order.cancellationRequest.processedAt = new Date();
        }
        
        await order.save();

        res.json({ success: true, message: 'Cancellation approved successfully' });
    } catch (error) {
        console.error('Error approving cancellation:', error);
        res.status(500).json({ success: false, message: 'Error approving cancellation' });
    }
};

const rejectCancellation = async (req, res) => {
    try {
        const { orderId } = req.body;
        
        const order = await Order.findOne({ orderId });
        if (!order) {
            return res.status(404).json({ success: false, message: 'Order not found' });
        }

        if (order.cancellationRequest) {
            order.cancellationRequest.status = 'rejected';
            order.cancellationRequest.processedAt = new Date();
        }
        
        await order.save();

        res.json({ success: true, message: 'Cancellation rejected successfully' });
    } catch (error) {
        console.error('Error rejecting cancellation:', error);
        res.status(500).json({ success: false, message: 'Error rejecting cancellation' });
    }
};

module.exports = {
    getAdminOrderList,
    approveCancellation,
    rejectCancellation,
    updateProductStatus
};