const mongoose = require("mongoose");
const Order = require("../../models/orderSchema");
const User = require("../../models/userSchema");
const Product = require("../../models/productSchema");
const Category = require("../../models/categorySchema");
const Brand = require("../../models/brandSchema");

const loadDashboard = async (req, res) => {
  if (!req.session.admin) {
    return res.redirect("/admin/login");
  }

  try {
    const dateFilter = req.query.filter || "monthly";
    const customStartDate = req.query.startDate
      ? new Date(req.query.startDate)
      : null;
    const customEndDate = req.query.endDate
      ? new Date(req.query.endDate)
      : null;

    const today = new Date();
    const endDate = new Date(today);
    endDate.setHours(23, 59, 59, 999);

    let startDate;

    switch (dateFilter) {
      case "daily":
        startDate = new Date(today);
        startDate.setHours(0, 0, 0, 0);
        break;
      case "weekly":
        startDate = new Date(today);
        startDate.setDate(today.getDate() - 7);
        startDate.setHours(0, 0, 0, 0);
        break;
      case "yearly":
        startDate = new Date(today);
        startDate.setFullYear(today.getFullYear() - 1);
        startDate.setHours(0, 0, 0, 0);
        break;
      case "custom":
        if (customStartDate && customEndDate) {
          startDate = customStartDate;
          endDate.setTime(customEndDate.getTime());
          endDate.setHours(23, 59, 59, 999);
        } else {
          startDate = new Date(today.getFullYear(), today.getMonth(), 1);
        }
        break;
      default:
        startDate = new Date(today);
        startDate.setDate(today.getDate() - 30);
        startDate.setHours(0, 0, 0, 0);
        break;
    }

    const itemStats = await Order.aggregate([
      { $match: { createdOn: { $gte: startDate, $lte: endDate } } },
      {
        $group: {
          _id: null,
          totalOrdersCount: { $sum: 1 },

          deliveredItems: {
            $sum: {
              $reduce: {
                input: "$orderItems",
                initialValue: 0,
                in: {
                  $add: [
                    "$$value",
                    {
                      $cond: [
                        { $eq: ["$$this.status", "Delivered"] },
                        "$$this.quantity",
                        0,
                      ],
                    },
                  ],
                },
              },
            },
          },

          activeItems: {
            $sum: {
              $reduce: {
                input: "$orderItems",
                initialValue: 0,
                in: {
                  $add: [
                    "$$value",
                    {
                      $cond: [
                        {
                          $in: [
                            "$$this.status",
                            [
                              "Placed",
                              "Confirmed",
                              "Processing",
                              "Shipped",
                              "OutForDelivery",
                            ],
                          ],
                        },
                        "$$this.quantity",
                        0,
                      ],
                    },
                  ],
                },
              },
            },
          },
          returnedItems: {
            $sum: {
              $reduce: {
                input: "$orderItems",
                initialValue: 0,
                in: {
                  $add: [
                    "$$value",
                    {
                      $cond: [
                        { $eq: ["$$this.status", "Returned"] },
                        "$$this.quantity",
                        0,
                      ],
                    },
                  ],
                },
              },
            },
          },
          cancelledItems: {
            $sum: {
              $reduce: {
                input: "$orderItems",
                initialValue: 0,
                in: {
                  $add: [
                    "$$value",
                    {
                      $cond: [
                        { $eq: ["$$this.status", "Cancelled"] },
                        "$$this.quantity",
                        0,
                      ],
                    },
                  ],
                },
              },
            },
          },
          returnRequests: {
            $sum: {
              $reduce: {
                input: "$orderItems",
                initialValue: 0,
                in: {
                  $add: [
                    "$$value",
                    {
                      $cond: [
                        { $eq: ["$$this.status", "Return Request"] },
                        "$$this.quantity",
                        0,
                      ],
                    },
                  ],
                },
              },
            },
          },
        },
      },
    ]);

    const stats = itemStats[0] || {
      totalOrdersCount: 0,
      deliveredItems: 0,
      activeItems: 0,
      returnedItems: 0,
      cancelledItems: 0,
      returnRequests: 0,
    };
    const totalRevenueAgg = await Order.aggregate([
      {
        $match: {
          createdOn: { $gte: startDate, $lte: endDate },

          status: { $nin: ["Cancelled", "Returned", "Payment Failed"] },
        },
      },
      { $group: { _id: null, totalRevenue: { $sum: "$finalAmount" } } },
    ]);
    const totalSales = totalRevenueAgg[0]?.totalRevenue || 0;
    const timeDiff = endDate.getTime() - startDate.getTime();
    const prevStartDate = new Date(startDate.getTime() - timeDiff);
    const prevEndDate = new Date(endDate.getTime() - timeDiff);

    const prevRevenueAgg = await Order.aggregate([
      {
        $match: {
          createdOn: { $gte: prevStartDate, $lte: prevEndDate },
          status: { $nin: ["Cancelled", "Returned", "Payment Failed"] },
        },
      },
      { $group: { _id: null, totalRevenue: { $sum: "$finalAmount" } } },
    ]);
    const prevSales = prevRevenueAgg[0]?.totalRevenue || 0;

    const totalOrders = await Order.countDocuments({
      createdOn: { $gte: startDate, $lte: endDate },
    });
    const prevOrders = await Order.countDocuments({
      createdOn: { $gte: prevStartDate, $lte: prevEndDate },
    });

    let salesGrowth = 0;
    if (prevSales > 0) {
      salesGrowth = ((totalSales - prevSales) / prevSales) * 100;
    } else if (totalSales > 0) {
      salesGrowth = 100;
    }

    let ordersGrowth = 0;
    if (prevOrders > 0) {
      ordersGrowth = ((totalOrders - prevOrders) / prevOrders) * 100;
    } else if (totalOrders > 0) {
      ordersGrowth = 100;
    }

    let chartDateFormat;
    switch (dateFilter) {
      case "daily":
        chartDateFormat = "%H:00";
        break;
      case "yearly":
        chartDateFormat = "%Y-%m";
        break;
      default:
        chartDateFormat = "%Y-%m-%d";
    }

    const chartAgg = await Order.aggregate([
      {
        $match: {
          createdOn: { $gte: startDate, $lte: endDate },
          status: { $nin: ["Cancelled", "Returned", "Payment Failed"] },
        },
      },
      {
        $group: {
          _id: {
            $dateToString: { format: chartDateFormat, date: "$createdOn" },
          },
          sales: { $sum: "$finalAmount" },
        },
      },
      { $sort: { _id: 1 } },
    ]);
    const chartLabels = chartAgg.map((d) => d._id);
    const chartData = chartAgg.map((d) => d.sales);

    const totalUsers = await User.countDocuments();

    const recentOrders = await Order.find({
      createdOn: { $gte: startDate, $lte: endDate },
    })
      .sort({ createdOn: -1 })
      .limit(5)
      .populate("user", "name")
      .lean();

    const formattedRecentOrders = recentOrders.map((o) => ({
      orderId: o.orderId || o._id,
      customer: o.user?.name || "Guest",
      amount: `₹${(o.finalAmount || 0).toFixed(2)}`,
      status: o.status,
      itemsCount: o.orderItems?.length || 0,
      date: new Date(o.createdOn).toLocaleDateString("en-IN"),
    }));

    const topProducts = await Order.aggregate([
      { $match: { createdOn: { $gte: startDate, $lte: endDate } } },
      { $unwind: "$orderItems" },

      {
        $match: {
          "orderItems.status": {
            $nin: ["Cancelled", "Returned", "Payment Failed"],
          },
        },
      },
      {
        $group: {
          _id: "$orderItems.productName",
          sold: { $sum: "$orderItems.quantity" },
          revenue: { $sum: "$orderItems.total" },
        },
      },
      { $sort: { sold: -1 } },
      { $limit: 5 },
    ]);

    const topCategories = await Order.aggregate([
      { $match: { createdOn: { $gte: startDate, $lte: endDate } } },
      { $unwind: "$orderItems" },
      {
        $match: {
          "orderItems.status": {
            $nin: ["Cancelled", "Returned", "Payment Failed"],
          },
        },
      },
      {
        $lookup: {
          from: "products",
          localField: "orderItems.product",
          foreignField: "_id",
          as: "productDetails",
        },
      },
      { $unwind: "$productDetails" },
      {
        $lookup: {
          from: "categories",
          localField: "productDetails.category",
          foreignField: "_id",
          as: "categoryDetails",
        },
      },
      {
        $group: {
          _id: { $arrayElemAt: ["$categoryDetails.name", 0] },
          count: { $sum: "$orderItems.quantity" },
          revenue: { $sum: "$orderItems.total" },
        },
      },
      { $sort: { count: -1 } },
      { $limit: 5 },
    ]);

    const topBrands = await Order.aggregate([
      { $match: { createdOn: { $gte: startDate, $lte: endDate } } },
      { $unwind: "$orderItems" },
      {
        $match: {
          "orderItems.status": {
            $nin: ["Cancelled", "Returned", "Payment Failed"],
          },
        },
      },
      {
        $lookup: {
          from: "products",
          localField: "orderItems.product",
          foreignField: "_id",
          as: "productDetails",
        },
      },
      { $unwind: "$productDetails" },
      {
        $lookup: {
          from: "brands",
          localField: "productDetails.brand",
          foreignField: "_id",
          as: "brandDetails",
        },
      },
      {
        $group: {
          _id: { $arrayElemAt: ["$brandDetails.brandName", 0] },
          count: { $sum: "$orderItems.quantity" },
          revenue: { $sum: "$orderItems.total" },
        },
      },
      { $sort: { count: -1 } },
      { $limit: 5 },
    ]);

    const paymentMethods = await Order.aggregate([
      { $match: { createdOn: { $gte: startDate, $lte: endDate } } },
      {
        $group: {
          _id: "$paymentMethod",
          count: { $sum: 1 },
          total: { $sum: "$finalAmount" },
        },
      },
      { $sort: { total: -1 } },
    ]);

    const conversionRate =
      totalUsers > 0 ? ((totalOrders / totalUsers) * 100).toFixed(2) : 0;
    const averageOrderValue =
      totalOrders > 0 ? (totalSales / totalOrders).toFixed(2) : 0;

    res.render("dashboard", {
      totalUsers,
      totalOrders: stats.totalOrdersCount,
      pendingOrders: stats.activeItems,
      deliveredOrders: stats.deliveredItems,
      returnedOrders: stats.returnedItems,
      cancelledOrders: stats.cancelledItems,
      returnRequests: stats.returnRequests,

      totalSales: totalSales.toFixed(2),
      ordersGrowth: ordersGrowth.toFixed(1),
      salesGrowth: salesGrowth.toFixed(1),

      chartLabels,
      chartData,
      conversionRate,
      averageOrderValue,
      dateFilter,
      startDateFormatted: startDate.toISOString().split("T")[0],
      endDateFormatted: endDate.toISOString().split("T")[0],

      recentOrders: formattedRecentOrders,

      topProducts: topProducts.map((p) => ({
        name: p._id || "Unnamed",
        sold: p.sold,
        revenue: `₹${(p.revenue || 0).toFixed(2)}`,
      })),

      topBrands: topBrands.map((b) => ({
        name: b._id || "Unbranded",
        count: b.count,
        revenue: `₹${(b.revenue || 0).toFixed(2)}`,
      })),

      topCategories: topCategories.map((c) => ({
        name: c._id || "Uncategorized",
        count: c.count,
        revenue: `₹${(c.revenue || 0).toFixed(2)}`,
      })),

      paymentMethods: paymentMethods.map((p) => ({
        method: p._id || "Not Specified",
        count: p.count,
        total: `₹${(p.total || 0).toFixed(2)}`,
      })),
    });
  } catch (err) {
    console.error("Dashboard Error:", err);
    res.redirect("/pageerror");
  }
};

