const mongoose = require('mongoose');
const Order = require("../../models/orderSchema");
const { exec } = require('child_process');
const fs = require('fs').promises;
const path = require('path');

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

    // Format date
    const orderDate = new Date(order.createdOn).toLocaleDateString('en-IN', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
    });

    // Prepare LaTeX content
    const latexContent = `
\\documentclass{article}
\\usepackage[utf8]{inputenc}
\\usepackage{geometry}
\\geometry{a4paper, margin=1in}
\\usepackage{booktabs}
\\usepackage{noto}

\\begin{document}

\\begin{center}
  \\LARGE\\textbf{Invoice} \\\\
  \\vspace{0.5cm}
  \\normalsize
  Order ID: ${order.orderId} \\\\
  Order Date: ${orderDate}
\\end{center}

\\vspace{1cm}

\\textbf{Billed To:} \\\\
${order.deliveryAddress.name} \\\\
${order.deliveryAddress.houseName} \\\\
${order.deliveryAddress.city}, ${order.deliveryAddress.state} ${order.deliveryAddress.pincode} \\\\
Phone: ${order.deliveryAddress.phone} \\\\

\\vspace{1cm}

\\begin{tabular}{l l r r}
  \\toprule
  \\textbf{Item} & \\textbf{Quantity} & \\textbf{Price} & \\textbf{Total} \\\\
  \\midrule
${order.orderItems
  .map(
    item => `  ${item.productName} (${item.variantSize || 'N/A'}) & ${item.quantity} & ₹${item.price} & ₹${item.total} \\\\`
  )
  .join('\n')}
  \\midrule
  \\multicolumn{3}{r}{\\textbf{Subtotal}} & ₹${order.totalPrice} \\\\
  \\multicolumn{3}{r}{\\textbf{Discount}} & ₹${order.discount} \\\\
  \\multicolumn{3}{r}{\\textbf{Shipping}} & ₹0.00 \\\\
  \\multicolumn{3}{r}{\\textbf{Grand Total}} & ₹${order.finalAmount} \\\\
  \\bottomrule
\\end{tabular}

\\vspace{1cm}

\\textbf{Payment Method:} ${order.paymentMethod} \\\\
\\textbf{Payment Status:} ${order.paymentStatus}

\\end{document}
`;

    // Write LaTeX file
    const tempDir = path.join(__dirname, '../temp');
    await fs.mkdir(tempDir, { recursive: true });
    const latexFilePath = path.join(tempDir, `invoice_${orderId}.tex`);
    const pdfFilePath = path.join(tempDir, `invoice_${orderId}.pdf`);
    await fs.writeFile(latexFilePath, latexContent);

    // Compile LaTeX to PDF
    await new Promise((resolve, reject) => {
      exec(`latexmk -pdf -output-directory=${tempDir} ${latexFilePath}`, (error, stdout, stderr) => {
        if (error) {
          console.error('LaTeX compilation error:', stderr);
          return reject(error);
        }
        resolve();
      });
    });

    // Send PDF file
    res.sendFile(pdfFilePath, { headers: { 'Content-Type': 'application/pdf' } }, async (err) => {
      if (err) {
        console.error('Error sending PDF:', err);
        res.status(500).json({ success: false, error: 'Failed to generate invoice' });
      }
      // Clean up files
      await fs.unlink(latexFilePath).catch(() => {});
      await fs.unlink(pdfFilePath).catch(() => {});
    });
  } catch (error) {
    console.error('Error generating invoice:', error);
    res.status(500).json({ success: false, error: 'Failed to generate invoice' });
  }
};

module.exports = {
  generateInvoice,
};