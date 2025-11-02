
const express = require('express');
const router = express.Router();
const passport = require('passport');
const { userAuth, checkBlockedUser } = require('../middlewares/auth');
const apiAuth=require('../middlewares/apiAuth.js')
const userController = require("../controllers/user/userController");
const profileController = require("../controllers/user/profileController");

const addressController=require('../controllers/user/addressController')
const wishlistController=require('../controllers/user/whishlistController')
const cartController=require('../controllers/user/cartController')
const checkoutController=require('../controllers/user/checkoutController')
const orderController=require('../controllers/user/orderController')
const walletController=require('../controllers/user/walletController')
const invoiceController=require('../controllers/user/invoiceController.js')
const paymentController=require('../controllers/user/paymentController.js')
const couponController=require('../controllers/user/couponController.js')
const referralController=require('../controllers/user/referralController')


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

// -------Profile Management---------
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
      
      
      if (!user.refferalCode) {
        const referralCode = await userController.generateUniqueReferralCode(user.name);
        user.refferalCode = referralCode;
        await user.save();
        console.log(`Generated referral code for Google user: ${referralCode}`);
      }

      req.session.user = {
        id: user._id.toString(),
        name: user.name,
        email: user.email,
        role: "user",
      };

        console.log("Google user logged in with referral code:", user.refferalCode);
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
router.get("/home", checkBlockedUser, userController.loadHomepage);
router.get("/shopPage", checkBlockedUser,  userController.loadShopingPage);
router.get("/productDetails", checkBlockedUser, userController.loadProductDetails);
router.get('/zodiac', checkBlockedUser,  userProductController.loadZodiacPage);
router.get('/api/zodiac-products', checkBlockedUser,  userProductController.getZodiacProducts);



// -----Profile Routes----------
router.get("/profile", checkBlockedUser, userAuth, profileController.userProfile);


// ---Password Change Flow------
router.post("/profile/change-password-init", userAuth, profileController.initChangePassword);

// -----------Email Change Flow--------
router.post("/profile/change-email-init", userAuth, profileController.sendEmailOtp);

// // ------OTP verification page (change-password or other OTP flows)-----

router.get("/profile/change-email-otp", userAuth, profileController.loadOtpVerifyPage);
router.post("/profile/otp-verify", userAuth, profileController.verifyOtp);
router.post("/profile/resend-otp", userAuth, profileController.resendProfileOtp);

router.get('/profile-edit', userAuth, profileController.loadEditProfile);
router.post("/update-profile", userAuth, upload.single("image"), profileController.updateProfile);

router.get("/profile/address", userAuth, addressController.getAddresses);
router.post("/addresses/add", userAuth, addressController.addAddress);
router.get('/addresses/edit-address/:id', userAuth, addressController.getEditAddress);
router.get('/profile/order-list',userAuth,orderController.getOrderList)
router.get('/profile/privacy-security', userAuth, profileController.getSecurityPage);
router.get("/addresses/list", userAuth, addressController.getAddressesJSON);

//router.get("/get-location/:pincode", addressController.getLocationByPincode);
router.get("/addresses/get-location/:pincode", addressController.getLocationByPincode);

//----- Update address----
router.post("/addresses/edit", userAuth, addressController.editAddress);
router.delete("/addresses/delete/:id", userAuth, addressController.deleteAddress);


////----- whish List ------
router.get("/wishlist", userAuth, wishlistController.loadWishlist);
router.post("/wishlist/add", wishlistController.addToWishlist);
router.delete("/wishlist/remove/:id", userAuth, wishlistController.removeFromWishlist);
router.post("/wishlist/move-all-to-cart", userAuth, wishlistController.moveAllToCart);
router.get('/wishlist/count', userAuth, wishlistController.getWishlistCount);

//// -----cart-------
 
router.get('/cart',userAuth,cartController.getCartPage)
router.post('/cart/add', cartController.addToCart);
router.delete('/cart/remove/:productId',userAuth, cartController.removeFromCart);
router.put('/cart/update', userAuth, cartController.updateCart);
router.post('/check',checkBlockedUser,userAuth,cartController. checkCartQuantity);
router.get('/cart/count', userAuth,cartController.getCartCount);


router.post('/cart/validate-stock', userAuth, cartController.checkProductStock); 
router.post('/cart/validate-checkout', userAuth, cartController.validateCheckoutItems);

