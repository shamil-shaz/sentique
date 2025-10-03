const User = require('../models/userSchema');


const userAuth = async (req, res, next) => {
  try {
    if (!req.session.user) return res.redirect('/login');

    const user = await User.findById(req.session.user.id); 
    if (!user || user.isBlocked) {
      req.session.destroy(err => {
        if (err) console.error("Session destroy error:", err);
        return res.redirect('/login');
      });
      return;
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
    if (!admin || !admin.isAdmin || admin.isBlocked) {
      req.session.destroy(err => {
        if (err) console.error("Admin session destroy error:", err);
        return res.redirect('/admin/login');
      });
      
      return;
    }

    res.locals.admin = admin; 
    next();
  } catch (error) {
    console.error("Error in adminAuth middleware:", error);
    return res.status(500).send("Internal Server Error");
  }
};

module.exports = {
  userAuth,
  adminAuth,
};