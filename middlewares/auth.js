const User = require('../models/userSchema');

const userAuth = (req, res, next) => {
  if (req.session.user) {
    User.findById(req.session.user)
      .then((data) => {
        if (data && !data.isBlocked) {
          next();
        } else {
          res.redirect('/login');
        }
      })
      .catch((error) => {
        console.log("Error in userAuth middleware:", error);
        res.status(500).send("Internal Server Error");
      });
  } else {
    res.redirect('/login');
  }
};

const adminAuth = (req, res, next) => {
  if (req.session.admin) {
    User.findById(req.session.admin)
      .then((admin) => {
        if (admin && admin.isAdmin && !admin.isBlocked) {
          next();
        } else {
          res.redirect("/admin/login");
        }
      })
      .catch((error) => {
        console.log("Error in adminAuth middleware:", error);
        res.status(500).send("Internal Server Error");
      });
  } else {
    res.redirect("/admin/login");
  }
};

module.exports = {
  userAuth,
  adminAuth,
};