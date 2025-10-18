const mongoose = require('mongoose');
const Address = require('../../models/addressSchema');
const Product = require('../../models/productSchema');
const User = require('../../models/userSchema');
const Order = require('../../models/orderSchema');
const Wallet = require('../../models/walletSchema');

const getAdminOrderList = async (req, res) => {
  try {
    const orders = await Order.find({})
      .sort({ createdOn: -1 })
      .populate('user')
      .populate('orderItems.product')
      .lean();

    const pendingCancellations = orders.filter(order =>
      order.cancellationRequest &&
      order.cancellationRequest.status === 'pending'
    ).length;

    let pendingReturns = 0;
    const returnRequests = [];
    orders.forEach(order => {
      const returnRequestedItems = order.orderItems.filter(item => item.status === 'Return Request');
      if (returnRequestedItems.length > 0) {
        pendingReturns += returnRequestedItems.length;
        returnRequests.push({
          id: order.orderId || order._id.toString().slice(-5).toUpperCase(),
          customerName: order.deliveryAddress ? order.deliveryAddress.name : (order.user ? order.user.name : 'N/A'),
          reason: order.returnReason || 'N/A',
          requestDate: order.returnRequestedAt || order.updatedAt || order.createdOn,
          totalAmount: returnRequestedItems.reduce((sum, item) => sum + (item.total || item.price * item.quantity || 0), 0),
          products: returnRequestedItems.map(item => ({
            productId: item.product ? item.product._id : null,
            product: item.productName || (item.product ? item.product.productName : 'Unknown Product'),
            variant: item.variantSize ? `${item.variantSize}ml` : 'N/A',
            quantity: item.quantity || 1,
            price: item.price || 0,
            reason: item.returnReason || 'N/A',
            image: (() => {
              if (!item.product) return 'https://via.placeholder.com/80x80?text=No+Image';
              const images = item.product.productImage?.length ? item.product.productImage : item.product.images;
              if (!images || images.length === 0) return 'https://via.placeholder.com/80x80?text=No+Image';
              const firstImage = images[0];
              return firstImage.startsWith('http') || firstImage.startsWith('data:')
                ? firstImage
                : `/uploads/product-images/${firstImage}`;
            })()
          }))
        });
      }
    });

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
            price: (item.price || 0) * (item.quantity || 1),
            status: item.status || order.status,
            image: imagePath
          };
        })
      };
    });

    res.render('orders', {
      orders: ordersData,
      pendingCancellations,
      pendingReturns,
      returnRequests
    });
  } catch (error) {
    console.error('Error fetching admin orders:', error);
    res.redirect('/pageNotFound');
  }
};

