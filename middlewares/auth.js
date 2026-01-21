
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

// const userAuth = async (req, res, next) => {
//   try {
//     const sessionUser = req.session.user;
//     const passportUser = req.user;

//     if (!sessionUser && !passportUser) {
//       return res.redirect('/login');
//     }

//     const userId = passportUser?._id || sessionUser.id;

//     const user = await User.findById(userId);
//     if (!user || user.isBlocked) {
//       if (passportUser) req.logout(() => {});
//       if (sessionUser) await clearUserSession(req);
//       return res.redirect('/login?error=blocked');
//     }

//     res.locals.user = user;
//     next();
//   } catch (error) {
//     console.error("Error in userAuth middleware:", error);
//     return res.status(500).send("Internal Server Error");
//   }
// };



const userAuth = async (req, res, next) => {
    try {
        // Passport uses req.user, manual login uses req.session.user
        const user = req.user || req.session?.user;

        if (!user) {
            return res.redirect('/login');
        }

        const dbUser = await User.findById(user._id || user.id);
        
        if (!dbUser || dbUser.isBlocked) {
            if (req.logout) req.logout(() => {});
            delete req.session.user;
            return res.redirect('/login?error=blocked');
        }

        // IMPORTANT: Attach to both res.locals (for EJS) and req.user (for routes)
        res.locals.user = dbUser;
        next();
    } catch (error) {
        console.error("Auth Middleware Error:", error);
        res.status(500).send("Internal Server Error");
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