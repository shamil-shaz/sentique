const mongoose = require('mongoose');
const Order = require('../../models/orderSchema');
const User = require('../../models/userSchema');
const Product = require('../../models/productSchema');
const Category = require('../../models/categorySchema');
const Brand = require('../../models/brandSchema');

const loadDashboard = async (req, res) => {
  if (!req.session.admin) {
    return res.redirect('/admin/login');
  }
  try {
    const dateFilter = req.query.filter || 'monthly';
    const customStartDate = req.query.startDate ? new Date(req.query.startDate) : null;
    const customEndDate = req.query.endDate ? new Date(req.query.endDate) : null;
    const today = new Date();
    today.setHours(23, 59, 59, 999);
    let error = null;
    if (dateFilter === 'custom') {
      if (customStartDate > today || customEndDate > today) {
        error = 'Invalid date range. Please select past or current dates only.';
      } else if (customStartDate > customEndDate) {
        error = 'Invalid date range. Start date cannot be after end date.';
      }
    }
    let startDate, endDate;
    switch (dateFilter) {
      case 'daily':
        startDate = new Date(today.getFullYear(), today.getMonth(), today.getDate());
        endDate = new Date(today.getFullYear(), today.getMonth(), today.getDate() + 1);
        break;
      case 'yearly':
        startDate = new Date(today.getFullYear(), 0, 1);
        endDate = new Date(today.getFullYear() + 1, 0, 1);
        break;
      case 'custom':
        startDate = customStartDate || new Date(today.getFullYear(), today.getMonth(), 1);
        endDate = customEndDate || today;
        endDate.setHours(23, 59, 59, 999);
        break;
      default:
        startDate = new Date(today.getFullYear(), today.getMonth(), 1);
        endDate = new Date(today.getFullYear(), today.getMonth() + 1, 0, 23, 59, 59, 999);
    }
    if (error) {
      return res.render('dashboard', {
        error,
        totalUsers: 0,
        totalOrders: 0,
        totalSales: '0',
        pendingOrders: 0,
        deliveredOrders: 0,
        cancelledOrders: 0,
        returnRequests: 0,
        ordersGrowth: 0,
        salesGrowth: 0,
        chartLabels: [],
        chartData: [],
        conversionRate: 0,
        averageOrderValue: 0,
        dateFilter,
        startDateFormatted: customStartDate ? customStartDate.toISOString().split('T')[0] : '',
        endDateFormatted: customEndDate ? customEndDate.toISOString().split('T')[0] : '',
        recentOrders: [],
        topProducts: [],
        topBrands: [],
        topCategories: [],
        paymentMethods: []
      });
    }
    const totalUsers = await User.countDocuments();
    const validStatuses = ['Placed', 'Confirmed', 'Processing', 'Shipped', 'Delivered', 'Return Request'];
    const totalOrders = await Order.countDocuments({
      createdOn: { $gte: startDate, $lte: endDate },
      status: { $in: validStatuses }
    });
    const totalSalesAgg = await Order.aggregate([
      {
        $match: {
          createdOn: { $gte: startDate, $lte: endDate },
          status: { $in: validStatuses }
        }
      },
      { $group: { _id: null, total: { $sum: '$finalAmount' } } }
    ]);
    const totalSales = totalSalesAgg[0]?.total || 0;
    const pendingOrders = await Order.countDocuments({
      status: { $in: ['Placed', 'Confirmed', 'Processing', 'Shipped'] },
      createdOn: { $gte: startDate, $lte: endDate }
    });
    const deliveredOrders = await Order.countDocuments({
      status: 'Delivered',
      createdOn: { $gte: startDate, $lte: endDate }
    });
    const cancelledOrders = await Order.countDocuments({
      status: 'Cancelled',
      createdOn: { $gte: startDate, $lte: endDate }
    });
    const returnRequests = await Order.countDocuments({
      status: 'Return Request',
      createdOn: { $gte: startDate, $lte: endDate }
    });
    let chartDateFormat;
    switch (dateFilter) {
      case 'daily': chartDateFormat = '%H:00'; break;
      case 'yearly': chartDateFormat = '%Y-%m'; break;
      default: chartDateFormat = '%Y-%m-%d';
    }
    const chartAgg = await Order.aggregate([
      {
        $match: {
          createdOn: { $gte: startDate, $lte: endDate },
          status: { $in: validStatuses }
        }
      },
      {
        $group: {
          _id: { $dateToString: { format: chartDateFormat, date: '$createdOn' } },
          sales: { $sum: '$finalAmount' }
        }
      },
      { $sort: { _id: 1 } }
    ]);
    const chartLabels = chartAgg.map(d => d._id);
    const chartData = chartAgg.map(d => d.sales);
    const prevStart = new Date(startDate);
    const periodDays = Math.ceil((endDate - startDate) / (1000 * 60 * 60 * 24));
    prevStart.setDate(prevStart.getDate() - periodDays);
    const prevEnd = new Date(startDate);
    const prevSalesAgg = await Order.aggregate([
      { $match: { createdOn: { $gte: prevStart, $lte: prevEnd }, status: { $in: validStatuses } } },
      { $group: { _id: null, total: { $sum: '$finalAmount' } } }
    ]);
    const prevSales = prevSalesAgg[0]?.total || 0;
    const prevOrders = await Order.countDocuments({
      createdOn: { $gte: prevStart, $lte: prevEnd },
      status: { $in: validStatuses }
    });
    const salesGrowth = prevSales > 0 ? (((totalSales - prevSales) / prevSales) * 100).toFixed(1) : 0;
    const ordersGrowth = prevOrders > 0 ? (((totalOrders - prevOrders) / prevOrders) * 100).toFixed(1) : 0;
    const recentOrders = await Order.find({
      createdOn: { $gte: startDate, $lte: endDate }
    })
      .sort({ createdOn: -1 })
      .limit(5)
      .populate('user', 'name')
      .lean();
    const formattedRecentOrders = recentOrders.map(o => ({
      orderId: o.orderId || o._id,
      customer: o.user?.name || 'Guest',
      amount: `₹${(o.finalAmount || 0).toFixed(2)}`,
      status: o.status,
      itemsCount: o.orderItems?.length || 0,
      date: new Date(o.createdOn).toLocaleDateString('en-IN')
    }));
    const topProducts = await Order.aggregate([
      { $match: { createdOn: { $gte: startDate, $lte: endDate }, status: { $in: validStatuses } } },
      { $unwind: '$orderItems' },
      {
        $group: {
          _id: '$orderItems.productName',
          sold: { $sum: '$orderItems.quantity' },
          revenue: { $sum: '$orderItems.total' }
        }
      },
      { $sort: { sold: -1 } },
      { $limit: 5 }
    ]);
    const topBrands = await Order.aggregate([
      { $match: { createdOn: { $gte: startDate, $lte: endDate }, status: { $in: validStatuses } } },
      { $unwind: '$orderItems' },
      {
        $lookup: {
          from: 'products',
          localField: 'orderItems.product',
          foreignField: '_id',
          as: 'productDetails'
        }
      },
      { $unwind: '$productDetails' },
      {
        $lookup: {
          from: 'brands',
          localField: 'productDetails.brand',
          foreignField: '_id',
          as: 'brandDetails'
        }
      },
      {
        $group: {
          _id: { $arrayElemAt: ['$brandDetails.brandName', 0] },
          count: { $sum: 1 },
          revenue: { $sum: '$orderItems.total' }
        }
      },
      { $sort: { count: -1 } },
      { $limit: 5 }
    ]);
    const topCategories = await Order.aggregate([
      { $match: { createdOn: { $gte: startDate, $lte: endDate }, status: { $in: validStatuses } } },
      { $unwind: '$orderItems' },
      {
        $lookup: {
          from: 'products',
          localField: 'orderItems.product',
          foreignField: '_id',
          as: 'productDetails'
        }
      },
      { $unwind: '$productDetails' },
      {
        $lookup: {
          from: 'categories',
          localField: 'productDetails.category',
          foreignField: '_id',
          as: 'categoryDetails'
        }
      },
      {
        $group: {
          _id: { $arrayElemAt: ['$categoryDetails.name', 0] },
          count: { $sum: 1 },
          revenue: { $sum: '$orderItems.total' }
        }
      },
      { $sort: { count: -1 } },
      { $limit: 5 }
    ]);
    const paymentMethods = await Order.aggregate([
      {
        $match: { createdOn: { $gte: startDate, $lte: endDate }, status: { $in: validStatuses } }
      },
      {
        $group: {
          _id: '$paymentMethod',
          count: { $sum: 1 },
          total: { $sum: '$finalAmount' }
        }
      },
      { $sort: { total: -1 } }
    ]);
    const conversionRate = totalUsers > 0 ? ((totalOrders / totalUsers) * 100).toFixed(2) : 0;
    const averageOrderValue = totalOrders > 0 ? (totalSales / totalOrders).toFixed(2) : 0;
    res.render('dashboard', {
      error: null,
      totalUsers,
      totalOrders,
      totalSales: totalSales.toFixed(2),
      pendingOrders,
      deliveredOrders,
      cancelledOrders,
      returnRequests,
      ordersGrowth,
      salesGrowth,
      chartLabels,
      chartData,
      conversionRate,
      averageOrderValue,
      dateFilter,
      startDateFormatted: startDate.toISOString().split('T')[0],
      endDateFormatted: endDate.toISOString().split('T')[0],
      recentOrders: formattedRecentOrders,
      topProducts: topProducts.map(p => ({
        name: p._id || 'Unnamed',
        sold: p.sold,
        revenue: `₹${(p.revenue || 0).toFixed(2)}`
      })),
      topBrands: topBrands.map(b => ({
        name: b._id || 'Unbranded',
        count: b.count,
        revenue: `₹${(b.revenue || 0).toFixed(2)}`
      })),
      topCategories: topCategories.map(c => ({
        name: c._id || 'Uncategorized',
        count: c.count,
        revenue: `₹${(c.revenue || 0).toFixed(2)}`
      })),
      paymentMethods: paymentMethods.map(p => ({
        method: p._id || 'Not Specified',
        count: p.count,
        total: `₹${(p.total || 0).toFixed(2)}`
      }))
    });
  } catch (err) {
    console.error('Dashboard Error:', err);
    res.redirect('/pageerror');
  }
};