const updateProductStatus = async (req, res) => {
  try {
    const { orderId, productId, status } = req.body;
    if (!orderId || !productId || !status) {
      return res.status(400).json({ success: false, message: 'Order ID, Product ID, and status are required' });
    }

    const statusMap = {
      'Processing': 'Processing',
      'Shipped': 'Shipped',
      'OutForDelivery': 'OutForDelivery',
      'Delivered': 'Delivered'
    };

    const validStatuses = ['Processing', 'Shipped', 'OutForDelivery', 'Delivered'];
    if (!validStatuses.includes(status)) {
      return res.status(400).json({ success: false, message: 'Invalid status. Admins cannot set status to Cancelled, Active, Pending, or Returned.' });
    }

    const order = await Order.findOne({ orderId });
    if (!order) {
      return res.status(404).json({ success: false, message: 'Order not found' });
    }
    const item = order.orderItems.find(item => item.product.toString() === productId);
    if (!item) {
      return res.status(404).json({ success: false, message: 'Product not found in order' });
    }

    if (item.status === 'Cancelled') {
      return res.status(400).json({ success: false, message: 'Cannot change status of a cancelled product' });
    }

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

    const currentPriority = statusPriority[item.status] || 0;
    const newPriority = statusPriority[statusMap[status] || status] || 0;

    if (newPriority < currentPriority) {
      return res.status(400).json({
        success: false,
        message: `Cannot change status from "${item.status}" to "${status}". Status can only be updated to a future state.`
      });
    }

    item.status = statusMap[status] || status;

    const formatDateTime = (date) => ({
      date: date.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }),
      time: date.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: true })
    });

    const statusTimestamps = [
      { status: 'Placed', dateField: 'placedDate', timeField: 'placedTime' },
      { status: 'Confirmed', dateField: 'confirmedDate', timeField: 'confirmedTime' },
      { status: 'Processing', dateField: 'processingDate', timeField: 'processingTime' },
      { status: 'Shipped', dateField: 'shippedDate', timeField: 'shippedTime' },
      { status: 'OutForDelivery', dateField: 'outForDeliveryDate', timeField: 'outForDeliveryTime' },
      { status: 'Delivered', dateField: 'deliveredDate', timeField: 'deliveredTime' }
    ];

    const now = new Date();
    const currentPriorityUpdated = statusPriority[item.status] || 0;
    statusTimestamps.forEach(({ status: tsStatus, dateField, timeField }, index) => {
      if (statusPriority[tsStatus] <= currentPriorityUpdated && tsStatus !== 'Delivered' && status !== 'Cancelled' && status !== 'Return Request' && status !== 'Returned') {
        if (!item.tracking[dateField]) {
          const simulatedDate = new Date(now.getTime() - (currentPriorityUpdated - statusPriority[tsStatus]) * 24 * 60 * 60 * 1000);
          const formatted = formatDateTime(simulatedDate);
          item.tracking[dateField] = formatted.date;
          item.tracking[timeField] = formatted.time;
        }
      }
    });

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
          item.tracking.estimatedDeliveryDate = null;
        }
        break;
    }

    if (!item.tracking.estimatedDeliveryDate && status !== 'Delivered') {
      const deliveryDate = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
      item.tracking.estimatedDeliveryDate = formatDateTime(deliveryDate).date;
    }

    const allStatuses = order.orderItems.map(i => i.status);
    order.status = allStatuses.every(s => s === 'Delivered') ? 'Delivered' :
      allStatuses.every(s => s === 'Cancelled') ? 'Cancelled' :
      allStatuses.includes('Return Request') ? 'Return Request' :
      allStatuses.includes('Returned') ? 'Returned' :
      allStatuses.includes('OutForDelivery') ? 'OutForDelivery' :
      allStatuses.includes('Shipped') ? 'Shipped' :
      allStatuses.includes('Processing') ? 'Processing' :
      'Pending';

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

// const approveReturn = async (req, res) => {
//   try {
//     const { orderId, productId } = req.body;
//     console.log("Approve Return Called:", { orderId, productId });

//     if (!orderId) {
//       return res.status(400).json({ success: false, error: 'orderId is required' });
//     }

//     const order = await Order.findOne({ orderId })
//       .populate('orderItems.product');

//     if (!order) {
//       return res.status(404).json({ success: false, error: 'Order not found' });
//     }

//     if (!order.user || !mongoose.Types.ObjectId.isValid(order.user)) {
//       return res.status(400).json({ success: false, error: 'Invalid user in order' });
//     }

//     let refundAmount = 0;
//     let productName = 'N/A';
//     const itemsToProcess = [];

//     if (productId) {
//       const item = order.orderItems.find(i => i.product._id.toString() === productId.toString());
//       if (!item) {
//         return res.status(400).json({ success: false, error: 'Product not found in order' });
//       }
//       if (item.status !== 'Return Request') {
//         return res.status(400).json({ success: false, error: `Cannot approve return. Current status: ${item.status}` });
//       }

