const mongoose = require('mongoose');
const Order = require('../../models/orderSchema');
const User = require('../../models/userSchema');
const Product = require('../../models/productSchema');
const Category = require('../../models/categorySchema');
const Brand = require('../../models/brandSchema');
const Wallet = require('../../models/walletSchema');

const loadDashboard = async (req, res) => {
  if (req.session.admin) {
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
          currentMonth: new Date().toLocaleString('default', { month: 'long', year: 'numeric' }),
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

      let startDate, endDate;

      switch(dateFilter) {
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
          endDate = customEndDate || new Date(today.getFullYear(), today.getMonth() + 1, 0);
          break;
        default: 
          startDate = new Date(today.getFullYear(), today.getMonth(), 1);
          endDate = new Date(today.getFullYear(), today.getMonth() + 1, 0);
      }

 
      const totalUsers = await User.countDocuments();

     
      const totalOrders = await Order.countDocuments({
        createdOn: { $gte: startDate, $lte: endDate }
      });

      
      const salesAggregation = await Order.aggregate([
        {
          $match: {
            createdOn: { $gte: startDate, $lte: endDate }
          }
        },
        {
          $group: {
            _id: null,
            totalSales: { $sum: '$finalAmount' }
          }
        }
      ]);
      const totalSales = salesAggregation[0]?.totalSales || 0;

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

      
      let monthSalesData = [];
      let chartDateFormat = '';
      
      if (dateFilter === 'daily') {
       
        chartDateFormat = '%H:00';
        monthSalesData = await Order.aggregate([
          {
            $match: {
              createdOn: { $gte: startDate, $lte: endDate }
            }
          },
          {
            $group: {
              _id: { $dateToString: { format: '%H', date: '$createdOn' } },
              sales: { $sum: '$finalAmount' },
              orders: { $sum: 1 }
            }
          },
          { $sort: { _id: 1 } }
        ]);
      } else if (dateFilter === 'yearly') {
        
        chartDateFormat = '%Y-%m';
        monthSalesData = await Order.aggregate([
          {
            $match: {
              createdOn: { $gte: startDate, $lte: endDate }
            }
          },
          {
            $group: {
              _id: { $dateToString: { format: '%Y-%m', date: '$createdOn' } },
              sales: { $sum: '$finalAmount' },
              orders: { $sum: 1 }
            }
          },
          { $sort: { _id: 1 } }
        ]);
      } else {

        chartDateFormat = '%Y-%m-%d';
        monthSalesData = await Order.aggregate([
          {
            $match: {
              createdOn: { $gte: startDate, $lte: endDate }
            }
          },
          {
            $group: {
              _id: { $dateToString: { format: '%Y-%m-%d', date: '$createdOn' } },
              sales: { $sum: '$finalAmount' },
              orders: { $sum: 1 }
            }
          },
          { $sort: { _id: 1 } }
        ]);
      }

      const chartLabels = monthSalesData.map(d => d._id);
      const chartData = monthSalesData.map(d => d.sales);


      const periodLength = Math.ceil((endDate - startDate) / (1000 * 60 * 60 * 24));
      const previousStartDate = new Date(startDate.getTime() - periodLength * 24 * 60 * 60 * 1000);
      const previousEndDate = new Date(startDate.getTime());

      const previousPeriodSales = await Order.aggregate([
        {
          $match: {
            createdOn: { $gte: previousStartDate, $lte: previousEndDate }
          }
        },
        {
          $group: {
            _id: null,
            total: { $sum: '$finalAmount' }
          }
        }
      ]);
      const previousSalesTotal = previousPeriodSales[0]?.total || 0;
      const salesGrowth = previousSalesTotal > 0
        ? (((totalSales - previousSalesTotal) / previousSalesTotal) * 100).toFixed(1)
        : 0;

    
      const previousPeriodOrders = await Order.countDocuments({
        createdOn: { $gte: previousStartDate, $lte: previousEndDate }
      });
      const ordersGrowth = previousPeriodOrders > 0
        ? (((totalOrders - previousPeriodOrders) / previousPeriodOrders) * 100).toFixed(1)
        : 0;

    
      const recentOrders = await Order.find({
        createdOn: { $gte: startDate, $lte: endDate }
      })
        .sort({ createdOn: -1 })
        .limit(5)
        .populate({
          path: 'user',
          select: 'name email phone',
          model: 'User'
        })
        .lean();

      const formattedRecentOrders = recentOrders.map(order => ({
        orderId: order.orderId,
        customer: order.user?.name || 'N/A',
        amount: `₹${order.finalAmount?.toFixed(2) || '0'}`,
        status: order.status,
        date: new Date(order.createdOn).toLocaleDateString('en-IN'),
        itemsCount: order.orderItems?.length || 0
      }));

    
      const topProducts = await Order.aggregate([
        {
          $match: {
            createdOn: { $gte: startDate, $lte: endDate }
          }
        },
        { $unwind: '$orderItems' },
        {
          $group: {
            _id: '$orderItems.product',
            totalSold: { $sum: '$orderItems.quantity' },
            totalRevenue: { $sum: '$orderItems.total' },
            productName: { $first: '$orderItems.productName' }
          }
        },
        { $sort: { totalSold: -1 } },
        { $limit: 5 }
      ]);
    
      const topBrandsByOrders = await Order.aggregate([
        {
          $match: {
            createdOn: { $gte: startDate, $lte: endDate }
          }
        },
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
            _id: '$productDetails.brand',
            brandName: { $first: { $arrayElemAt: ['$brandDetails.brandName', 0] } },
            count: { $sum: 1 },
            totalRevenue: { $sum: '$orderItems.total' }
          }
        },
        { $sort: { count: -1 } },
        { $limit: 5 }
      ]);

      const topBrands = topBrandsByOrders.map(item => ({
        name: item.brandName || 'Unbranded',
        count: item.count,
        revenue: `₹${(item.totalRevenue || 0).toFixed(2)}`
      }));

      const topCategoriesByOrders = await Order.aggregate([
        {
          $match: {
            createdOn: { $gte: startDate, $lte: endDate }
          }
        },
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
            _id: '$productDetails.category',
            categoryName: { $first: { $arrayElemAt: ['$categoryDetails.name', 0] } },
            count: { $sum: 1 },
            totalRevenue: { $sum: '$orderItems.total' }
          }
        },
        { $sort: { count: -1 } },
        { $limit: 5 }
      ]);

      const topCategories = topCategoriesByOrders.map(item => ({
        name: item.categoryName || 'Uncategorized',
        count: item.count,
        revenue: `₹${(item.totalRevenue || 0).toFixed(2)}`
      }));

     
      const paymentMethods = await Order.aggregate([
        {
          $match: {
            createdOn: { $gte: startDate, $lte: endDate }
          }
        },
        {
          $group: {
            _id: '$paymentMethod',
            count: { $sum: 1 },
            total: { $sum: '$finalAmount' }
          }
        },
        { $sort: { count: -1 } }
      ]);

      
      const conversionRate = totalUsers > 0
        ? ((totalOrders / totalUsers) * 100).toFixed(2)
        : 0;

      const averageOrderValue = totalOrders > 0
        ? (totalSales / totalOrders).toFixed(2)
        : 0;

      console.log(' Dashboard data prepared:', {
        dateFilter,
        startDate,
        endDate,
        totalUsers,
        totalOrders,
        totalSales: totalSales.toFixed(2),
        topBrands: topBrands.length,
        topCategories: topCategories.length,
        topCategoriesData: topCategories.map(c => ({ name: c.name, count: c.count }))
      });

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
        currentMonth: startDate.toLocaleString('default', { month: 'long', year: 'numeric' }),
        conversionRate,
        averageOrderValue,
        dateFilter,
        startDateFormatted: startDate.toISOString().split('T')[0],
        endDateFormatted: endDate.toISOString().split('T')[0],
        recentOrders: formattedRecentOrders,
        topProducts: topProducts.map(p => ({
          name: p.productName,
          sold: p.totalSold,
          revenue: `₹${p.totalRevenue?.toFixed(2) || '0'}`
        })),
        topBrands,
        topCategories,
        paymentMethods: paymentMethods.map(p => ({
          method: p._id || 'Not Specified',
          count: p.count,
          total: `₹${p.total?.toFixed(2) || '0'}`
        }))
      });

    } catch (error) {
      console.error('Dashboard error:', error);
      res.redirect('/pageerror');
    }
  } else {
    res.redirect('/admin/login');
  }
};

module.exports = {
  loadDashboard,
};