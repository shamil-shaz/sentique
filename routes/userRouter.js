
const express = require('express');
const router = express.Router();
const passport = require('passport');
const { userAuth, checkBlockedUser } = require('../middlewares/auth');
const userController = require("../controllers/user/userController");
const profileController = require("../controllers/user/profileController");

const addressController=require('../controllers/user/addressController')
const wishlistController=require('../controllers/user/whishlistController')
const cartController=require('../controllers/user/cartController')
const checkoutController=require('../controllers/user/checkoutController')
const orderController=require('../controllers/user/orderController')
const walletController=require('../controllers/user/walletController')
const invoiceController=require('../controllers/user/invoiceController.js')

const multer = require("multer");


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




// ---Profile Routes
router.get("/profile", checkBlockedUser, userAuth, profileController.userProfile);


// ---Password Change Flow
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
router.get('/profile/order-list',userAuth,orderController.getOrderList)

//----- Update address
router.post("/addresses/edit", userAuth, addressController.editAddress);
router.delete("/addresses/delete/:id", userAuth, addressController.deleteAddress);
router.get("/addresses/list", userAuth, addressController.getAddressesJSON);

////----- whish List 
router.get("/wishlist", userAuth, wishlistController.loadWishlist);
router.post("/wishlist/add", userAuth, wishlistController.addToWishlist);
router.delete("/wishlist/remove/:id", userAuth, wishlistController.removeFromWishlist);
router.post("/wishlist/move-all-to-cart", userAuth, wishlistController.moveAllToCart);


//// -----cart

 router.get('/cart',userAuth,cartController.getCartPage)
router.post('/cart/add',userAuth, cartController.addToCart);
 router.delete('/cart/remove/:productId',userAuth, cartController.removeFromCart);
//router.post('/cart/remove/:productId/:variantSize', userAuth, cartController.removeFromCart);
router.put('/cart/update', userAuth, cartController.updateCart);


////----------------- checkout

router.get('/checkout', userAuth, checkoutController.getCheckoutPage);
router.get('/addresses/addresses-edit/:id', userAuth, checkoutController.getAddressForEdit);
router.post('/checkout/add-address', userAuth, checkoutController.addAddress);
router.post('/checkout/edit-address/:id', userAuth, checkoutController.editAddress);
router.post('/order/place', userAuth, checkoutController.placeOrder);


//// ----------------------order

router.get("/orderSuccess",userAuth,orderController.getOrderSuccess)
router.get('/orderDetails/:orderId', userAuth, orderController.getOrderDetails);
router.post('/orders/:orderId/cancel', userAuth, orderController.cancelAllOrder);
router.post('/orders/:orderId/items/:productName/cancel', userAuth, orderController.cancelSingleOrder);


//router.get('/orders/:orderId', orderController.getOrderDetails);
router.post('/orders/:orderId/items/:productName/return', userAuth,orderController.returnSingleOrder);
router.post('/orders/:orderId/return',userAuth, orderController.returnAllOrder);
router.post('/orders/:orderId/items/:productName/cancel-return', userAuth,orderController.cancelReturnSingleOrder);
router.post('/orders/:orderId/cancel-return',userAuth, orderController.cancelReturnAllOrder);
router.post('/orders/:orderId/items/:productName/status', orderController.updateItemStatusRoute);

router.get('/orders/:orderId/invoice', userAuth,invoiceController.generateInvoice);


////-------wallet----

// Add these routes to your user routes file

router.get('/profile/wallet', userAuth, walletController.getWalletPage);

// // Add these two new routes for API calls
// router.get('/api/wallet/data', userAuth, walletController.getWalletData);
// router.get('/api/wallet/transactions', userAuth, walletController.getPaginatedTransactions);


// API routes
router.get('/api/wallet/data', userAuth,walletController. getWalletData);
router.get('/api/wallet/transactions', userAuth,walletController. getPaginatedTransactions);
router.post('/api/wallet/test-transaction', userAuth, walletController.addTestTransaction);



module.exports = router;