//       item.status = 'Returned';
//       item.returnedAt = new Date();
//       refundAmount = (item.price || 0) * (item.quantity || 1);
//       productName = item.productName || item.product.name || 'N/A';
//       itemsToProcess.push({
//         productId: item.product._id,
//         quantity: item.quantity || 1,
//         size: item.variantSize
//       });
//     } else {
//       const returnItems = order.orderItems.filter(i => i.status === 'Return Request');
//       if (returnItems.length === 0) {
//         return res.status(400).json({ success: false, error: 'No items with Return Request status found' });
//       }

//       returnItems.forEach(item => {
//         item.status = 'Returned';
//         item.returnedAt = new Date();
//         refundAmount += (item.price || 0) * (item.quantity || 1);
//         itemsToProcess.push({
//           productId: item.product._id,
//           quantity: item.quantity || 1,
//           size: item.variantSize
//         });
//       });
//     }

//     for (const item of itemsToProcess) {
//       try {
//         const product = await Product.findById(item.productId);
//         if (!product) {
//           console.warn(`Product not found for stock restoration: ${item.productId}`);
//           continue;
//         }

//         if (item.size && product.variants && Array.isArray(product.variants)) {
//           const variant = product.variants.find(v => v.size === Number(item.size));
//           if (variant) {
//             variant.stock += item.quantity;
//             console.log(` Stock restored: ${item.size}ml - Added ${item.quantity} units. New stock: ${variant.stock}`);
//           } else {
//             console.warn(` Variant ${item.size}ml not found for product ${product.productName}`);
//           }
//         } else {
//           console.warn(`No size info or variants not found for product ${product._id}`);
//         }

//         await product.save();
//       } catch (error) {
//         console.error(`Error restoring stock for product ${item.productId}:`, error);
//       }
//     }

//     let wallet = await Wallet.findOne({ user: order.user });
//     if (!wallet) {
//       wallet = new Wallet({
//         user: order.user,
//         balance: 0,
//         transactions: []
//       });
//     }

//     if (refundAmount > 0) {
//       wallet.balance += refundAmount;
//       wallet.transactions.push({
//         type: 'credit',
//         amount: refundAmount,
//         description: 'Refund',
//         reason: productId
//           ? `Refund for returned product - Order #${order.orderId}`
//           : `Refund for full order - Order #${order.orderId}`,
//         orderId: order.orderId,
//         productName: productName,
//         productId: productId || null,
//         date: new Date()
//       });
//     }

//     await wallet.save();

//     const statuses = order.orderItems.map(i => i.status);
//     if (statuses.every(s => s === 'Returned' || s === 'Cancelled')) {
//       order.status = 'Returned';
//     } else if (statuses.some(s => s === 'Return Request')) {
//       order.status = 'Return Request';
//     } else if (statuses.every(s => s === 'Delivered')) {
//       order.status = 'Delivered';
//     } else if (statuses.every(s => s === 'Cancelled')) {
//       order.status = 'Cancelled';
//     } else if (statuses.includes('OutForDelivery')) {
//       order.status = 'OutForDelivery';
//     } else if (statuses.includes('Shipped')) {
//       order.status = 'Shipped';
//     } else if (statuses.includes('Processing')) {
//       order.status = 'Processing';
//     } else {
//       order.status = 'Pending';
//     }

//     await order.save();

//     res.json({
//       success: true,
//       message: productId
//         ? 'Product return approved successfully and stock restored'
//         : 'Order return approved successfully and stock restored',
//       refundAmount
//     });
//   } catch (error) {
//     console.error('Error approving return request:', error);

//     if (error.name === 'ValidationError') {
//       const errors = Object.values(error.errors).map(err => ({
//         path: err.path,
//         value: err.value,
//         message: err.message
//       }));
//       return res.status(400).json({ error: 'Validation failed', details: errors });
//     }

//     res.status(500).json({ error: 'Failed to approve return request' });
//   }
// };


