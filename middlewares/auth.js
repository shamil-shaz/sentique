
const mongoose = require('mongoose');
const User = require('../models/userSchema');


const clearUserSession = (req) => {
  return new Promise((resolve) => {
    delete req.session.user;
    req.session.save((err) => {
      if (err) console.error("User session save error:", err);
      resolve();
    });
  });
};

const clearAdminSession = (req) => {
  return new Promise((resolve) => {
    delete req.session.admin;
    req.session.save((err) => {
      if (err) console.error("Admin session save error:", err);
      resolve();
    });
  });
};

const userAuth = async (req, res, next) => {
  try {
    if (!req.user) return res.redirect('/login');

    const user = await User.findById(req.user._id);
    if (!user || user.isBlocked) {
      req.logout(() => {}); // Passport logout
      return res.redirect('/login?error=blocked');
    }

    res.locals.user = user;
    next();
  } catch (error) {
    console.error("Error in userAuth middleware:", error);
    return res.status(500).send("Internal Server Error");
  }
};


const adminAuth = async (req, res, next) => {
  try {
    if (!req.session.admin) return res.redirect('/admin/login');

    const admin = await User.findById(req.session.admin.id);
    if (!admin || !admin.isAdmin) {
      await clearAdminSession(req);
      return res.redirect('/admin/login');
    }

    res.locals.admin = admin;
    next();
  } catch (error) {
    console.error("Error in adminAuth middleware:", error);
    return res.status(500).send("Internal Server Error");
  }
};

const checkBlockedUser = async (req, res, next) => {
  try {
    if (req.user) {
      const user = await User.findById(req.user._id);
      if (user && user.isBlocked) {
        req.logout(() => {});
        return res.redirect('/login?error=blocked');
      }
    }
    next();
  } catch (err) {
    console.error("Error in checkBlockedUser middleware:", err);
    next();
  }
};


module.exports = {
  userAuth,
  adminAuth,
  checkBlockedUser,
};