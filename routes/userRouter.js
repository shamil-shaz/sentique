// const express=require('express')
// const router=express.Router();
// const passport = require('passport');
// const { userAuth, checkBlockedUser } = require('../middlewares/auth');
// const userController=require("../controllers/user/userController");
// const profileController=require("../controllers/user/profileController")
// const multer = require("multer");

// // Configure Multer for file uploads
// const storage = multer.diskStorage({
//   destination: (req, file, cb) => {
//     cb(null, "public/uploads/"); // Ensure this directory exists
//   },
//   filename: (req, file, cb) => {
//     const uniqueSuffix = Date.now() + "-" + Math.round(Math.random() * 1e9);
//     cb(null, `${file.fieldname}-${uniqueSuffix}${require("path").extname(file.originalname)}`);
//   },
// });

// const upload = multer({ storage });

// const userProductController = require("../controllers/user/userProductsController");

// router.get('/pageNotFound',userController.pageNotFound)

// router.get("/signup",userController.loadSignup);
// router.post('/signup', userController.signup);        
// router.get('/verify-otp', userController.loadVerifyOtpPage); 
// router.post('/verify-otp', userController.verifyOtp);  
// router.post('/resend-otp',userController.resendOtp)

// //profile Management

// router.get('/forgot-password', profileController.loadForgotPassword);
// router.post('/forgot-password-valid', profileController.handleForgotPassword);
// router.get('/forgotPassword-otp', profileController.loadForgotPageOtp);
// router.post('/forgotPassword-otp', profileController.verifyForgotOtp);
// router.post('/resend-forgot-otp', profileController.resendOtp);
// router.get('/reset-password',profileController.loadResetPasswordPage); 
// router.post('/reset-password', profileController.resetPassword);


// router.get('/auth/google', passport.authenticate('google', { scope: ['profile', 'email'] }));

// router.get("/auth/google/callback", checkBlockedUser, (req, res, next) => {
//   passport.authenticate("google", async (err, user, info) => {
//     if (err) {
//       console.error("Google login error:", err);
//       return res.render("signup", { errorMessage: "Something went wrong. Please try again." });
//     }

//     if (!user) {
//       console.log("Google login blocked or failed:", info?.message);
//       return res.redirect("/signup?googleError=" + encodeURIComponent(info?.message || "Google login failed."));
//     }

//     try {
//       req.session.user = {
//         id: user._id.toString(),
//         name: user.name,
//         email: user.email,
//         role: "user",
//       };
//       return res.redirect("/home");
//     } catch (err) {
//       console.error("Session creation error:", err);
//       return res.render("signup", { errorMessage: "Login failed. Please try again." });
//     }
//   })(req, res, next);
// });

// router.get('/auth/google/failure', (req, res) => {
//   res.redirect('/signup?error=google');
// });



// router.get('/login',userController.loadLogin)
// router.post('/login',userController.login)
// router.get('/logout', checkBlockedUser, userAuth, userController.logout);

// router.get('/',userController.loadLandingPage)
// router.get("/home", checkBlockedUser, userAuth, userController.loadHomepage);
// router.get("/shopPage", checkBlockedUser, userAuth, userController.loadShopingPage);
// router.get("/productDetails", checkBlockedUser, userAuth, userController.loadProductDetails);
// router.get('/zodiac', checkBlockedUser, userAuth, userProductController.loadZodiacPage);
// router.get('/api/zodiac-products', checkBlockedUser, userAuth, userProductController.getZodiacProducts);


// // Profile Routes
// router.get("/profile", checkBlockedUser, userAuth, profileController.userProfile);
// router.post("/profile/update", userAuth, profileController.updateProfile);
// router.post("/profile/upload-image", userAuth, upload.single("profileImage"), profileController.uploadImage);

// // Password Change Flow
// router.post("/profile/change-password-ini", userAuth, profileController.initChangePassword);

// // Email Change Flow
// router.post("/profile/change-email-init", userAuth, profileController.sendEmailOtp);

// // OTP verification page (change-password or other OTP flows)
// router.get("/profile/otp-verify", userAuth, profileController.loadOtpVerifyPage);
// router.post("/profile/verify-otp", userAuth, profileController.verifyOtp);
// router.post("/profile/resend-otp", userAuth, profileController.resendOtp);


// module.exports = router;





const express = require('express');
const router = express.Router();
const passport = require('passport');
const { userAuth, checkBlockedUser } = require('../middlewares/auth');
const userController = require("../controllers/user/userController");
const profileController = require("../controllers/user/profileController");

const addressController=require('../controllers/user/addressController')
const wishlistController=require('../controllers/user/whishlistController')
const cartController=require('../controllers/user/cartController')

const multer = require("multer");

// Configure Multer for file uploads
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, "public/uploads/");
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + "-" + Math.round(Math.random() * 1e9);
    cb(null, `${file.fieldname}-${uniqueSuffix}${require("path").extname(file.originalname)}`);
  },
});