const getDashboardChartData = async (req, res) => {
  try {
    const { period } = req.query;
    const today = new Date();
    today.setHours(23, 59, 59, 999);
    let startDate, endDate, format;
    switch (period) {
      case 'daily':
        startDate = new Date(today.getFullYear(), today.getMonth(), today.getDate());
        endDate = new Date(today.getFullYear(), today.getMonth(), today.getDate() + 1);
        format = '%H:00';
        break;
      case 'weekly':
        const day = today.getDay();
        startDate = new Date(today);
        startDate.setDate(today.getDate() - day);
        startDate.setHours(0, 0, 0, 0);
        endDate = new Date(today);
        endDate.setHours(23, 59, 59, 999);
        format = '%Y-%m-%d';
        break;
      case 'yearly':
        startDate = new Date(today.getFullYear(), 0, 1);
        endDate = new Date(today.getFullYear() + 1, 0, 1);
        format = '%Y-%m';
        break;
      default:
        startDate = new Date(today.getFullYear(), today.getMonth(), 1);
        endDate = new Date(today.getFullYear(), today.getMonth() + 1, 0, 23, 59, 59, 999);
        format = '%Y-%m-%d';
    }
    const validStatuses = ['Placed', 'Confirmed', 'Processing', 'Shipped', 'Delivered', 'Return Request'];
    const chartData = await Order.aggregate([
      {
        $match: {
          createdOn: { $gte: startDate, $lte: endDate },
          status: { $in: validStatuses }
        }
      },
      {
        $group: {
          _id: { $dateToString: { format, date: '$createdOn' } },
          totalSales: { $sum: '$finalAmount' },
          totalOrders: { $sum: 1 }
        }
      },
      { $sort: { _id: 1 } }
    ]);
    const labels = chartData.map(d => d._id);
    const sales = chartData.map(d => d.totalSales);
    const orders = chartData.map(d => d.totalOrders);
    res.json({ success: true, labels, sales, orders });
  } catch (err) {
    console.error('Chart Data Error:', err);
    res.json({ success: false, message: 'Failed to load chart data' });
  }
};

module.exports = { loadDashboard, getDashboardChartData };