const getDashboardChartData = async (req, res) => {
  try {
    const { period } = req.query;
    const today = new Date();
    const endDate = new Date(today);
    endDate.setHours(23, 59, 59, 999);

    let startDate;
    let format = "%Y-%m-%d";

    switch (period) {
      case "daily":
        startDate = new Date(today);
        startDate.setHours(0, 0, 0, 0);
        format = "%H:00";
        break;
      case "weekly":
        startDate = new Date(today);
        startDate.setDate(today.getDate() - 7);
        startDate.setHours(0, 0, 0, 0);
        break;
      case "yearly":
        startDate = new Date(today);
        startDate.setFullYear(today.getFullYear() - 1);
        startDate.setHours(0, 0, 0, 0);
        format = "%Y-%m";
        break;
      default:
        startDate = new Date(today);
        startDate.setDate(today.getDate() - 30);
        startDate.setHours(0, 0, 0, 0);
        break;
    }

    const chartData = await Order.aggregate([
      {
        $match: {
          createdOn: { $gte: startDate, $lte: endDate },
          status: { $nin: ["Cancelled", "Returned", "Payment Failed"] },
        },
      },
      {
        $group: {
          _id: { $dateToString: { format, date: "$createdOn" } },
          totalSales: { $sum: "$finalAmount" },
          totalOrders: { $sum: 1 },
        },
      },
      { $sort: { _id: 1 } },
    ]);

    res.json({
      success: true,
      labels: chartData.map((d) => d._id),
      sales: chartData.map((d) => d.totalSales),
      orders: chartData.map((d) => d.totalOrders),
    });
  } catch (err) {
    console.error("Chart Data Error:", err);
    res.json({ success: false, message: "Failed to load chart data" });
  }
};

module.exports = {
  loadDashboard,
  getDashboardChartData,
};
