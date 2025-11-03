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
          products: returnRequestedItems.map((item, idx) => ({
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
    
        products: order.orderItems.map((item, index) => {
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
            itemIndex: index, 
            productId: item.product ? item.product._id : null,
            product: item.productName || (item.product ? item.product.productName : 'Unknown Product'),
            variant: item.variantSize ? `${item.variantSize}ml` : 'N/A',
            variantSizeRaw: item.variantSize || null,
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
    
    const { orderId: paramOrderId, itemIndex: paramItemIndex, variantSize: paramVariantSize } = req.params;
    const { orderId: bodyOrderId, itemIndex: bodyItemIndex, variantSize: bodyVariantSize, status } = req.body;

    const orderId = paramOrderId || bodyOrderId;
    const itemIndex = paramItemIndex !== undefined ? paramItemIndex : bodyItemIndex;
    const variantSize = paramVariantSize || bodyVariantSize;
    
    console.log('Update Status Request:', { orderId, itemIndex, variantSize, status });

    if (!orderId || itemIndex === undefined || !variantSize || !status) {
      return res.status(400).json({ 
        success: false, 
        message: 'Order ID, item index, variant size, and status are required' 
      });
    }

  
    const validStatuses = ['Processing', 'Shipped', 'OutForDelivery', 'Delivered'];
    if (!validStatuses.includes(status)) {
      return res.status(400).json({ 
        success: false, 
        message: 'Invalid status. Valid statuses are: Processing, Shipped, OutForDelivery, Delivered' 
      });
    }

  
    const order = await Order.findOne({ orderId });
    if (!order) {
      return res.status(404).json({ success: false, message: 'Order not found' });
    }

    const idx = parseInt(itemIndex);
    if (isNaN(idx) || idx < 0 || idx >= order.orderItems.length) {
      return res.status(404).json({ success: false, message: 'Invalid item index' });
    }

    const item = order.orderItems[idx];

    if (String(item.variantSize) !== String(variantSize)) {
      return res.status(400).json({ 
        success: false, 
        message: `Variant mismatch. Expected ${item.variantSize}ml, got ${variantSize}ml. Cannot update status for this item.` 
      });
    }

    if (item.status === 'Cancelled') {
      return res.status(400).json({ 
        success: false, 
        message: 'Cannot change status of a cancelled product' 
      });
    }

    if (item.status === 'Return Request' || item.status === 'Returned') {
      return res.status(400).json({ 
        success: false, 
        message: `Cannot change status of item in return process (Current: ${item.status})` 
      });
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
    const newPriority = statusPriority[status] || 0;

    if (newPriority < currentPriority) {
      return res.status(400).json({
        success: false,
        message: `Cannot change status from "${item.status}" to "${status}". Status can only move forward in the delivery pipeline.`
      });
    }

    const formatDateTime = (date) => ({
      date: date.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }),
      time: date.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: true })
    });

 
    item.status = status;

    
    const now = new Date();

    switch (status) {
      case 'Processing':
        if (!item.tracking.processingDate) {
          const formatted = formatDateTime(now);
          item.tracking.processingDate = formatted.date;
          item.tracking.processingTime = formatted.time;
        }
        if (!item.tracking.confirmedDate) {
          const confirmedDate = new Date(now.getTime() - 1 * 60 * 60 * 1000); 
          const formatted = formatDateTime(confirmedDate);
          item.tracking.confirmedDate = formatted.date;
          item.tracking.confirmedTime = formatted.time;
        }
        break;

      case 'Shipped':
        if (!item.tracking.shippedDate) {
          const formatted = formatDateTime(now);
          item.tracking.shippedDate = formatted.date;
          item.tracking.shippedTime = formatted.time;
          item.tracking.shippedLocation = item.tracking.shippedLocation || 'Warehouse XYZ';
        }
     
        if (!item.tracking.processingDate) {
          const processingDate = new Date(now.getTime() - 2 * 60 * 60 * 1000); 
          const formatted = formatDateTime(processingDate);
          item.tracking.processingDate = formatted.date;
          item.tracking.processingTime = formatted.time;
        }
        break;

      case 'OutForDelivery':
        if (!item.tracking.outForDeliveryDate) {
          const formatted = formatDateTime(now);
          item.tracking.outForDeliveryDate = formatted.date;
          item.tracking.outForDeliveryTime = formatted.time;
          item.tracking.outForDeliveryLocation = item.tracking.outForDeliveryLocation || order.deliveryAddress?.city || 'Local Hub ABC';
        }
        
        if (!item.tracking.shippedDate) {
          const shippedDate = new Date(now.getTime() - 3 * 60 * 60 * 1000); 
          const formatted = formatDateTime(shippedDate);
          item.tracking.shippedDate = formatted.date;
          item.tracking.shippedTime = formatted.time;
        }
        break;

      case 'Delivered':
        if (!item.tracking.deliveredDate) {
          const formatted = formatDateTime(now);
          item.tracking.deliveredDate = formatted.date;
          item.tracking.deliveredTime = formatted.time;
        }
     
        item.tracking.estimatedDeliveryDate = null;
        break;
    }


    if (!item.tracking.estimatedDeliveryDate && status !== 'Delivered') {
      const deliveryDate = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
      item.tracking.estimatedDeliveryDate = formatDateTime(deliveryDate).date;
    }

   
    const allItemStatuses = order.orderItems.map(i => i.status);
    
    order.status = allItemStatuses.every(s => s === 'Delivered') ? 'Delivered' :
      allItemStatuses.every(s => s === 'Cancelled') ? 'Cancelled' :
      allItemStatuses.includes('Return Request') ? 'Return Request' :
      allItemStatuses.includes('Returned') ? 'Returned' :
      allItemStatuses.includes('OutForDelivery') ? 'OutForDelivery' :
      allItemStatuses.includes('Shipped') ? 'Shipped' :
      allItemStatuses.includes('Processing') ? 'Processing' :
      'Pending';

 
    order.markModified('orderItems');
 
    await order.save();

    console.log(`✓ Status updated successfully: Item ${idx} (${item.productName} ${variantSize}ml) → ${status}`);

    res.json({ 
      success: true, 
      message: `Item status updated to "${status}" successfully`,
      updatedItem: {
        itemIndex: idx,
        productName: item.productName,
        variantSize: item.variantSize,
        newStatus: item.status
      }
    });

  } catch (error) {
    console.error('Error updating product status:', error);
    if (error.name === 'CastError') {
      return res.status(400).json({ 
        success: false, 
        message: 'Invalid order or product ID format' 
      });
    }
    if (error.name === 'ValidationError') {
      return res.status(400).json({ 
        success: false, 
        message: 'Validation error: ' + error.message 
      });
    }
    res.status(500).json({ 
      success: false, 
      message: 'Server error while updating status' 
    });
  }
};