const approveReturn = async (req, res) => {
  try {
    const { orderId, productId } = req.body;
    console.log("Approve Return Called:", { orderId, productId });

    if (!orderId) {
      return res.status(400).json({ success: false, error: 'orderId is required' });
    }

    const order = await Order.findOne({ orderId })
      .populate('orderItems.product');

    if (!order) {
      return res.status(404).json({ success: false, error: 'Order not found' });
    }

    if (!order.user || !mongoose.Types.ObjectId.isValid(order.user)) {
      return res.status(400).json({ success: false, error: 'Invalid user in order' });
    }

    let refundAmount = 0;
    let productName = 'N/A';
    const itemsToProcess = [];

    if (productId) {
      const item = order.orderItems.find(i => i.product._id.toString() === productId.toString());
      if (!item) {
        return res.status(400).json({ success: false, error: 'Product not found in order' });
      }
      if (item.status !== 'Return Request') {
        return res.status(400).json({ success: false, error: `Cannot approve return. Current status: ${item.status}` });
      }

      item.status = 'Returned';
      item.returnedAt = new Date();
      refundAmount = (item.price || 0) * (item.quantity || 1);
      productName = item.productName || item.product.name || 'N/A';
      itemsToProcess.push({
        productId: item.product._id,
        quantity: item.quantity || 1,
        size: item.variantSize
      });
    } else {
      const returnItems = order.orderItems.filter(i => i.status === 'Return Request');
      if (returnItems.length === 0) {
        return res.status(400).json({ success: false, error: 'No items with Return Request status found' });
      }

      returnItems.forEach(item => {
        item.status = 'Returned';
        item.returnedAt = new Date();
        refundAmount += (item.price || 0) * (item.quantity || 1);
        itemsToProcess.push({
          productId: item.product._id,
          quantity: item.quantity || 1,
          size: item.variantSize
        });
      });
    }

    for (const item of itemsToProcess) {
      try {
        const product = await Product.findById(item.productId);
        if (!product) {
          console.warn(`Product not found for stock restoration: ${item.productId}`);
          continue;
        }

        console.log(`Restoring stock - Product: ${product.productName}, Size: ${item.size}, Quantity: ${item.quantity}`);

        if (item.size && product.variants && Array.isArray(product.variants)) {
          
          const sizeNum = Number(item.size);
          const variantIndex = product.variants.findIndex(v => Number(v.size) === sizeNum);
          
          if (variantIndex !== -1) {
            const oldStock = product.variants[variantIndex].stock;
            product.variants[variantIndex].stock += item.quantity;
            const newStock = product.variants[variantIndex].stock;
            
            console.log(`Stock restored: ${item.size}ml - ${oldStock} -> ${newStock} (Added ${item.quantity} units)`);
          } else {
            console.warn(`Variant ${item.size}ml not found for product ${product.productName}. Available: ${product.variants.map(v => v.size).join(', ')}`);
          }
        } else {
          console.warn(`No size info or variants not found for product ${product._id}`);
        }

       
        product.markModified('variants');
        await product.save();
        
        console.log(`Product saved successfully`);
      } catch (error) {
        console.error(`Error restoring stock for product ${item.productId}:`, error);
      }
    }


    let wallet = await Wallet.findOne({ user: order.user });
    if (!wallet) {
      wallet = new Wallet({
        user: order.user,
        balance: 0,
        transactions: []
      });
    }

    if (refundAmount > 0) {
      wallet.balance += refundAmount;
      wallet.transactions.push({
        type: 'credit',
        amount: refundAmount,
        description: 'Refund',
        reason: productId
          ? `Refund for returned product - Order #${order.orderId}`
          : `Refund for full order - Order #${order.orderId}`,
        orderId: order.orderId,
        productName: productName,
        productId: productId || null,
        date: new Date()
      });
    }

    await wallet.save();

   
    const statuses = order.orderItems.map(i => i.status);
    if (statuses.every(s => s === 'Returned' || s === 'Cancelled')) {
      order.status = 'Returned';
    } else if (statuses.some(s => s === 'Return Request')) {
      order.status = 'Return Request';
    } else if (statuses.every(s => s === 'Delivered')) {
      order.status = 'Delivered';
    } else if (statuses.every(s => s === 'Cancelled')) {
      order.status = 'Cancelled';
    } else if (statuses.includes('OutForDelivery')) {
      order.status = 'OutForDelivery';
    } else if (statuses.includes('Shipped')) {
      order.status = 'Shipped';
    } else if (statuses.includes('Processing')) {
      order.status = 'Processing';
    } else {
      order.status = 'Pending';
    }

    await order.save();

    res.json({
      success: true,
      message: productId
        ? 'Product return approved successfully and stock restored'
        : 'Order return approved successfully and stock restored',
      refundAmount
    });
  } catch (error) {
    console.error('Error approving return request:', error);

    if (error.name === 'ValidationError') {
      const errors = Object.values(error.errors).map(err => ({
        path: err.path,
        value: err.value,
        message: err.message
      }));
      return res.status(400).json({ error: 'Validation failed', details: errors });
    }

    res.status(500).json({ error: 'Failed to approve return request' });
  }
};

