

// const PDFDocument = require('pdfkit');
// const mongoose = require('mongoose');
// const Order = require('../../models/orderSchema');
// const path = require('path');
// const fs = require('fs');

// const SHIPPING_CHARGE = 49;

// const generateInvoice = async (req, res) => {
//   try {
//     const user = req.session.user;
//     const userId = user?._id || user?.id;
//     const { orderId } = req.params;

//     if (!user || !mongoose.Types.ObjectId.isValid(userId)) {
//       return res.status(401).json({ success: false, error: 'Unauthorized' });
//     }

//     const order = await Order.findOne({ orderId, user: userId })
//       .populate('orderItems.product')
//       .lean();

//     if (!order) {
//       return res.status(404).json({ success: false, error: 'Order not found' });
//     }

//     const allItemsCompleted = order.orderItems.every(
//       (item) =>
//         item.status === 'Delivered' ||
//         item.status === 'Cancelled' ||
//         item.status === 'Returned'
//     );

//     if (!allItemsCompleted) {
//       return res.status(400).json({
//         success: false,
//         error:
//           'Invoice can only be downloaded when all items are either Delivered, Cancelled, or Returned',
//       });
//     }

//     // PDF Setup
//     const doc = new PDFDocument({
//       size: 'A4',
//       margin: 0,
//     });

//     res.setHeader('Content-Type', 'application/pdf');
//     res.setHeader(
//       'Content-Disposition',
//       `attachment; filename="Invoice_${orderId}.pdf"`
//     );

//     doc.pipe(res);

//     // Colors & Layout
//     const primaryColor = '#1a1a1a';
//     const accentColor = '#d4af37';
//     const darkGray = '#404040';
//     const lightGray = '#f8f8f8';
//     const borderGray = '#e0e0e0';
//     const textColor = '#2c2c2c';

//     const pageWidth = 595;
//     const pageHeight = 842;
//     const margin = 30;
//     const usableWidth = pageWidth - margin * 2;

//     // ---------------- HEADER ----------------
//     doc.rect(0, 0, pageWidth, 120).fill('#f5f5f5');

//     const logoPath = path.join(
//       __dirname,
//       '../../public/photos/zodiac perfume/brand logo.png'
//     );

//     if (fs.existsSync(logoPath)) {
//       doc.image(logoPath, margin, 15, { width: 70, height: 70 });
//     }

//     // Brand Title
//     doc
//       .fontSize(20)
//       .fillColor(primaryColor)
//       .font('Helvetica-Bold')
//       .text('SENTIQUE', margin + 85, 20);

//     doc
//       .fontSize(11)
//       .fillColor(accentColor)
//       .font('Helvetica')
//       .text('SCENT YOUR SIGNATURE', margin + 85, 44);

//     doc
//       .fontSize(8)
//       .fillColor(darkGray)
//       .font('Helvetica')
//       .text('Premium Fragrance Collection', margin + 85, 58);

//     doc
//       .fontSize(8)
//       .fillColor(textColor)
//       .font('Helvetica')
//       .text('support@sentique.com | +91-8606621947', margin + 85, 70);

//     // Invoice Header Right
//   // ---------- Invoice Header Right ----------
// const headerRightX = pageWidth - margin - 180;
// const headerWidth = 180;

// // INVOICE title
// doc
//   .fontSize(24)
//   .fillColor(primaryColor)
//   .font('Helvetica-Bold')
//   .text('INVOICE', headerRightX, 20, {
//     width: headerWidth,
//     align: 'right',
//   });

// // Start details a bit lower
// doc.fontSize(9).fillColor(textColor).font('Helvetica');

// let infoY = 52; // starting Y for invoice details
// const lineSpacing = 4; // gap between lines

// // 1️⃣ Invoice Number
// doc.text(`Invoice #: ${orderId}`, headerRightX, infoY, {
//   width: headerWidth,
//   align: 'right',
// });

// // Move just below the printed text (handles wrapping automatically)
// infoY = doc.y + lineSpacing;

// // 2️⃣ Date
// doc.text(
//   `Date: ${new Date(order.createdOn).toLocaleDateString('en-IN')}`,
//   headerRightX,
//   infoY,
//   {
//     width: headerWidth,
//     align: 'right',
//   }
// );

// // Again move below actual bottom of previous line
// infoY = doc.y + lineSpacing;

// // 3️⃣ Status
// doc.text(`Status: ${order.status}`, headerRightX, infoY, {
//   width: headerWidth,
//   align: 'right',
// });



//     // Separator Line
//     doc
//       .strokeColor(accentColor)
//       .lineWidth(2)
//       .moveTo(margin, 120)
//       .lineTo(pageWidth - margin, 120)
//       .stroke();

//     // ---------------- BILLING & SHIPPING ----------------
//     let currentY = 140;
//     const columnWidth = usableWidth / 2;

