// ========== FILE: controllers/admin/salesReportController.js ==========
const mongoose = require('mongoose');
const Order = require('../../models/orderSchema');
const User = require('../../models/userSchema');
const PDFDocument = require('pdfkit');
const ExcelJS = require('exceljs');

/**
 * Normalize date to midnight (00:00:00)
 */
const normalizeDate = (date) => {
    const d = new Date(date);
    d.setHours(0, 0, 0, 0);
    return d;
};

/**
 * Get date range based on filter type
 * For custom range, makes the end date inclusive (adds 1 day)
 */
const getDateRange = (filterType, customStartDate = null, customEndDate = null) => {
    const now = new Date();
    const today = normalizeDate(now);
    let startDate, endDate, displayLabel;

    switch (filterType) {
        case 'daily':
            startDate = today;
            endDate = new Date(today.getTime() + 24 * 60 * 60 * 1000);
            displayLabel = `Daily Report: ${today.toLocaleDateString('en-IN')}`;
            break;

        case 'weekly':
            // Current week (Monday to Sunday)
            const dayOfWeek = today.getDay();
            const diffToMonday = today.getDate() - dayOfWeek + (dayOfWeek === 0 ? -6 : 1);
            startDate = new Date(today.getFullYear(), today.getMonth(), diffToMonday);
            startDate = normalizeDate(startDate);
            endDate = new Date(startDate.getTime() + 7 * 24 * 60 * 60 * 1000);
            const weekEnd = new Date(endDate.getTime() - 1);
            displayLabel = `Weekly Report: ${startDate.toLocaleDateString('en-IN')} – ${weekEnd.toLocaleDateString('en-IN')}`;
            break;

        case 'monthly':
            // Current month only
            startDate = new Date(now.getFullYear(), now.getMonth(), 1);
            startDate = normalizeDate(startDate);
            endDate = new Date(now.getFullYear(), now.getMonth() + 1, 1);
            const monthName = startDate.toLocaleDateString('en-IN', { month: 'long', year: 'numeric' });
            displayLabel = `Monthly Report: ${monthName}`;
            break;

        case 'yearly':
            // Current year only
            startDate = new Date(now.getFullYear(), 0, 1);
            startDate = normalizeDate(startDate);
            endDate = new Date(now.getFullYear() + 1, 0, 1);
            displayLabel = `Yearly Report: ${now.getFullYear()}`;
            break;

        case 'custom':
            if (!customStartDate || !customEndDate) {
                throw new Error('Custom date range requires both start and end dates');
            }
            startDate = normalizeDate(new Date(customStartDate));
            const endDateNormalized = normalizeDate(new Date(customEndDate));
            
            // Make end date inclusive by adding 1 day
            endDate = new Date(endDateNormalized.getTime() + 24 * 60 * 60 * 1000);
            
            displayLabel = `Custom Range: ${startDate.toLocaleDateString('en-IN')} – ${endDateNormalized.toLocaleDateString('en-IN')}`;
            break;

        default:
            startDate = today;
            endDate = new Date(today.getTime() + 24 * 60 * 60 * 1000);
            displayLabel = `Daily Report: ${today.toLocaleDateString('en-IN')}`;
    }

    return { startDate, endDate, displayLabel };
};

/**
 * Validate date range
 * Ensures no future dates and start date <= end date
 */
const validateDateRange = (startDate, endDate = null) => {
    const today = normalizeDate(new Date());
    const start = normalizeDate(new Date(startDate));

    // Check if start date is in future
    if (start > today) {
        return {
            valid: false,
            error: '⚠️ Start date cannot be in the future. Please select a valid date.'
        };
    }

    // If end date provided, validate it
    if (endDate) {
        const end = normalizeDate(new Date(endDate));

        if (end > today) {
            return {
                valid: false,
                error: '⚠️ End date cannot be in the future. Please select a valid date.'
            };
        }

        if (start > end) {
            return {
                valid: false,
                error: '⚠️ Start date cannot be after end date. Please select valid dates.'
            };
        }
    }

    return { valid: true };
};

/**
 * Main Sales Report Controller
 * Handles GET request for sales report view
 */