const rejectReturn = async (req, res) => {
  try {
    const { orderId, productId } = req.body;
    console.log('Reject Return Called:', { orderId, productId });

    if (!orderId) {
      return res.status(400).json({
        success: false,
        error: 'orderId is required'
      });
    }

    const order = await Order.findOne({ orderId }).populate('orderItems.product');

    if (!order) {
      return res.status(404).json({
        success: false,
        error: 'Order not found'
      });
    }

    if (productId) {
      const item = order.orderItems.find(i => i.product._id.toString() === productId.toString());

      if (!item) {
        return res.status(400).json({
          success: false,
          error: 'Product not found in order'
        });
      }

      if (item.status !== 'Return Request') {
        return res.status(400).json({
          success: false,
          error: `Cannot reject return. Current status: ${item.status}`
        });
      }

      item.status = 'Delivered';
      item.returnRejected = true;
      item.returnRejectedAt = new Date();
      item.returnRejectionReason = req.body.reason || 'Return request rejected by admin';
      item.returnRequestedAt = null;
      item.returnReason = null;
      item.returnDetails = null;

      console.log(`Rejecting return for single product: ${item.productName}`);
    } else {
      const returnRequestedItems = order.orderItems.filter(i => i.status === 'Return Request');

      if (returnRequestedItems.length === 0) {
        return res.status(400).json({
          success: false,
          error: 'No items with Return Request status found'
        });
      }

      returnRequestedItems.forEach(item => {
        item.status = 'Delivered';
        item.returnRejected = true;
        item.returnRejectedAt = new Date();
        item.returnRejectionReason = req.body.reason || 'Return request rejected by admin';
        item.returnRequestedAt = null;
        item.returnReason = null;
        item.returnDetails = null;
      });

      console.log(`Rejecting full order return. Items: ${returnRequestedItems.length}`);
    }

    const statuses = order.orderItems.map(i => i.status);

    if (statuses.every(s => s === 'Delivered')) {
      order.status = 'Delivered';
    } else if (statuses.some(s => s === 'Return Request')) {
      order.status = 'Return Request';
    } else if (statuses.every(s => s === 'Cancelled')) {
      order.status = 'Cancelled';
    } else if (statuses.includes('OutForDelivery')) {
      order.status = 'OutForDelivery';
    } else if (statuses.includes('Shipped')) {
      order.status = 'Shipped';
    } else if (statuses.includes('Processing')) {
      order.status = 'Processing';
    } else {
      order.status = 'Pending';
    }

    await order.save();

    res.json({
      success: true,
      message: productId
        ? 'Product return rejected successfully'
        : 'Order return rejected successfully'
    });
  } catch (error) {
    console.error('Error rejecting return request:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to reject return request'
    });
  }
};

module.exports = {
  getAdminOrderList,
  updateProductStatus,
  approveReturn,
  rejectReturn
};