//     // BILL TO
//     doc
//       .fontSize(11)
//       .fillColor(primaryColor)
//       .font('Helvetica-Bold')
//       .text('BILL TO', margin, currentY);

//     doc
//       .fontSize(9)
//       .fillColor(textColor)
//       .font('Helvetica')
//       .text(order.deliveryAddress.name || '', margin, currentY + 16, {
//         width: columnWidth - 5,
//       })
//       .text(order.deliveryAddress.houseName || '', margin, currentY + 28, {
//         width: columnWidth - 5,
//       });

//     let billingEndY = currentY + 40;

//     if (order.deliveryAddress.landmark) {
//       doc.text(order.deliveryAddress.landmark, margin, billingEndY, {
//         width: columnWidth - 5,
//       });
//       billingEndY += 12;
//     }

//     doc.text(
//       `${order.deliveryAddress.city}, ${order.deliveryAddress.state} ${order.deliveryAddress.pincode}`,
//       margin,
//       billingEndY,
//       { width: columnWidth - 5 }
//     );
//     billingEndY += 12;

//     doc.text(`Phone: ${order.deliveryAddress.phone}`, margin, billingEndY, {
//       width: columnWidth - 5,
//     });
//     billingEndY += 5;

//     // SHIP TO
//     const shipX = margin + columnWidth;

//     doc
//       .fontSize(11)
//       .fillColor(primaryColor)
//       .font('Helvetica-Bold')
//       .text('SHIP TO', shipX, currentY);

//     doc
//       .fontSize(9)
//       .fillColor(textColor)
//       .font('Helvetica')
//       .text(order.deliveryAddress.name || '', shipX, currentY + 16, {
//         width: columnWidth - 5,
//       })
//       .text(order.deliveryAddress.houseName || '', shipX, currentY + 28, {
//         width: columnWidth - 5,
//       });

//     let shippingEndY = currentY + 40;

//     if (order.deliveryAddress.landmark) {
//       doc.text(order.deliveryAddress.landmark, shipX, shippingEndY, {
//         width: columnWidth - 5,
//       });
//       shippingEndY += 12;
//     }

//     doc.text(
//       `${order.deliveryAddress.city}, ${order.deliveryAddress.state} ${order.deliveryAddress.pincode}`,
//       shipX,
//       shippingEndY,
//       { width: columnWidth - 5 }
//     );
//     shippingEndY += 12;

//     doc.text(`Phone: ${order.deliveryAddress.phone}`, shipX, shippingEndY, {
//       width: columnWidth - 5,
//     });
//     shippingEndY += 5;

//     const tableStartY = Math.max(billingEndY, shippingEndY) + 25;

//     // ---------------- ITEMS TABLE ----------------
//     // Columns (use full width)
//     const col1X = margin; // PRODUCT
//     const col1Width = 220;

//     const col2X = col1X + col1Width; // SIZE
//     const col2Width = 60;

//     const col3X = col2X + col2Width; // QTY
//     const col3Width = 40;

//     const col4X = col3X + col3Width; // STATUS
//     const col4Width = 80;

//     const col5X = col4X + col4Width; // PRICE
//     const col5Width = 60;

//     const col6X = col5X + col5Width; // TOTAL
//     const tableEndX = pageWidth - margin;
//     const col6Width = tableEndX - col6X;

//     // Header
//     const headerHeight = 22;
//     doc
//       .rect(col1X, tableStartY, tableEndX - col1X, headerHeight)
//       .fillAndStroke(primaryColor, primaryColor);

//     doc.fontSize(9).fillColor('#FFFFFF').font('Helvetica-Bold');
//     const headerY = tableStartY + 6;

//     doc.text('PRODUCT', col1X + 6, headerY, {
//       width: col1Width - 8,
//     });
//     doc.text('SIZE', col2X + 4, headerY, {
//       width: col2Width - 6,
//     });
//     doc.text('QTY', col3X, headerY, {
//       width: col3Width,
//       align: 'center',
//     });
//     doc.text('STATUS', col4X + 4, headerY, {
//       width: col4Width - 6,
//     });
//     doc.text('PRICE', col5X, headerY, {
//       width: col5Width - 4,
//       align: 'right',
//     });
//     doc.text('TOTAL', col6X, headerY, {
//       width: col6Width - 4,
//       align: 'right',
//     });

//     // Rows
//     let tableY = tableStartY + headerHeight;
//     const rowHeight = 20;

//     let deliveredSubtotal = 0;
    
//     let cancelledTotal = 0;

//     const maxRows = Math.floor((pageHeight - tableY - 220) / rowHeight);
//     const itemsToShow = order.orderItems.slice(0, maxRows);

//     itemsToShow.forEach((item, index) => {
//       // Row background (alternate)
//       if (index % 2 === 0) {
//         doc
//           .rect(col1X, tableY, tableEndX - col1X, rowHeight)
//           .fill(lightGray);
//       }