const getSalesReport = async (req, res) => {
    try {
        const { filterType = 'daily', startDate = null, endDate = null, page = 1, limit = 10 } = req.query;

        let queryStartDate, queryEndDate, displayLabel;
        let validationError = null;

        try {
            // For custom filter, validate dates first
            if (filterType === 'custom') {
                if (!startDate || !endDate) {
                    return res.status(400).render('error', {
                        message: 'Custom date range requires both start and end dates'
                    });
                }

                const validation = validateDateRange(startDate, endDate);
                if (!validation.valid) {
                    validationError = validation.error;
                }
            }

            const dateRangeResult = getDateRange(filterType, startDate, endDate);
            queryStartDate = dateRangeResult.startDate;
            queryEndDate = dateRangeResult.endDate;
            displayLabel = dateRangeResult.displayLabel;

        } catch (error) {
            return res.status(400).render('error', {
                message: error.message
            });
        }

        const skip = (page - 1) * limit;

        // Build query filter for MongoDB
        const dateFilter = {
            createdOn: {
                $gte: queryStartDate,
                $lt: queryEndDate
            }
        };

        // Get total count of orders in date range
        const totalOrders = await Order.countDocuments(dateFilter);
        const totalPages = Math.ceil(totalOrders / limit) || 1;

        // Fetch paginated orders
        let orders = [];
        if (totalOrders > 0 && !validationError) {
            orders = await Order.find(dateFilter)
                .populate({
                    path: 'user',
                    select: 'name email phone',
                    model: 'User'
                })
                .sort({ createdOn: -1 })
                .skip(skip)
                .limit(limit)
                .lean();
        }

        // Format orders for display
        const formattedOrders = orders.map(order => {
            const userData = order.user
                ? {
                    _id: order.user._id,
                    name: order.user.name || 'Guest User',
                    email: order.user.email || 'N/A',
                    phone: order.user.phone || order.deliveryAddress?.phone || 'N/A'
                }
                : {
                    name: order.deliveryAddress?.name || 'Guest User',
                    email: 'N/A',
                    phone: order.deliveryAddress?.phone || 'N/A'
                };

            const orderDate = new Date(order.createdOn);
            const formattedDate = orderDate.toLocaleDateString('en-IN');

            const totalItems = order.orderItems?.reduce((sum, item) => sum + item.quantity, 0) || 0;
            const firstProduct = order.orderItems?.[0]?.productName || 'N/A';

            return {
                _id: order._id,
                orderId: order.orderId,
                orderIdShort: order.orderId.slice(-6).toUpperCase(),
                user: userData,
                orderItems: order.orderItems || [],
                totalPrice: order.totalPrice || 0,
                discount: order.discount || 0,
                couponCode: order.couponCode || 'N/A',
                couponApplied: order.couponApplied || false,
                finalAmount: order.finalAmount || 0,
                paymentMethod: order.paymentMethod || 'N/A',
                status: order.status || 'Pending',
                deliveryAddress: order.deliveryAddress || {},
                createdOn: order.createdOn,
                orderDate: formattedDate,
                firstProduct: firstProduct,
                totalItems: totalItems
            };
        });

        // Get all orders for the period to calculate summary statistics
        let allOrdersInPeriod = [];
        if (totalOrders > 0 && !validationError) {
            allOrdersInPeriod = await Order.find(dateFilter).lean();
        }

        // Calculate summary statistics
        const totalRevenue = allOrdersInPeriod.reduce((sum, order) => sum + (order.finalAmount || 0), 0);
        const totalDiscountAmount = allOrdersInPeriod.reduce((sum, order) => sum + (order.discount || 0), 0);
        const totalCouponsApplied = allOrdersInPeriod.filter(o => o.couponApplied).length;

        const statusBreakdown = {
            pending: allOrdersInPeriod.filter(o => o.status === 'Pending').length,
            processing: allOrdersInPeriod.filter(o => o.status === 'Processing').length,
            shipped: allOrdersInPeriod.filter(o => o.status === 'Shipped').length,
            delivered: allOrdersInPeriod.filter(o => o.status === 'Delivered').length,
            cancelled: allOrdersInPeriod.filter(o => o.status === 'Cancelled').length,
            returned: allOrdersInPeriod.filter(o => o.status === 'Returned').length
        };

        // Format dates for display
        const startDateDisplay = queryStartDate.toLocaleDateString('en-IN');
        const endDateDisplay = new Date(queryEndDate.getTime() - 1).toLocaleDateString('en-IN');

        res.render('salesReport', {
            orders: formattedOrders,
            totalOrders: totalOrders,
            totalRevenue: totalRevenue,
            totalDiscount: totalDiscountAmount,
            totalCouponsApplied: totalCouponsApplied,
            averageOrderValue: totalOrders > 0 ? (totalRevenue / totalOrders).toFixed(2) : 0,
            statusBreakdown: statusBreakdown,
            currentPage: parseInt(page),
            totalPages: totalPages,
            limit: parseInt(limit),
            hasNextPage: parseInt(page) < totalPages,
            hasPrevPage: parseInt(page) > 1,
            filterType: filterType,
            startDate: startDate || queryStartDate.toISOString().split('T')[0],
            endDate: endDate || new Date(queryEndDate.getTime() - 1).toISOString().split('T')[0],
            startDateDisplay: startDateDisplay,
            endDateDisplay: endDateDisplay,
            displayLabel: displayLabel,
            reportGeneratedAt: new Date().toLocaleString('en-IN'),
            errorMessage: validationError,
            showError: !!validationError
        });

    } catch (error) {
        console.error('Error in getSalesReport:', error);
        res.status(500).render('error', {
            message: 'Error loading sales report',
            error: error
        });
    }
};

