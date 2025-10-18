
const mongoose = require('mongoose');
const User = require("../../models/userSchema");

const customerInfo = async (req, res) => {
  try {
    let search = req.query.search || "";
    let page = parseInt(req.query.page) || 1;
    let filterStatus = req.query.filter || "all";
    const limit = 6;

    const filter = { isAdmin: false };
    if (search) {
      filter.$or = [
        { name: { $regex: ".*" + search + ".*", $options: "i" } },
        { email: { $regex: ".*" + search + ".*", $options: "i" } },
      ];
    }
    if (filterStatus === "active") {
      filter.isBlocked = false;
    } else if (filterStatus === "blocked") {
      filter.isBlocked = true;
    }

    const userData = await User.find(filter)
      .sort({ createdOn: -1 })
      .limit(limit)
      .skip((page - 1) * limit)
      .exec();

    const count = await User.countDocuments(filter);
    const totalUsers = await User.countDocuments({ isAdmin: false });
    const activeUsersCount = await User.countDocuments({ isAdmin: false, isBlocked: false });
    const blockedUsersCount = await User.countDocuments({ isAdmin: false, isBlocked: true });

    console.log('Rendering customers:', { totalUsers, activeUsersCount, blockedUsersCount }); 
    res.render("customers", {
      users: userData,
      totalPages: Math.ceil(count / limit),
      currentPage: page,
      search,
      filterStatus,
      totalUsers,
      activeUsersCount,
      blockedUsersCount,
      successMessage: req.flash("success"),
      errorMessage: req.flash("error"),
    });
  } catch (error) {
    console.error("Error in customerInfo:", error);
    req.flash("error", "Something went wrong while loading customers!");
    res.redirect("/admin/pageerror");
  }
};

const customerBlocked = async (req, res) => {
  try {
    console.log('Block request:', req.body); 
    const id = req.body.id;
    if (!id) {
      console.log('No ID provided');
      req.flash("error", "User ID is required!");
      return res.redirect("/admin/customers");
    }

    if (!mongoose.isValidObjectId(id)) {
      console.log('Invalid ObjectId:', id);
      req.flash("error", "Invalid user ID!");
      return res.redirect("/admin/customers");
    }

    const user = await User.findById(id);
    console.log('User found:', user); 
    if (!user) {
      req.flash("error", "User not found!");
      return res.redirect("/admin/customers");
    }

    if (user.isAdmin) {
      req.flash("error", "Cannot block an admin account!");
      return res.redirect("/admin/customers");
    }

    const result = await User.updateOne({ _id: id }, { $set: { isBlocked: true } });
    console.log('Block update result:', result); 
    if (result.modifiedCount === 0) {
      req.flash("error", "Failed to block user: No changes made!");
      return res.redirect("/admin/customers");
    }

    req.flash("success", "User blocked successfully!");
    res.redirect("/admin/customers");
  } catch (error) {
    console.error("Error blocking user:", error);
    req.flash("error", "Failed to block user. Please try again.");
    res.redirect("/admin/pageerror");
  }
};

const customerUnBlocked = async (req, res) => {
  try {
    console.log('Unblock request:', req.body); 
    const id = req.body.id;
    if (!id) {
      console.log('No ID provided');
      req.flash("error", "User ID is required!");
      return res.redirect("/admin/customers");
    }

    if (!mongoose.isValidObjectId(id)) {
      console.log('Invalid ObjectId:', id);
      req.flash("error", "Invalid user ID!");
      return res.redirect("/admin/customers");
    }

    const user = await User.findById(id);
    console.log('User found:', user); 
    if (!user) {
      req.flash("error", "User not found!");
      return res.redirect("/admin/customers");
    }

    const result = await User.updateOne({ _id: id }, { $set: { isBlocked: false } });
    console.log('Unblock update result:', result); 
    if (result.modifiedCount === 0) {
      req.flash("error", "Failed to unblock user: No changes made!");
      return res.redirect("/admin/customers");
    }

    req.flash("success", "User unblocked successfully!");
    res.redirect("/admin/customers");
  } catch (error) {
    console.error("Error unblocking user:", error);
    req.flash("error", "Failed to unblock user. Please try again.");
    res.redirect("/admin/pageerror");
  }
};

module.exports = {
  customerInfo,
  customerBlocked,
  customerUnBlocked,
};