//       // Row border
//       doc
//         .strokeColor(borderGray)
//         .lineWidth(0.5)
//         .rect(col1X, tableY, tableEndX - col1X, rowHeight)
//         .stroke();

//       const rowContentY = tableY + 4;
//       const itemName =
//         item.productName || item.product?.productName || 'N/A';
//       const variant = item.variantSize ? `${item.variantSize}ml` : 'N/A';
//       const qty = item.quantity || 1;
//       const price = parseFloat(item.price || 0);
//       const total = parseFloat(item.total || price * qty || 0);
//       const status = item.status || 'Pending';
//       const itemDiscount = parseFloat(
//         item.discountApplied || item.couponDiscount || 0
//       );
//       const itemFinalAmount = total - itemDiscount;

//       doc.fontSize(8).fillColor(textColor).font('Helvetica');

//       // PRODUCT
//       doc.text(itemName, col1X + 6, rowContentY, {
//         width: col1Width - 8,
//         ellipsis: true,
//       });

//       // SIZE
//       doc.text(variant, col2X + 4, rowContentY, {
//         width: col2Width - 6,
//       });

//       // QTY
//       doc.text(qty.toString(), col3X, rowContentY, {
//         width: col3Width,
//         align: 'center',
//       });

//       // STATUS (colored)
//       let statusColor = '#f39c12';
//       if (status === 'Delivered') statusColor = '#27ae60';
//       else if (status === 'Cancelled') statusColor = '#e74c3c';
//       else if (status === 'Returned') statusColor = '#3498db';

//       doc.fillColor(statusColor).font('Helvetica-Bold');
//       doc.text(status, col4X + 4, rowContentY, {
//         width: col4Width - 6,
//       });

//       doc.fillColor(textColor).font('Helvetica');

//       // PRICE & TOTAL columns
//       if (
//         status !== 'Cancelled' &&
//         status !== 'Returned' &&
//         status !== 'Return Request'
//       ) {
//         doc.text(`₹${price.toFixed(2)}`, col5X, rowContentY, {
//           width: col5Width - 4,
//           align: 'right',
//         });
//         doc.text(`₹${itemFinalAmount.toFixed(2)}`, col6X, rowContentY, {
//           width: col6Width - 4,
//           align: 'right',
//         });

//         deliveredSubtotal += total;
     
//       } else {
//         doc.fillColor('#999999');
//         doc.text('N/A', col5X, rowContentY, {
//           width: col5Width - 4,
//           align: 'right',
//         });
//         doc.text('-', col6X, rowContentY, {
//           width: col6Width - 4,
//           align: 'right',
//         });

//         cancelledTotal += total;
//         doc.fillColor(textColor);
//       }

//       tableY += rowHeight;
//     });

//     // Bottom border under table
//     doc
//       .strokeColor(borderGray)
//       .lineWidth(0.5)
//       .moveTo(col1X, tableY)
//       .lineTo(tableEndX, tableY)
//       .stroke();

//     // ---------------- SUMMARY SECTION ----------------
//     const summaryStartY = tableY + 20;
//     const summaryBoxWidth = 210;
//     const summaryLabelX = pageWidth - margin - summaryBoxWidth;
//     const summaryValueX = pageWidth - margin;

//     doc.fontSize(8).fillColor(textColor).font('Helvetica');

//     let summaryRowY = summaryStartY;

//     // Subtotal
//     doc.text('Subtotal:', summaryLabelX, summaryRowY, {
//       width: summaryBoxWidth - 10,
//     });
//     doc.text(
//       `₹${deliveredSubtotal.toFixed(2)}`,
//       summaryValueX - 80,
//       summaryRowY,
//       {
//         width: 80,
//         align: 'right',
//       }
//     );
//     summaryRowY += 12;

    

//     // Cancelled / Returned
//     if (cancelledTotal > 0) {
//       doc.text('Cancelled/Returned:', summaryLabelX, summaryRowY, {
//         width: summaryBoxWidth - 10,
//       });
//       doc.fillColor('#e74c3c');
//       doc.text(
//         `-₹${cancelledTotal.toFixed(2)}`,
//         summaryValueX - 80,
//         summaryRowY,
//         {
//           width: 80,
//           align: 'right',
//         }
//       );
//       doc.fillColor(textColor);
//       summaryRowY += 12;
//     }

//     // Coupon
//     if (order.couponApplied && order.couponCode) {
//       doc.text(`Coupon (${order.couponCode}):`, summaryLabelX, summaryRowY, {
//         width: summaryBoxWidth - 10,
//       });
//       doc.fillColor('#27ae60');
//       doc.text(
//         `-₹${(order.discount || 0).toFixed(2)}`,
//         summaryValueX - 80,
//         summaryRowY,
//         {
//           width: 80,
//           align: 'right',
//         }
//       );
//       doc.fillColor(textColor);
//       summaryRowY += 12;
//     }