////----------------- checkout-----------

router.get('/checkout', userAuth, checkoutController.getCheckoutPage);
router.get('/addresses/addresses-edit/:id', userAuth, checkoutController.getAddressForEdit);
router.post('/checkout/add-address', userAuth, checkoutController.addAddress);
router.post('/checkout/edit-address/:id', userAuth, checkoutController.editAddress);
// router.post('/order/place', userAuth, checkoutController.placeOrder);


//// ----------------------order-----------

router.get("/orderSuccess",userAuth,orderController.getOrderSuccess)
router.get('/orderDetails/:orderId', userAuth, orderController.getOrderDetails);
router.post('/orders/:orderId/cancel', userAuth, orderController.cancelAllOrder);
router.post('/orders/:orderId/items/:itemIndex/:variantSize/cancel', userAuth, orderController.cancelSingleOrder);
router.post('/orders/:orderId/items/:itemIndex/:variantSize/return', userAuth, orderController.returnSingleOrder);
router.post('/orders/:orderId/return',userAuth, orderController.returnAllOrder);
router.post('/orders/:orderId/items/:itemIndex/:variantSize/cancel-return', userAuth, orderController.cancelReturnSingleOrder);
router.post('/orders/:orderId/cancel-return',userAuth, orderController.cancelReturnAllOrder);
router.post('/orders/:orderId/items/:productName/status', orderController.updateItemStatusRoute);

router.get('/orders/:orderId/invoice', userAuth,invoiceController.generateInvoice);


////-------wallet----


// router.get('/profile/wallet', userAuth, walletController.getWalletPage);
// router.get('/api/wallet/data', userAuth,walletController. getWalletData);
// router.get('/api/wallet/transactions', userAuth,walletController. getPaginatedTransactions);
// router.post('/api/wallet/test-transaction', userAuth, walletController.addTestTransaction);


// Wallet page and data
router.get('/profile/wallet', userAuth, walletController.getWalletPage);
router.get('/api/wallet/data', userAuth, walletController.getWalletData);
router.get('/api/wallet/transactions', userAuth, walletController.getPaginatedTransactions);

// Add Money endpoints
router.post('/api/wallet/create-add-money-order', userAuth, walletController.createAddMoneyOrder);
router.post('/api/wallet/verify-add-money-payment', userAuth, walletController.verifyAddMoneyPayment);
router.post('/api/wallet/record-failed-payment', userAuth, walletController.recordFailedPayment);
// Test transaction endpoint (for testing only)
router.post('/api/wallet/test-transaction', userAuth, walletController.addTestTransaction);

///------------------payment-----------------

router.post('/order/place', userAuth, paymentController.placeOrder);
router.get('/payment/check-auth', paymentController.checkAuth);
router.post('/payment/create-razorpay-order', apiAuth, paymentController.createRazorpayOrder);
router.post('/payment/verify-razorpay-payment', apiAuth, paymentController.verifyRazorpayPayment);
//router.post('/payment/place-order', apiAuth, paymentController.placeOrder);
router.get('/orderFailure',userAuth,paymentController.getOrderFailure)

///----------coupns------------


router.get('/api/coupons',userAuth, couponController.getAvailableCouponsJSON);

router.get('/coupons', userAuth,couponController.getAvailableCouponsHTML);

router.get('/api/coupons/:couponId',userAuth, couponController.getCouponDetails);
router.get('/api/coupons/search', userAuth, couponController.searchCoupons);
router.get('/api/coupons/validate/:code', userAuth, couponController.validateCouponCode);
// router.post('/api/coupons/apply', userAuth, couponController.applyCouponAtCheckout);

router.post('/coupon/apply', userAuth, couponController.applyCouponAtCheckout);
router.post('/api/coupons/record-usage', userAuth, couponController.recordCouponUsage);



router.get("/profile/referral/stats", userAuth, referralController.getReferralStats);
router.get("/profile/referral/details", userAuth, referralController.getReferralDetails);
router.get("/profile/referral/referred-users", userAuth, referralController.getReferredUsers);
router.post("/profile/referral/apply", userAuth, referralController.applyReferralCode);
router.get("/profile/referral/leaderboard", referralController.getReferralLeaderboard);
module.exports = router;