const updateItemStatusRoute = async (req, res) => {
  try {
    const { orderId, itemIndex, variantSize } = req.params;
    const { status } = req.body;

    return updateProductStatus(req, res);
  } catch (error) {
    console.error('Error in route handler:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};


const approveReturn = async (req, res) => {
  try {
    const { orderId: paramOrderId, itemIndex: paramItemIndex, variantSize: paramVariantSize } = req.params;
    const { orderId: bodyOrderId, itemIndex: bodyItemIndex, variantSize: bodyVariantSize } = req.body;

    const orderId = paramOrderId || bodyOrderId;
    const itemIndex = paramItemIndex !== undefined ? paramItemIndex : bodyItemIndex;
    const variantSize = paramVariantSize || bodyVariantSize;

    console.log("Approve Return Called:", { orderId, itemIndex, variantSize });

    if (!orderId) {
      return res.status(400).json({ success: false, error: 'orderId is required' });
    }

    const order = await Order.findOne({ orderId }).populate('orderItems.product');

    if (!order) {
      return res.status(404).json({ success: false, error: 'Order not found' });
    }

    if (!order.user || !mongoose.Types.ObjectId.isValid(order.user)) {
      return res.status(400).json({ success: false, error: 'Invalid user in order' });
    }

    let refundAmount = 0;
    let productName = 'N/A';
    const itemsToProcess = [];
    
    if (itemIndex !== undefined && variantSize !== undefined && itemIndex !== 'all' && variantSize !== 'all') {
      const idx = parseInt(itemIndex);
      if (isNaN(idx) || idx < 0 || idx >= order.orderItems.length) {
        return res.status(404).json({ success: false, error: 'Invalid item index' });
      }

      const item = order.orderItems[idx];
 
      const itemVariantSize = Number(item.variantSize);
      const requestVariantSize = Number(variantSize);

      console.log(`Comparing variants: Item=${itemVariantSize}, Request=${requestVariantSize}`);

    
      if (itemVariantSize !== requestVariantSize) {
        return res.status(400).json({ 
          success: false, 
          error: `Variant mismatch. Expected ${item.variantSize}ml, got ${variantSize}ml. Item index may be incorrect.` 
        });
      }

   
      if (item.status !== 'Return Request') {
        console.log(`Item status is "${item.status}", not "Return Request"`);
        return res.status(400).json({ 
          success: false, 
          error: `Cannot approve return. Current status: ${item.status}. This item with variant ${variantSize}ml is not in "Return Request" status.` 
        });
      }

item.status = 'Returned';
      item.returnedAt = new Date();

      
      const itemDiscount = item.discountApplied || 0;
      const itemOriginalTotal = (item.price || 0) * (item.quantity || 1);
      refundAmount = itemOriginalTotal - itemDiscount;

      productName = item.productName || (item.product ? item.product.productName : 'N/A');

      console.log(`Admin Approve Return:
      Product: ${productName}
      Original: ₹${itemOriginalTotal}
      Discount: ₹${itemDiscount}
      Refund: ₹${refundAmount}`);
      
      console.log(`✓ Item approved: ${productName} ${variantSize}ml - Refund: ₹${refundAmount}`);
      
      itemsToProcess.push({
        productId: item.product._id,
        quantity: item.quantity || 1,
        size: item.variantSize,
        productName: item.productName
      });

    } 
    
    else if (itemIndex === 'all' || itemIndex === undefined) {
      const returnItems = order.orderItems.filter(i => i.status === 'Return Request');
      if (returnItems.length === 0) {
        return res.status(400).json({ success: false, error: 'No items with Return Request status found' });
      }

      console.log(`Approving full order return: ${returnItems.length} items in Return Request`);

       returnItems.forEach(item => {
        item.status = 'Returned';
        item.returnedAt = new Date();

        const itemDiscount = item.discountApplied || 0;
        const itemOriginalTotal = (item.price || 0) * (item.quantity || 1);
        const itemRefund = itemOriginalTotal - itemDiscount;
        
        refundAmount += itemRefund;
        
        console.log(`Item: ${item.productName} - Original: ₹${itemOriginalTotal}, Discount: ₹${itemDiscount}, Refund: ₹${itemRefund}`);
        
        itemsToProcess.push({
          productId: item.product._id,
          quantity: item.quantity || 1,
          size: item.variantSize,
          productName: item.productName
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

        console.log(`Restoring stock - Product: ${product.productName}, Size: ${item.size}ml, Quantity: ${item.quantity}`);

        if (item.size && product.variants && Array.isArray(product.variants)) {
          const sizeNum = Number(item.size);
          const variantIndex = product.variants.findIndex(v => Number(v.size) === sizeNum);
          
          if (variantIndex !== -1) {
            const oldStock = product.variants[variantIndex].stock;
            product.variants[variantIndex].stock += item.quantity;
            const newStock = product.variants[variantIndex].stock;
            
            console.log(`Stock restored: ${item.size}ml - ${oldStock} → ${newStock} (Added ${item.quantity} units)`);
          } else {
            console.warn(`Variant ${item.size}ml not found for product ${product.productName}`);
          }
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
      
      const itemNames = itemsToProcess.map(i => `${i.productName} (${i.size}ml)`).join(', ');
      
      wallet.transactions.push({
        type: 'credit',
        amount: refundAmount,
        description: 'Refund',
        reason: itemIndex && itemIndex !== 'all'
          ? `Refund for returned item - Order #${order.orderId}`
          : `Refund for full order - Order #${order.orderId}`,
        orderId: order.orderId,
        productName: itemNames,
        productId: itemsToProcess.length === 1 ? itemsToProcess[0].productId : null,
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

    order.markModified('orderItems');
    await order.save();

    console.log(`✓ Return approved successfully: ${itemsToProcess.length} item(s), Refund: ₹${refundAmount}`);

    res.json({
      success: true,
      message: itemIndex && itemIndex !== 'all'
        ? `Return approved for ${productName} (${variantSize}ml). Refund: ₹${refundAmount.toFixed(2)}`
        : `Full order return approved. Refund: ₹${refundAmount.toFixed(2)}`,
      refundAmount,
      itemsProcessed: itemsToProcess.length
    });

  } catch (error) {
    console.error('Error approving return request:', error);

    if (error.name === 'ValidationError') {
      const errors = Object.values(error.errors).map(err => ({
        path: err.path,
        value: err.value,
        message: err.message
      }));
      return res.status(400).json({ success: false, error: 'Validation failed', details: errors });
    }

    res.status(500).json({ success: false, error: 'Failed to approve return request' });
  }
};



const rejectReturn = async (req, res) => {
  try {
    const { orderId: paramOrderId, itemIndex: paramItemIndex, variantSize: paramVariantSize } = req.params;
    const { orderId: bodyOrderId, itemIndex: bodyItemIndex, variantSize: bodyVariantSize, reason } = req.body;

    const orderId = paramOrderId || bodyOrderId;
    const itemIndex = paramItemIndex !== undefined ? paramItemIndex : bodyItemIndex;
    const variantSize = paramVariantSize || bodyVariantSize;

    console.log('Reject Return Called:', { orderId, itemIndex, variantSize, reason });

    if (!orderId) {
      return res.status(400).json({ success: false, error: 'orderId is required' });
    }

    const order = await Order.findOne({ orderId }).populate('orderItems.product');

    if (!order) {
      return res.status(404).json({ success: false, error: 'Order not found' });
    }

    let rejectedProductName = '';

    if (itemIndex !== undefined && variantSize !== undefined && itemIndex !== 'all' && variantSize !== 'all') {
      const idx = parseInt(itemIndex);
      if (isNaN(idx) || idx < 0 || idx >= order.orderItems.length) {
        return res.status(404).json({ success: false, error: 'Invalid item index' });
      }

      const item = order.orderItems[idx];

   
      const itemVariantSize = Number(item.variantSize);
      const requestVariantSize = Number(variantSize);

      console.log(`Comparing variants: Item=${itemVariantSize}, Request=${requestVariantSize}`);


      if (itemVariantSize !== requestVariantSize) {
        return res.status(400).json({ 
          success: false, 
          error: `Variant mismatch. Expected ${item.variantSize}ml, got ${variantSize}ml` 
        });
      }

      if (item.status !== 'Return Request') {
        return res.status(400).json({
          success: false,
          error: `Cannot reject return. Current status: ${item.status}. This item with variant ${variantSize}ml is not in "Return Request" status.`
        });
      }

      item.status = 'Delivered';
      item.returnRejected = true;
      item.returnRejectedAt = new Date();
      item.returnRejectionReason = reason || 'Return request rejected by admin';
      item.returnRequestedAt = null;
      item.returnReason = null;
      item.returnDetails = null;

      rejectedProductName = `${item.productName} (${variantSize}ml)`;
      console.log(`Rejecting return for single item: ${rejectedProductName}`);

    } 

    else if (itemIndex === 'all' || itemIndex === undefined) {
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
        item.returnRejectionReason = reason || 'Return request rejected by admin';
        item.returnRequestedAt = null;
        item.returnReason = null;
        item.returnDetails = null;
      });

      rejectedProductName = 'Full order';
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

    order.markModified('orderItems');
    await order.save();

    console.log(`✓ Return rejected successfully: ${rejectedProductName}`);

    res.json({
      success: true,
      message: itemIndex && itemIndex !== 'all'
        ? `Return rejected for ${rejectedProductName}`
        : 'Full order return rejected successfully',
      reason: reason || 'Return request rejected by admin'
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
  rejectReturn,
  updateItemStatusRoute
};