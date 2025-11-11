const PDFDocument = require('pdfkit');
const mongoose = require('mongoose');
const Order = require('../../models/orderSchema');
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

    const doc = new PDFDocument({ size: 'A4', margin: 50 });

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader(
      'Content-Disposition',
      `attachment; filename="Invoice_${orderId}.pdf"`
    );
    doc.pipe(res);

    const primaryColor = '#000000';
    const accentColor = '#d4af37';
    const darkGray = '#333333';
    const lightGray = '#f5f5f5';
    const textColor = '#000000';
    const pageWidth = doc.page.width;
    const pageHeight = doc.page.height;
    const margin = 50;

    const logoPath = path.join(
      __dirname,
      '../../public/photos/zodiac perfume/brand logo.png'
    );
    if (fs.existsSync(logoPath)) {
      doc.image(logoPath, 50, 35, { width: 100, height: 100 });
    }

    doc
      .fontSize(16)
      .fillColor(primaryColor)
      .font('Helvetica-Bold')
      .text('SENTIQUE', 160, 45);
    doc
      .fontSize(11)
      .fillColor(accentColor)
      .font('Helvetica')
      .text('SCENT YOUR SIGNATURE', 160, 65);
    doc
      .fontSize(9)
      .fillColor(darkGray)
      .font('Helvetica')
      .text('Email: support@sentique.com', 160, 85)
      .text('Phone: +91-8606621947', 160, 100)
      .text('Address: City, State - Pincode', 160, 115);

    doc
      .fontSize(20)
      .fillColor(primaryColor)
      .font('Helvetica-Bold')
      .text('INVOICE', margin, 40, { align: 'right' });
    doc.fontSize(9).fillColor(darkGray).font('Helvetica');
    doc.text(`Invoice #: ${orderId}`, margin, 70, { align: 'right' });
    doc.text(
      `Invoice Date: ${new Date(order.createdOn).toLocaleDateString('en-IN')}`,
      margin,
      85,
      { align: 'right' }
    );
    doc.text(`Order Status: ${order.status}`, margin, 100, { align: 'right' });
    doc.text(`Payment: ${order.paymentStatus}`, margin, 115, { align: 'right' });

    doc
      .strokeColor(accentColor)
      .lineWidth(2)
      .moveTo(margin, 150)
      .lineTo(pageWidth - margin, 150)
      .stroke();

    const billingY = 170;
    doc
      .fontSize(11)
      .fillColor(primaryColor)
      .font('Helvetica-Bold')
      .text('BILL TO:', 50, billingY);
    doc
      .fontSize(9)
      .fillColor(textColor)
      .font('Helvetica')
      .text(order.deliveryAddress.name, 50, billingY + 20)
      .text(order.deliveryAddress.houseName, 50, billingY + 35);
    let currentY = billingY + 35;
    if (order.deliveryAddress.landmark) {
      currentY += 15;
      doc.text(order.deliveryAddress.landmark, 50, currentY);
    }
    currentY += 15;
    doc.text(
      `${order.deliveryAddress.city}, ${order.deliveryAddress.state} ${order.deliveryAddress.pincode}`,
      50,
      currentY
    );
    currentY += 15;
    doc.text(`Phone: ${order.deliveryAddress.phone}`, 50, currentY);

    doc
      .fontSize(11)
      .fillColor(primaryColor)
      .font('Helvetica-Bold')
      .text('SHIP TO:', 320, billingY);
    doc
      .fontSize(9)
      .fillColor(textColor)
      .font('Helvetica')
      .text(order.deliveryAddress.name, 320, billingY + 20)
      .text(order.deliveryAddress.houseName, 320, billingY + 35);
    currentY = billingY + 35;
    if (order.deliveryAddress.landmark) {
      currentY += 15;
      doc.text(order.deliveryAddress.landmark, 320, currentY);
    }
    currentY += 15;
    doc.text(
      `${order.deliveryAddress.city}, ${order.deliveryAddress.state}`,
      320,
      currentY
    );

    const tableStartY = billingY + 130;
    const tableHeight = 25;
    const col1X = 50,
      col1Width = 200;
    const col2X = 250,
      col2Width = 50;
    const col3X = 300,
      col3Width = 40;
    const col4X = 340,
      col4Width = 60;
    const col5X = 400,
      col5Width = 70;
    const col6X = 470,
      col6Width = 75;
    const tableEndX = 545;

    const drawTableHeader = (y) => {
      doc
        .rect(col1X, y, tableEndX - col1X, tableHeight)
        .fillAndStroke(primaryColor, primaryColor);
      doc.fontSize(10).fillColor('#FFFFFF').font('Helvetica-Bold');
      doc.text('DESCRIPTION', col1X + 10, y + 8, { width: col1Width - 10 });
      doc.text('SIZE', col2X, y + 8, { width: col2Width });
      doc.text('QTY', col3X, y + 8, { width: col3Width, align: 'center' });
      doc.text('STATUS', col4X, y + 8, { width: col4Width });
      doc.text('UNIT PRICE', col5X, y + 8, { width: col5Width, align: 'right' });
      doc.text('AMOUNT', col6X, y + 8, { width: col6Width, align: 'right' });
    };

    drawTableHeader(tableStartY);

    let tableY = tableStartY + tableHeight;
    const rowHeight = 40;
    let deliveredSubtotal = 0;
    let deliveredDiscount = 0;
    let cancelledTotal = 0;

    order.orderItems.forEach((item, index) => {
      if (tableY + rowHeight > pageHeight - 150) {
        doc.addPage();
        tableY = margin;
        drawTableHeader(tableY);
        tableY += tableHeight;
      }

      if (index % 2 === 0) {
        doc.rect(col1X, tableY, tableEndX - col1X, rowHeight).fill(lightGray);
      }

      const rowContentY = tableY + 10;
      const itemName = item.productName || 'N/A';
      const variant = item.variantSize ? `${item.variantSize}ml` : 'N/A';
      const qty = item.quantity || 1;
      const price = parseFloat(item.price || 0).toFixed(2);
      const total = parseFloat(item.total || 0).toFixed(2);
      const status = item.status || 'Pending';
      const itemDiscount = parseFloat(
        item.discountApplied || item.couponDiscount || 0
      );
      const itemFinalAmount = parseFloat(total) - itemDiscount;

      doc.fontSize(9).fillColor(textColor).font('Helvetica');
      doc.text(itemName, col1X + 10, rowContentY, {
        width: col1Width - 15,
        ellipsis: true,
      });
      doc.text(variant, col2X, rowContentY, { width: col2Width });
      doc.text(qty.toString(), col3X, rowContentY, {
        width: col3Width,
        align: 'center',
      });

      let statusColor = '#f39c12';
      if (status === 'Delivered') statusColor = '#27ae60';
      else if (status === 'Cancelled') statusColor = '#e74c3c';
      else if (status === 'Returned') statusColor = '#3498db';
      doc.fillColor(statusColor).font('Helvetica-Bold');
      doc.text(status, col4X, rowContentY, { width: col4Width });
      doc.fillColor(textColor).font('Helvetica');

      if (
        status !== 'Cancelled' &&
        status !== 'Returned' &&
        status !== 'Return Request'
      ) {
        doc.text(`₹${price}`, col5X, rowContentY, {
          width: col5Width,
          align: 'right',
        });
        doc.text(`₹${itemFinalAmount.toFixed(2)}`, col6X, rowContentY, {
          width: col6Width,
          align: 'right',
        });
        deliveredSubtotal += parseFloat(total);
        deliveredDiscount += itemDiscount;
      } else if (status === 'Cancelled' || status === 'Returned') {
        doc.fillColor('#999999');
        doc.text('N/A', col5X, rowContentY, { width: col5Width, align: 'right' });
        doc.text('-', col6X, rowContentY, { width: col6Width, align: 'right' });
        cancelledTotal += parseFloat(total);
      }

      tableY += rowHeight;
    });

    doc
      .strokeColor(accentColor)
      .lineWidth(1)
      .moveTo(margin, tableY)
      .lineTo(pageWidth - margin, tableY)
      .stroke();

    if (tableY + 150 > pageHeight - margin) {
      doc.addPage();
      tableY = margin;
    }

    const summaryY = tableY + 20;
    const summaryLabelX = 350;
    const summaryValueX = 485;
    let summaryRowY = summaryY;

    doc.fontSize(9).fillColor(primaryColor).font('Helvetica-Bold');
    doc.text('Active Items Subtotal:', summaryLabelX, summaryRowY);
    doc.fillColor('#27ae60').font('Helvetica-Bold');
    doc.text(`₹${deliveredSubtotal.toFixed(2)}`, summaryValueX, summaryRowY, {
      align: 'right',
    });
    summaryRowY += 18;

    if (cancelledTotal > 0) {
      doc.fillColor(primaryColor).font('Helvetica');
      doc.text('Cancelled/Returned Items:', summaryLabelX, summaryRowY);
      doc.fillColor('#e74c3c').font('Helvetica');
      doc.text(`-₹${cancelledTotal.toFixed(2)}`, summaryValueX, summaryRowY, {
        align: 'right',
      });
      summaryRowY += 18;
    }

    if (deliveredDiscount > 0) {
      doc.fillColor(primaryColor).font('Helvetica');
      doc.text('Item Discount:', summaryLabelX, summaryRowY);
      doc.fillColor('#27ae60').font('Helvetica');
      doc.text(`-₹${deliveredDiscount.toFixed(2)}`, summaryValueX, summaryRowY, {
        align: 'right',
      });
      summaryRowY += 18;
    }

    doc.fillColor(primaryColor).font('Helvetica');
    doc.text('Shipping:', summaryLabelX, summaryRowY);
    doc.fillColor(darkGray).font('Helvetica');
    doc.text('₹0.00', summaryValueX, summaryRowY, { align: 'right' });

    const finalTotal = Math.max(0, deliveredSubtotal - deliveredDiscount);

    const totalBoxY = summaryRowY + 21;
    doc
      .rect(summaryLabelX - 10, totalBoxY, 205, 40)
      .fillAndStroke(primaryColor, primaryColor);

    doc.fontSize(12).fillColor('#FFFFFF').font('Helvetica-Bold');
    doc.text('TOTAL AMOUNT:', summaryLabelX, totalBoxY + 12, { width: 100 });
    doc.text(`₹${finalTotal.toFixed(2)}`, summaryLabelX + 110, totalBoxY + 12, {
      align: 'right',
      width: 85,
    });

    const paymentY = totalBoxY + 60;
    doc
      .fontSize(10)
      .fillColor(primaryColor)
      .font('Helvetica-Bold')
      .text('PAYMENT DETAILS', 50, paymentY);
    doc
      .fontSize(9)
      .fillColor(textColor)
      .font('Helvetica')
      .text(`Payment Method: ${order.paymentMethod}`, 50, paymentY + 20)
      .text(`Payment Status: ${order.paymentStatus}`, 50, paymentY + 35);

    if (order.couponApplied && order.couponCode) {
      doc.text(`Coupon Applied: ${order.couponCode}`, 50, paymentY + 50);
      doc.text(
        `Total Coupon Discount: ₹${order.discount.toFixed(2)}`,
        50,
        paymentY + 65
      );
    }

    const footerY = pageHeight - 80;
    doc.strokeColor(accentColor).lineWidth(1);
    doc.moveTo(margin, footerY).lineTo(pageWidth - margin, footerY).stroke();
    doc
      .fontSize(9)
      .fillColor(textColor)
      .font('Helvetica')
      .text('Thank you for your purchase!', margin, footerY + 10, {
        align: 'center',
      });
    doc
      .fontSize(8)
      .fillColor(darkGray)
      .font('Helvetica')
      .text(
        'For any queries, contact: support@sentique.com | +91-8606621947',
        margin,
        footerY + 25,
        { align: 'center' }
      )
      .text(
        'This is a computer-generated invoice. No signature required.',
        margin,
        footerY + 40,
        { align: 'center' }
      );

    doc.end();
  } catch (error) {
    console.error('Error generating invoice:', error);
    res
      .status(500)
      .json({ success: false, error: 'Failed to generate invoice' });
  }
};

module.exports = { generateInvoice };
