

const PDFDocument = require('pdfkit');
const mongoose = require('mongoose');
const Order = require("../../models/orderSchema");
const path = require('path');
const fs = require('fs');


const generateInvoice = async (req, res) => {
  try {
    const user = req.session.user;
    const userId = user?._id || user?.id;
    const { orderId } = req.params;

    if (!user || !mongoose.Types.ObjectId.isValid(userId)) {
      return res.status(401).json({ success: false, error: 'Unauthorized' });
    }

    const order = await Order.findOne({ orderId, user: userId })
      .populate('orderItems.product')
      .lean();

    if (!order) {
      return res.status(404).json({ success: false, error: 'Order not found' });
    }

   
    const allItemsCompleted = order.orderItems.every(item => 
      item.status === 'Delivered' || item.status === 'Cancelled' || item.status === 'Returned'
    );

    if (!allItemsCompleted) {
      return res.status(400).json({ 
        success: false, 
        error: 'Invoice can only be downloaded when all items are either Delivered, Cancelled, or Returned' 
      });
    }

   
    const doc = new PDFDocument({
      size: 'A4',
      margin: 50
    });

    
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="Invoice_${orderId}.pdf"`);
    doc.pipe(res);

    const primaryColor = '#000000';
    const accentColor = '#d4af37';
    const darkGray = '#333333';
    const lightGray = '#f5f5f5';
    const textColor = '#000000';

    const pageWidth = doc.page.width;
    const pageHeight = doc.page.height;


    const correctLogoPath = path.join(__dirname, '../../public/photos/zodiac perfume/brand logo.png');
    if (fs.existsSync(correctLogoPath)) {
      doc.image(correctLogoPath, 50, 35, { width: 100, height: 100 });
    }

    doc.fontSize(16).fillColor(primaryColor).font('Helvetica-Bold')
      .text('SENTIQUE', 160, 45);
    doc.fontSize(11).fillColor(accentColor).font('Helvetica')
      .text('SCENT YOUR SIGNATURE', 160, 65);
    
    doc.fontSize(9).fillColor(darkGray).font('Helvetica')
      .text('Email: support@sentique.com', 160, 85)
      .text('Phone: +91-8606621947', 160, 100)
      .text('Address: City, State - Pincode', 160, 115);

    doc.fontSize(20).fillColor(primaryColor).font('Helvetica-Bold')
      .text('INVOICE', pageWidth - 150, 40, { align: 'right' });

    doc.fontSize(9).fillColor(darkGray).font('Helvetica');
    doc.text(`Invoice #: ${orderId}`, pageWidth - 280, 70, { width: 230, align: 'right' });
    doc.text(`Invoice Date: ${new Date(order.createdOn).toLocaleDateString('en-IN')}`, pageWidth - 280, 85, { width: 230, align: 'right' });
    doc.text(`Order Status: ${order.status}`, pageWidth - 280, 100, { width: 230, align: 'right' });
    doc.text(`Payment: ${order.paymentStatus}`, pageWidth - 280, 115, { width: 230, align: 'right' });

    doc.strokeColor(accentColor).lineWidth(2);
    doc.moveTo(50, 150).lineTo(pageWidth - 50, 150).stroke();

    const billingY = 170;
    
    doc.fontSize(11).fillColor(primaryColor).font('Helvetica-Bold')
      .text('BILL TO:', 50, billingY);
    
    doc.fontSize(9).fillColor(textColor).font('Helvetica')
      .text(order.deliveryAddress.name, 50, billingY + 20)
      .text(order.deliveryAddress.houseName, 50, billingY + 35);
    
    if (order.deliveryAddress.landmark) {
      doc.text(`${order.deliveryAddress.landmark}`, 50, billingY + 50);
    }
    
    doc.text(`${order.deliveryAddress.city}, ${order.deliveryAddress.state} ${order.deliveryAddress.pincode}`, 
      50, order.deliveryAddress.landmark ? billingY + 65 : billingY + 50);
    
    doc.text(`Phone: ${order.deliveryAddress.phone}`, 
      50, order.deliveryAddress.landmark ? billingY + 80 : billingY + 65);

    doc.fontSize(11).fillColor(primaryColor).font('Helvetica-Bold')
      .text('SHIP TO:', 320, billingY);
    
    doc.fontSize(9).fillColor(textColor).font('Helvetica')
      .text(order.deliveryAddress.name, 320, billingY + 20)
      .text(order.deliveryAddress.houseName, 320, billingY + 35);
    
    if (order.deliveryAddress.landmark) {
      doc.text(`${order.deliveryAddress.landmark}`, 320, billingY + 50);
    }
    
    doc.text(`${order.deliveryAddress.city}, ${order.deliveryAddress.state}`, 
      320, order.deliveryAddress.landmark ? billingY + 65 : billingY + 50);

  
    const tableStartY = billingY + 130;
    const tableHeight = 25;

    doc.rect(50, tableStartY, pageWidth - 100, tableHeight)
      .fillAndStroke(primaryColor, primaryColor);

    doc.fontSize(10).fillColor('#FFFFFF').font('Helvetica-Bold');
    doc.text('DESCRIPTION', 60, tableStartY + 5);
    doc.text('SIZE', 260, tableStartY + 5);
    doc.text('QTY', 310, tableStartY + 5);
    doc.text('STATUS', 360, tableStartY + 5);
    doc.text('UNIT PRICE', 420, tableStartY + 5);
    doc.text('AMOUNT', 500, tableStartY + 5);

    let tableY = tableStartY + tableHeight;
    const rowHeight = 40;
    let deliveredTotal = 0;
    let cancelledTotal = 0;

    order.orderItems.forEach((item, index) => {
      if (index % 2 === 0) {
        doc.rect(50, tableY, pageWidth - 100, rowHeight).fill(lightGray);
      }

      doc.fontSize(9).fillColor(textColor).font('Helvetica');
      
      const itemName = item.productName || 'N/A';
      const variant = item.variantSize ? `${item.variantSize}ml` : 'N/A';
      const qty = item.quantity || 1;
      const price = parseFloat(item.price || 0).toFixed(2);
      const total = parseFloat(item.total || 0).toFixed(2);
      const status = item.status || 'Pending';

      
      doc.text(itemName, 60, tableY + 5, { width: 190, ellipsis: true });
      
  
      doc.text(variant, 260, tableY + 5, { width: 45 });
      
     
      doc.text(qty.toString(), 310, tableY + 5, { width: 40, align: 'center' });
      
      
      let statusColor = '#f39c12'; 
      if (status === 'Delivered') {
        statusColor = '#27ae60'; 
      } else if (status === 'Cancelled') {
        statusColor = '#e74c3c'; 
      } else if (status === 'Returned') {
        statusColor = '#3498db'; 
      }
      doc.fillColor(statusColor).font('Helvetica-Bold')
        .text(status, 360, tableY + 5, { width: 50 });
      
      
      doc.fillColor(textColor).font('Helvetica');
      
     
      if (status !== 'Cancelled') {
        doc.text(`₹${price}`, 420, tableY + 5, { width: 75, align: 'right' });
        doc.text(`₹${total}`, 500, tableY + 5, { width: 60, align: 'right' });
        deliveredTotal += parseFloat(total);
      } else {
        doc.fillColor('#999999')
          .text('CANCELLED', 420, tableY + 5, { width: 75, align: 'right' })
          .text('-', 500, tableY + 5, { width: 60, align: 'right' });
        cancelledTotal += parseFloat(total);
      }

      tableY += rowHeight;
    });

    doc.strokeColor(accentColor).lineWidth(1);
    doc.moveTo(50, tableY).lineTo(pageWidth - 50, tableY).stroke();

   
    const summaryY = tableY + 20;
    const summaryX = 350;

    doc.fontSize(10).fillColor(darkGray).font('Helvetica');
    
   
    doc.fontSize(9).fillColor(primaryColor).font('Helvetica-Bold')
      .text('Delivered Items Subtotal:', summaryX, summaryY, { width: 150 });
    doc.fontSize(9).fillColor('#27ae60').font('Helvetica-Bold')
      .text(`₹${deliveredTotal.toFixed(2)}`, 500, summaryY, { align: 'right', width: 60 });

 
    if (cancelledTotal > 0) {
      doc.fontSize(9).fillColor(primaryColor).font('Helvetica')
        .text('Cancelled Items:', summaryX, summaryY + 18, { width: 150 });
      doc.fontSize(9).fillColor('#e74c3c').font('Helvetica')
        .text(`-₹${cancelledTotal.toFixed(2)}`, 500, summaryY + 18, { align: 'right', width: 60 });
    }
  
    if (order.discount > 0) {
      doc.fontSize(9).fillColor(primaryColor).font('Helvetica')
        .text('Discount:', summaryX, summaryY + 36, { width: 150 });
      doc.fontSize(9).fillColor('#27ae60').font('Helvetica')
        .text(`-₹${parseFloat(order.discount || 0).toFixed(2)}`, 500, summaryY + 36, { align: 'right', width: 60 });
    }
 
    doc.fontSize(9).fillColor(primaryColor).font('Helvetica')
      .text('Shipping:', summaryX, summaryY + 54, { width: 150 });
    doc.fontSize(9).fillColor(darkGray).font('Helvetica')
      .text('₹0.00', 500, summaryY + 54, { align: 'right', width: 60 });

 
    const totalBoxY = summaryY + 75;
    doc.rect(summaryX - 10, totalBoxY, 200, 40)
      .fillAndStroke(primaryColor, primaryColor);

    doc.fontSize(12).fillColor('#FFFFFF').font('Helvetica-Bold');
    doc.text('TOTAL DUE:', summaryX, totalBoxY + 12, { width: 100 });
    doc.text(`₹${deliveredTotal.toFixed(2)}`, summaryX + 110, totalBoxY + 12, { align: 'right', width: 80 });

   
    const paymentY = totalBoxY + 60;
    
    doc.fontSize(10).fillColor(primaryColor).font('Helvetica-Bold')
      .text('PAYMENT DETAILS', 50, paymentY);
    
    doc.fontSize(9).fillColor(textColor).font('Helvetica')
      .text(`Payment Method: ${order.paymentMethod}`, 50, paymentY + 20)
      .text(`Payment Status: ${order.paymentStatus}`, 50, paymentY + 35);

    if (order.couponApplied && order.couponCode) {
      doc.text(`Coupon Applied: ${order.couponCode}`, 50, paymentY + 50);
    }
  
    const footerY = pageHeight - 80;
    
    doc.strokeColor(accentColor).lineWidth(1);
    doc.moveTo(50, footerY).lineTo(pageWidth - 50, footerY).stroke();

    doc.fontSize(9).fillColor(textColor).font('Helvetica')
      .text('Thank you for your purchase!', 50, footerY + 10, { align: 'center' });

    doc.fontSize(8).fillColor(darkGray).font('Helvetica')
      .text('For any queries, contact: support@sentique.com | +91-9876543210', 50, footerY + 25, { align: 'center' })
      .text('This is a computer-generated invoice. No signature required.', 50, footerY + 40, { align: 'center' });

    doc.end();

  } catch (error) {
    console.error('Error generating invoice:', error);
    res.status(500).json({ success: false, error: 'Failed to generate invoice' });
  }
};

module.exports = {
  generateInvoice,
};