const upload = multer({ storage });

const userProductController = require("../controllers/user/userProductsController");

router.get('/pageNotFound', userController.pageNotFound);

router.get("/signup", userController.loadSignup);
router.post('/signup', userController.signup);
router.get('/verify-otp', userController.loadVerifyOtpPage);
router.post('/verify-otp', userController.verifyOtp);
router.post('/resend-otp', userController.resendOtp);

// Profile Management
router.get('/forgot-password', profileController.loadForgotPassword);
router.post('/forgot-password-valid', profileController.handleForgotPassword);
router.get('/forgotPassword-otp', profileController.loadForgotPageOtp);
router.post('/forgotPassword-otp', profileController.verifyForgotOtp);
router.post('/resend-forgot-otp', profileController.resendOtp);
router.get('/reset-password', profileController.loadResetPasswordPage);
router.post('/reset-password', profileController.resetPassword);

router.get('/auth/google', passport.authenticate('google', { scope: ['profile', 'email'] }));

router.get("/auth/google/callback", checkBlockedUser, (req, res, next) => {
  passport.authenticate("google", async (err, user, info) => {
    if (err) {
      console.error("Google login error:", err);
      return res.render("signup", { errorMessage: "Something went wrong. Please try again." });
    }

    if (!user) {
      console.log("Google login blocked or failed:", info?.message);
      return res.redirect("/signup?googleError=" + encodeURIComponent(info?.message || "Google login failed."));
    }

    try {
      req.session.user = {
        id: user._id.toString(),
        name: user.name,
        email: user.email,
        role: "user",
      };
      return res.redirect("/home");
    } catch (err) {
      console.error("Session creation error:", err);
      return res.render("signup", { errorMessage: "Login failed. Please try again." });
    }
  })(req, res, next);
});

router.get('/auth/google/failure', (req, res) => {
  res.redirect('/signup?error=google');
});

router.get('/login', userController.loadLogin);
router.post('/login', userController.login);
router.get('/logout', checkBlockedUser, userAuth, userController.logout);

router.get('/', userController.loadLandingPage);
router.get("/home", checkBlockedUser, userAuth, userController.loadHomepage);
router.get("/shopPage", checkBlockedUser, userAuth, userController.loadShopingPage);
router.get("/productDetails", checkBlockedUser, userAuth, userController.loadProductDetails);
router.get('/zodiac', checkBlockedUser, userAuth, userProductController.loadZodiacPage);
router.get('/api/zodiac-products', checkBlockedUser, userAuth, userProductController.getZodiacProducts);




// Profile Routes
router.get("/profile", checkBlockedUser, userAuth, profileController.userProfile);



// Password Change Flow
router.post("/profile/change-password-init", userAuth, profileController.initChangePassword);

// Email Change Flow
router.post("/profile/change-email-init", userAuth, profileController.sendEmailOtp);

// // OTP verification page (change-password or other OTP flows)
 router.get("/profile/change-email-otp", userAuth, profileController.loadOtpVerifyPage);
// router.post("/profile/change-email-otp", userAuth, profileController.verifyOtp);
// router.post("/profile/resend-profile-otp", userAuth, profileController.resendProfileOtp);


// OTP verification page for any type (email/password)
//router.get("/profile/otp-verify", userAuth, profileController.loadOtpVerifyPage);
router.post("/profile/otp-verify", userAuth, profileController.verifyOtp);
router.post("/profile/resend-otp", userAuth, profileController.resendProfileOtp);




router.get('/profile-edit', userAuth, profileController.loadEditProfile);
router.post("/update-profile", userAuth, upload.single("image"), profileController.updateProfile);


router.get("/profile/address", userAuth, addressController.getAddresses);
router.post("/addresses/add", userAuth, addressController.addAddress);
router.get('/addresses/edit-address/:id', userAuth, addressController.getEditAddress);

// Update address
router.post("/addresses/edit", userAuth, addressController.editAddress);
router.delete("/addresses/delete/:id", userAuth, addressController.deleteAddress);
router.get("/addresses/list", userAuth, addressController.getAddressesJSON);

//// whish List 
router.get("/wishlist", userAuth, wishlistController.loadWishlist);
router.post("/wishlist/add", userAuth, wishlistController.addToWishlist);
router.delete("/wishlist/remove/:id", userAuth, wishlistController.removeFromWishlist);
router.post("/wishlist/move-all-to-cart", userAuth, wishlistController.moveAllToCart);


//// cart

 router.get('/cart',userAuth,cartController.getCartPage)

router.post('/cart/add',userAuth, cartController.addToCart);
router.delete('/cart/remove/:productId',userAuth, cartController.removeFromCart);
router.put('/cart/update', userAuth, cartController.updateCart);





module.exports = router;