/**
 * Export Sales Report to Excel
 * Downloads filtered data as .xlsx file
 */
const exportSalesReportToExcel = async (req, res) => {
    try {
        const { filterType = 'daily', startDate = null, endDate = null } = req.query;

        let queryStartDate, queryEndDate, displayLabel;

        try {
            if (filterType === 'custom') {
                if (!startDate || !endDate) {
                    return res.status(400).json({
                        error: 'Custom date range requires both start and end dates'
                    });
                }

                const validation = validateDateRange(startDate, endDate);
                if (!validation.valid) {
                    return res.status(400).json({ error: validation.error });
                }
            }

            const dateRangeResult = getDateRange(filterType, startDate, endDate);
            queryStartDate = dateRangeResult.startDate;
            queryEndDate = dateRangeResult.endDate;
            displayLabel = dateRangeResult.displayLabel;

        } catch (error) {
            return res.status(400).json({ error: error.message });
        }

        const dateFilter = {
            createdOn: {
                $gte: queryStartDate,
                $lt: queryEndDate
            }
        };

        const orders = await Order.find(dateFilter)
            .populate({
                path: 'user',
                select: 'name email phone'
            })
            .sort({ createdOn: -1 })
            .lean();

        if (orders.length === 0) {
            return res.status(400).json({
                error: 'No data available for export.'
            });
        }

        // Create Excel workbook
        const workbook = new ExcelJS.Workbook();
        const worksheet = workbook.addWorksheet('Sales Report');

        // Add title
        worksheet.mergeCells('A1:J1');
        worksheet.getCell('A1').value = 'SALES REPORT';
        worksheet.getCell('A1').font = { size: 16, bold: true };
        worksheet.getCell('A1').alignment = { horizontal: 'center' };

        // Add report type and date range
        worksheet.mergeCells('A2:J2');
        worksheet.getCell('A2').value = displayLabel;
        worksheet.getCell('A2').font = { size: 12, bold: true };
        worksheet.getCell('A2').alignment = { horizontal: 'center' };

        worksheet.mergeCells('A3:J3');
        worksheet.getCell('A3').value = `Period: ${queryStartDate.toLocaleDateString('en-IN')} to ${new Date(queryEndDate.getTime() - 1).toLocaleDateString('en-IN')}`;
        worksheet.getCell('A3').font = { size: 11, italic: true };
        worksheet.getCell('A3').alignment = { horizontal: 'center' };

        worksheet.mergeCells('A4:J4');
        worksheet.getCell('A4').value = `Generated on: ${new Date().toLocaleString('en-IN')}`;
        worksheet.getCell('A4').font = { size: 10, italic: true };
        worksheet.getCell('A4').alignment = { horizontal: 'center' };

        // Calculate summary statistics
        const totalRevenue = orders.reduce((sum, order) => sum + (order.finalAmount || 0), 0);
        const totalDiscount = orders.reduce((sum, order) => sum + (order.discount || 0), 0);
        const totalCouponsApplied = orders.filter(o => o.couponApplied).length;

        // Add summary section
        worksheet.addRow([]);
        worksheet.addRow(['SUMMARY STATISTICS']);
        worksheet.getCell('A6').font = { bold: true, size: 12 };

        worksheet.addRow(['Total Orders:', orders.length]);
        worksheet.addRow(['Total Sales Amount:', `₹${totalRevenue.toLocaleString('en-IN')}`]);
        worksheet.addRow(['Total Discount:', `₹${totalDiscount.toLocaleString('en-IN')}`]);
        worksheet.addRow(['Coupons Applied:', totalCouponsApplied]);
        worksheet.addRow(['Average Order Value:', `₹${(totalRevenue / (orders.length || 1)).toFixed(2)}`]);

        // Add order details header
        worksheet.addRow([]);
        worksheet.addRow(['ORDER DETAILS']);
        worksheet.getCell('A12').font = { bold: true, size: 12 };

        // Set column widths
        worksheet.columns = [
            { width: 12 },
            { width: 18 },
            { width: 14 },
            { width: 25 },
            { width: 10 },
            { width: 14 },
            { width: 14 },
            { width: 14 },
            { width: 14 },
            { width: 12 }
        ];

        // Add table headers
        const headers = ['Order ID', 'Customer Name', 'Phone', 'Product', 'Items', 'Total Price', 'Discount', 'Coupon', 'Final Amount', 'Status'];
        const headerRow = worksheet.addRow(headers);

        headerRow.font = { bold: true, color: { argb: 'FFFFFFFF' } };
        headerRow.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF3182CE' } };
        headerRow.alignment = { horizontal: 'center', vertical: 'middle' };

        // Add data rows
        orders.forEach(order => {
            const userData = order.user?.name || order.deliveryAddress?.name || 'Guest';
            const phone = order.user?.phone || order.deliveryAddress?.phone || 'N/A';
            const product = order.orderItems?.map(i => i.productName).join('; ') || 'N/A';
            const items = order.orderItems?.reduce((sum, item) => sum + item.quantity, 0) || 0;
            const couponCode = order.couponApplied ? order.couponCode : 'N/A';

            const row = worksheet.addRow([
                order.orderId,
                userData,
                phone,
                product,
                items,
                order.totalPrice,
                order.discount,
                couponCode,
                order.finalAmount,
                order.status
            ]);

            row.getCell(6).numFmt = '₹#,##0.00';
            row.getCell(7).numFmt = '₹#,##0.00';
            row.getCell(9).numFmt = '₹#,##0.00';

            row.getCell(5).alignment = { horizontal: 'center' };
            row.getCell(6).alignment = { horizontal: 'right' };
            row.getCell(7).alignment = { horizontal: 'right' };
            row.getCell(9).alignment = { horizontal: 'right' };
        });

        res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
        res.setHeader('Content-Disposition', `attachment; filename=sales-report-${new Date().toISOString().split('T')[0]}.xlsx`);

        await workbook.xlsx.write(res);
        res.end();

    } catch (error) {
        console.error('Error exporting to Excel:', error);
        res.status(500).json({ error: 'Error exporting report' });
    }
};

