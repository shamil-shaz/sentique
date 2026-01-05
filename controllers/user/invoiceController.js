
const PDFDocument = require('pdfkit');
const mongoose = require('mongoose');
const Order = require('../../models/orderSchema');
const path = require('path');
const fs = require('fs');

const SHIPPING_CHARGE = 49;

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

    const allItemsCompleted = order.orderItems.every(
      (item) =>
        item.status === 'Delivered' ||
        item.status === 'Cancelled' ||
        item.status === 'Returned'
    );

    if (!allItemsCompleted) {
      return res.status(400).json({
        success: false,
        error:
          'Invoice can only be downloaded when all items are either Delivered, Cancelled, or Returned',
      });
    }
 
    const doc = new PDFDocument({
      size: 'A4',
      margin: 0,
    });

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader(
      'Content-Disposition',
      `attachment; filename="Invoice_${orderId}.pdf"`
    );

    doc.pipe(res);
   
    const primaryColor = '#1a1a1a';
    const accentColor = '#d4af37';
    const darkGray = '#404040';
    const lightGray = '#f8f8f8';
    const borderGray = '#e0e0e0';
    const textColor = '#2c2c2c';

    const pageWidth = 595;
    const pageHeight = 842;
    const margin = 30;
    const usableWidth = pageWidth - margin * 2;
    
    doc.rect(0, 0, pageWidth, 120).fill('#f5f5f5');

    const logoPath = path.join(
      __dirname,
      '../../public/photos/zodiac perfume/brand logo.png'
    );

    if (fs.existsSync(logoPath)) {
      doc.image(logoPath, margin, 15, { width: 70, height: 70 });
    }

    doc
      .fontSize(20)
      .fillColor(primaryColor)
      .font('Helvetica-Bold')
      .text('SENTIQUE', margin + 85, 20);

    doc
      .fontSize(11)
      .fillColor(accentColor)
      .font('Helvetica')
      .text('SCENT YOUR SIGNATURE', margin + 85, 44);

    doc
      .fontSize(8)
      .fillColor(darkGray)
      .font('Helvetica')
      .text('Premium Fragrance Collection', margin + 85, 58);

    doc
      .fontSize(8)
      .fillColor(textColor)
      .font('Helvetica')
      .text('support@sentique.com | +91-8606621947', margin + 85, 70);

 
    const headerRightX = pageWidth - margin - 180;
    const headerWidth = 180;

    doc
      .fontSize(24)
      .fillColor(primaryColor)
      .font('Helvetica-Bold')
      .text('INVOICE', headerRightX, 20, {
        width: headerWidth,
        align: 'right',
      });

    doc.fontSize(9).fillColor(textColor).font('Helvetica');

    let infoY = 52;
    const spacing = 4;

    doc.text(`Invoice #: ${orderId}`, headerRightX, infoY, {
      width: headerWidth,
      align: 'right',
    });

    infoY = doc.y + spacing;

    doc.text(
      `Date: ${new Date(order.createdOn).toLocaleDateString('en-IN')}`,
      headerRightX,
      infoY,
      {
        width: headerWidth,
        align: 'right',
      }
    );

    infoY = doc.y + spacing;

    doc.text(`Status: ${order.status}`, headerRightX, infoY, {
      width: headerWidth,
      align: 'right',
    });

    doc
      .strokeColor(accentColor)
      .lineWidth(2)
      .moveTo(margin, 120)
      .lineTo(pageWidth - margin, 120)
      .stroke();

    
    let currentY = 140;
    const columnWidth = usableWidth / 2;

    doc
      .fontSize(11)
      .fillColor(primaryColor)
      .font('Helvetica-Bold')
      .text('BILL TO', margin, currentY);

    doc
      .fontSize(9)
      .fillColor(textColor)
      .font('Helvetica')
      .text(order.deliveryAddress.name || '', margin, currentY + 16)
      .text(order.deliveryAddress.houseName || '', margin, currentY + 28);

    let billingEnd = currentY + 40;

    if (order.deliveryAddress.landmark) {
      doc.text(order.deliveryAddress.landmark, margin, billingEnd);
      billingEnd += 12;
    }

    doc.text(
      `${order.deliveryAddress.city}, ${order.deliveryAddress.state} ${order.deliveryAddress.pincode}`,
      margin,
      billingEnd
    );
    billingEnd += 12;

    doc.text(
      `Phone: ${order.deliveryAddress.phone}`,
      margin,
      billingEnd
    );

    const shipX = margin + columnWidth;

    doc
      .fontSize(11)
      .fillColor(primaryColor)
      .font('Helvetica-Bold')
      .text('SHIP TO', shipX, currentY);

    doc
      .fontSize(9)
      .fillColor(textColor)
      .font('Helvetica')
      .text(order.deliveryAddress.name || '', shipX, currentY + 16)
      .text(order.deliveryAddress.houseName || '', shipX, currentY + 28);

    let shipEnd = currentY + 40;

    if (order.deliveryAddress.landmark) {
      doc.text(order.deliveryAddress.landmark, shipX, shipEnd);
      shipEnd += 12;
    }

    doc.text(
      `${order.deliveryAddress.city}, ${order.deliveryAddress.state} ${order.deliveryAddress.pincode}`,
      shipX,
      shipEnd
    );
    shipEnd += 12;

    doc.text(`Phone: ${order.deliveryAddress.phone}`, shipX, shipEnd);

    const tableStartY = Math.max(billingEnd, shipEnd) + 25;

    
    const col1X = margin;
    const col1W = 220;

    const col2X = col1X + col1W;
    const col2W = 60;

    const col3X = col2X + col2W;
    const col3W = 40;

    const col4X = col3X + col3W;
    const col4W = 80;

    const col5X = col4X + col4W;
    const col5W = 60;

    const col6X = col5X + col5W;
    const col6W = pageWidth - margin - col6X;

    const headerH = 22;

    doc.rect(col1X, tableStartY, pageWidth - margin - col1X, headerH).fillAndStroke(primaryColor, primaryColor);

    doc.fontSize(9).fillColor('#FFF').font('Helvetica-Bold');

    const headY = tableStartY + 6;

    doc.text('PRODUCT', col1X + 6, headY, { width: col1W - 8 });
    doc.text('SIZE', col2X + 4, headY);
    doc.text('QTY', col3X, headY, { width: col3W, align: 'center' });
    doc.text('STATUS', col4X + 4, headY);
    doc.text('UNIT PRICE', col5X, headY, { width: col5W, align: 'right' });
    doc.text('SUBTOTAL', col6X, headY, { width: col6W, align: 'right' });

    let y = tableStartY + headerH;
    const rowH = 20;

    let subtotal = 0;
    let totalDiscount = 0;

    order.orderItems.forEach((item, index) => {
      if (index % 2 === 0) {
        doc.rect(col1X, y, pageWidth - margin - col1X, rowH).fill(lightGray);
      }

      doc.strokeColor(borderGray).rect(col1X, y, pageWidth - margin - col1X, rowH).stroke();

      const tY = y + 4;

      const name = item.productName || item.product?.productName || 'N/A';
      const variant = item.variantSize ? `${item.variantSize}ml` : 'N/A';
      const qty = item.quantity;
      const price = item.price;
      const total = item.total;
      let discount = 0;


if (item.status === "Delivered") {
  if (!order.couponRevoked) {
   
    discount = item.couponDiscount;
  } else {
    
    discount = item.originalCouponDiscount;
  }
}


      const finalAmount = item.status === 'Delivered' ? total : 0;

      
      if (item.status === 'Delivered') {
        subtotal += price * qty;
        totalDiscount += discount;
      }

      doc.fontSize(8).fillColor(textColor).font('Helvetica');

      doc.text(name, col1X + 6, tY, { width: col1W - 8 });

      doc.text(variant, col2X + 4, tY);

      doc.text(qty.toString(), col3X, tY, { width: col3W, align: 'center' });

      let color = '#f39c12';
      if (item.status === 'Delivered') color = '#27ae60';
      if (item.status === 'Cancelled') color = '#e74c3c';
      if (item.status === 'Returned') color = '#3498db';

      doc.fillColor(color).font('Helvetica-Bold');

      doc.text(item.status, col4X + 4, tY);

      doc.fillColor(textColor).font('Helvetica');

     
      doc.text(`₹${price.toFixed(2)}`, col5X, tY, { width: col5W, align: 'right' });

      
      doc.text(`₹${finalAmount.toFixed(2)}`, col6X, tY, { width: col6W, align: 'right' });

      y += rowH;
    });

    
    doc.strokeColor(borderGray).moveTo(col1X, y).lineTo(pageWidth - margin, y).stroke();

   
    const sumStartY = y + 20;
    const boxW = 210;
    const labelX = pageWidth - margin - boxW;
    const valueX = pageWidth - margin;

    doc.fontSize(8).fillColor(textColor).font('Helvetica');

    let sy = sumStartY;

    doc.text('Subtotal:', labelX, sy);
    doc.text(`₹${subtotal.toFixed(2)}`, valueX - 80, sy, { width: 80, align: 'right' });
    sy += 12;

    doc.text('Discount:', labelX, sy);
    doc.fillColor('#27ae60');
    doc.text(`-₹${totalDiscount.toFixed(2)}`, valueX - 80, sy, { width: 80, align: 'right' });
    doc.fillColor(textColor);
    sy += 12;

    doc.text('Shipping:', labelX, sy);
    doc.text(`₹${SHIPPING_CHARGE.toFixed(2)}`, valueX - 80, sy, { width: 80, align: 'right' });
    sy += 18;

    const finalTotal = subtotal - totalDiscount + SHIPPING_CHARGE;

    doc.rect(labelX, sy, boxW, 32).fillAndStroke(primaryColor, accentColor);

    doc
      .fontSize(10)
      .fillColor('#FFF')
      .font('Helvetica-Bold')
      .text('TOTAL:', labelX + 8, sy + 9);

    doc
      .fontSize(11)
      .fillColor(accentColor)
      .font('Helvetica-Bold')
      .text(`₹${finalTotal.toFixed(2)}`, labelX, sy + 7, {
        width: boxW - 10,
        align: 'right',
      });

    // ---------------- FOOTER ----------------
    const footerY = pageHeight - 50;

    doc.strokeColor(accentColor).moveTo(margin, footerY).lineTo(pageWidth - margin, footerY).stroke();

    doc
      .fontSize(8)
      .fillColor(textColor)
      .text('Thank you for your purchase!', margin, footerY + 6, {
        align: 'center',
        width: usableWidth,
      });

    doc
      .fontSize(7)
      .fillColor(darkGray)
      .text(
        'For queries: support@sentique.com | +91-8606621947',
        margin,
        footerY + 16,
        { align: 'center', width: usableWidth }
      )
      .text(
        'This is a computer-generated invoice. No signature required.',
        margin,
        footerY + 24,
        { align: 'center', width: usableWidth }
      );

    doc.end();
  } catch (error) {
    console.error('Error generating invoice:', error);
    res.status(500).json({ success: false, error: 'Failed to generate invoice' });
  }
};

module.exports = { generateInvoice };