//     // Shipping
//     doc.fillColor(textColor);
//     doc.text('Shipping:', summaryLabelX, summaryRowY, {
//       width: summaryBoxWidth - 10,
//     });
//     doc.text(
//       `₹${SHIPPING_CHARGE.toFixed(2)}`,
//       summaryValueX - 80,
//       summaryRowY,
//       {
//         width: 80,
//         align: 'right',
//       }
//     );
//     summaryRowY += 18;

//     // Final total
//     const finalTotal = Math.max(
//       0,
//       deliveredSubtotal -
        
//         (order.discount || 0) +
//         SHIPPING_CHARGE
//     );

//     const totalBoxY = summaryRowY;
//     const totalBoxHeight = 32;

//     doc
//       .rect(summaryLabelX, totalBoxY, summaryBoxWidth, totalBoxHeight)
//       .fillAndStroke(primaryColor, accentColor);

//     // TOTAL label
//     doc
//       .fontSize(10)
//       .fillColor('#FFFFFF')
//       .font('Helvetica-Bold')
//       .text('TOTAL:', summaryLabelX + 8, totalBoxY + 9, {
//         width: summaryBoxWidth / 2,
//       });

//     // TOTAL amount
//     doc
//       .fontSize(11)
//       .fillColor(accentColor)
//       .font('Helvetica-Bold')
//       .text(`₹${finalTotal.toFixed(2)}`, summaryLabelX, totalBoxY + 7, {
//         width: summaryBoxWidth - 10,
//         align: 'right',
//       });

//     // ---------------- PAYMENT DETAILS ----------------
//     const paymentY = totalBoxY + totalBoxHeight + 25;

//     doc
//       .fontSize(10)
//       .fillColor(primaryColor)
//       .font('Helvetica-Bold')
//       .text('PAYMENT DETAILS', margin, paymentY);

//     doc
//       .fontSize(8)
//       .fillColor(textColor)
//       .font('Helvetica')
//       .text(`Method: ${order.paymentMethod}`, margin, paymentY + 14)
//       .text(`Status: ${order.paymentStatus}`, margin, paymentY + 26);

//     // ---------------- FOOTER ----------------
//     const footerY = pageHeight - 50;

//     doc.strokeColor(accentColor).lineWidth(1.2);
//     doc.moveTo(margin, footerY).lineTo(pageWidth - margin, footerY).stroke();

//     doc
//       .fontSize(8)
//       .fillColor(textColor)
//       .font('Helvetica')
//       .text('Thank you for your purchase!', margin, footerY + 6, {
//         align: 'center',
//         width: usableWidth,
//       });

//     doc
//       .fontSize(7)
//       .fillColor(darkGray)
//       .font('Helvetica')
//       .text(
//         'For queries: support@sentique.com | +91-8606621947',
//         margin,
//         footerY + 16,
//         { align: 'center', width: usableWidth }
//       )
//       .text(
//         'This is a computer-generated invoice. No signature required.',
//         margin,
//         footerY + 24,
//         { align: 'center', width: usableWidth }
//       );

//     doc.end();
//   } catch (error) {
//     console.error('Error generating invoice:', error);
//     res
//       .status(500)
//       .json({ success: false, error: 'Failed to generate invoice' });
//   }
// };

// module.exports = { generateInvoice };





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

    // PDF Setup
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

    // Colors
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

    // ---------------- HEADER ----------------
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

    // Right Side Header
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

    // Separator
    doc
      .strokeColor(accentColor)
      .lineWidth(2)
      .moveTo(margin, 120)
      .lineTo(pageWidth - margin, 120)
      .stroke();

    // ---------------- BILLING & SHIPPING ----------------
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

    // ---------------- ITEMS TABLE ----------------
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

// For delivered items only → count discount
if (item.status === "Delivered") {
  if (!order.couponRevoked) {
    // Normal case – coupon active
    discount = item.couponDiscount;
  } else {
    // Coupon revoked – use original discount
    discount = item.originalCouponDiscount;
  }
}


      const finalAmount = item.status === 'Delivered' ? total : 0;

      // Collect summary values  
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

      // PRICE = always original
      doc.text(`₹${price.toFixed(2)}`, col5X, tY, { width: col5W, align: 'right' });

      // TOTAL = final amount (0 if cancelled/returned)
      doc.text(`₹${finalAmount.toFixed(2)}`, col6X, tY, { width: col6W, align: 'right' });

      y += rowH;
    });

    // Bottom border
    doc.strokeColor(borderGray).moveTo(col1X, y).lineTo(pageWidth - margin, y).stroke();

    // ---------------- SUMMARY ----------------
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