/**
 * Export Sales Report to PDF
 * Downloads filtered data as .pdf file with clear headers
 */
const exportSalesReportToPDF = async (req, res) => {
    try {
        const { filterType = 'daily', startDate = null, endDate = null } = req.query;

        let queryStartDate, queryEndDate, displayLabel;

        try {
            if (filterType === 'custom') {
                if (!startDate || !endDate) {
                    return res.status(400).json({
                        error: 'Custom date range requires both start and end dates'
                    });
                }

                const validation = validateDateRange(startDate, endDate);
                if (!validation.valid) {
                    return res.status(400).json({ error: validation.error });
                }
            }

            const dateRangeResult = getDateRange(filterType, startDate, endDate);
            queryStartDate = dateRangeResult.startDate;
            queryEndDate = dateRangeResult.endDate;
            displayLabel = dateRangeResult.displayLabel;

        } catch (error) {
            return res.status(400).json({ error: error.message });
        }

        const dateFilter = {
            createdOn: {
                $gte: queryStartDate,
                $lt: queryEndDate
            }
        };

        const orders = await Order.find(dateFilter)
            .populate({
                path: 'user',
                select: 'name email phone'
            })
            .sort({ createdOn: -1 })
            .lean();

        if (orders.length === 0) {
            return res.status(400).json({
                error: 'No data available for export.'
            });
        }

        // Calculate summary statistics
        const totalRevenue = orders.reduce((sum, order) => sum + (order.finalAmount || 0), 0);
        const totalDiscount = orders.reduce((sum, order) => sum + (order.discount || 0), 0);
        const totalCouponsApplied = orders.filter(o => o.couponApplied).length;
        const averageOrderValue = (totalRevenue / (orders.length || 1)).toFixed(2);

        // Create PDF document
        const doc = new PDFDocument({ margin: 40 });

        res.setHeader('Content-Type', 'application/pdf');
        res.setHeader('Content-Disposition', `attachment; filename=sales-report-${new Date().toISOString().split('T')[0]}.pdf`);

        doc.pipe(res);

        // PDF Header Section
        doc.fontSize(20).font('Helvetica-Bold').text('SALES REPORT', { align: 'center' });
        doc.moveDown(0.2);

        // Display label with filter type and date range
        doc.fontSize(14).font('Helvetica-Bold').text(displayLabel, { align: 'center' });
        doc.moveDown(0.1);

        // Period information
        doc.fontSize(11).font('Helvetica').text(
            `Period: ${queryStartDate.toLocaleDateString('en-IN')} to ${new Date(queryEndDate.getTime() - 1).toLocaleDateString('en-IN')}`,
            { align: 'center' }
        );
        doc.fontSize(10).font('Helvetica-Oblique').text(
            `Generated on: ${new Date().toLocaleString('en-IN')}`,
            { align: 'center' }
        );

        doc.moveDown(0.5);
        doc.moveTo(40, doc.y).lineTo(550, doc.y).stroke();
        doc.moveDown(0.5);

        // Summary Statistics Section
        doc.fontSize(12).font('Helvetica-Bold').text('SUMMARY STATISTICS', { underline: true });
        doc.moveDown(0.3);

        doc.fontSize(10).font('Helvetica');
        doc.text(`Total Orders: ${orders.length}`, 50);
        doc.text(`Total Sales Amount: ₹${totalRevenue.toLocaleString('en-IN')}`, 50);
        doc.text(`Total Discount: ₹${totalDiscount.toLocaleString('en-IN')}`, 50);
        doc.text(`Coupons Applied: ${totalCouponsApplied}`, 50);
        doc.text(`Average Order Value: ₹${averageOrderValue}`, 50);

        doc.moveDown(0.5);
        doc.moveTo(40, doc.y).lineTo(550, doc.y).stroke();
        doc.moveDown(0.5);

        // Order Details Header
        doc.fontSize(12).font('Helvetica-Bold').text('ORDER DETAILS', { underline: true });
        doc.moveDown(0.3);

        // Table column positions
        const tableTop = doc.y;
        const col1 = 50;    // Order ID
        const col2 = 130;   // Customer
        const col3 = 220;   // Product
        const col4 = 290;   // Items
        const col5 = 360;   // Amount
        const col6 = 430;   // Discount
        const col7 = 500;   // Status

        // Table headers
        doc.fontSize(9).font('Helvetica-Bold');
        doc.text('Order ID', col1, tableTop);
        doc.text('Customer', col2, tableTop);
        doc.text('Product', col3, tableTop);
        doc.text('Items', col4, tableTop);
        doc.text('Amount', col5, tableTop);
        doc.text('Discount', col6, tableTop);
        doc.text('Status', col7, tableTop);

        // Header underline
        doc.moveTo(40, tableTop + 15).lineTo(550, tableTop + 15).stroke();

        // Table data rows
        doc.fontSize(8).font('Helvetica');
        let yPosition = tableTop + 25;
        const pageHeight = doc.page.height;
        const bottomMargin = 40;

        orders.forEach((order) => {
            // Check if we need a new page
            if (yPosition > pageHeight - bottomMargin - 20) {
                doc.addPage();
                yPosition = 50;
            }

            // Get user name from user object or delivery address
            const userData = order.user?.name || order.deliveryAddress?.name || 'Guest User';
            const product = order.orderItems?.[0]?.productName || 'N/A';
            const items = order.orderItems?.reduce((sum, item) => sum + item.quantity, 0) || 0;

            doc.text(order.orderId.slice(-6), col1, yPosition, { width: 70 });
            doc.text(userData.substring(0, 15), col2, yPosition, { width: 80 });
            doc.text(product.substring(0, 20), col3, yPosition, { width: 60 });
            doc.text(items.toString(), col4, yPosition, { width: 60, align: 'center' });
            doc.text(`₹${order.finalAmount.toFixed(2)}`, col5, yPosition, { width: 60, align: 'right' });
            doc.text(`₹${order.discount.toFixed(2)}`, col6, yPosition, { width: 60, align: 'right' });
            doc.text(order.status, col7, yPosition, { width: 50 });

            yPosition += 18;
        });

        doc.end();

    } catch (error) {
        console.error('Error exporting to PDF:', error);
        res.status(500).json({ error: 'Error exporting report' });
    }
};

module.exports = {
    getSalesReport,
    exportSalesReportToExcel,
    exportSalesReportToPDF
};