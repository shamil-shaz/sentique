
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
const contactController=require('../controllers/user/contactController.js')

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
      return res.redirect("/");
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
router.get("/api/search", userController.searchProductsApi);
router.get("/productDetails", checkBlockedUser, userController.loadProductDetails);
router.get('/zodiac', checkBlockedUser,  userProductController.loadZodiacPage);
router.get('/api/zodiac-products', checkBlockedUser,  userProductController.getZodiacProducts);
router.post("/product/review", userAuth, userController.addReview);
router.get("/product/:productId/rating", userController.getProductRating);


// -----Profile Routes----------

router.get("/profile", checkBlockedUser, userAuth, profileController.userProfile);
router.post("/profile/change-password-init", userAuth, profileController.initChangePassword);
router.post("/profile/change-email-init", userAuth, profileController.sendEmailOtp);
router.get("/profile/change-email-otp", userAuth, profileController.loadOtpVerifyPage);
router.post("/profile/otp-verify", userAuth, profileController.verifyOtp);
router.post("/profile/resend-otp", userAuth, profileController.resendProfileOtp);
router.get('/profile-edit', userAuth, profileController.loadEditProfile);
router.post("/update-profile", userAuth, upload.single("image"), profileController.updateProfile);
router.get("/profile/address", userAuth, addressController.getAddresses);
router.post("/addresses/add", userAuth, addressController.addAddress);
router.get('/addresses/edit-address/:id', userAuth, addressController.getEditAddress);
//router.get('/profile/order-list',userAuth,paymentController.getOrderList)
router.get('/profile/privacy-security', userAuth, profileController.getSecurityPage);
router.get("/addresses/list", userAuth, addressController.getAddressesJSON);


router.get("/addresses/get-location/:pincode", addressController.getLocationByPincode);
router.post("/addresses/edit", userAuth, addressController.editAddress);
router.delete("/addresses/delete/:id", userAuth, addressController.deleteAddress);


////----- whish List ------
router.get("/wishlist", userAuth, wishlistController.loadWishlist);
router.post("/wishlist/add", wishlistController.addToWishlist);
router.delete("/wishlist/remove/:id", userAuth, wishlistController.removeFromWishlist);
router.post("/wishlist/move-all-to-cart", userAuth, wishlistController.moveAllToCart);
router.get('/wishlist/count', userAuth, wishlistController.getWishlistCount);
router.post('/wishlist/update-variant', userAuth, wishlistController.updateVariant);


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


//// ----------------------order-----------

router.get("/orderSuccess",userAuth,orderController.getOrderSuccess)
router.get('/orderDetails/:orderId', userAuth, orderController.getOrderDetails);
router.post('/orders/:orderId/cancel', userAuth, orderController.cancelAllOrder);
router.post('/orders/:orderId/items/:itemIndex/:variantSize/return', userAuth, orderController.returnSingleOrder);
router.post('/orders/:orderId/return',userAuth, orderController.returnAllOrder);
router.post('/orders/:orderId/items/:itemIndex/:variantSize/cancel-return', userAuth, orderController.cancelReturnSingleOrder);
router.post('/orders/:orderId/cancel-return',userAuth, orderController.cancelReturnAllOrder);
router.post('/orders/:orderId/items/:productName/status', orderController.updateItemStatusRoute);
router.get('/orders/:orderId/invoice', userAuth,invoiceController.generateInvoice);
router.post('/orders/:orderId/items/:itemIndex/:variantSize/check-cancel', userAuth, orderController.checkCancellationImpact);
router.post('/orders/:orderId/items/:itemIndex/:variantSize/cancel',userAuth,orderController.cancelSingleOrderWithCouponCheck);

////-------wallet-------

router.get('/profile/wallet', userAuth, walletController.getWalletPage);
router.get('/api/wallet/data', userAuth, walletController.getWalletData);
router.get('/api/wallet/transactions', userAuth, walletController.getPaginatedTransactions);
router.post('/api/wallet/create-add-money-order', userAuth, walletController.createAddMoneyOrder);
router.post('/api/wallet/verify-add-money-payment', userAuth, walletController.verifyAddMoneyPayment);
router.post('/api/wallet/record-failed-payment', userAuth, walletController.recordFailedPayment);
router.post('/api/wallet/test-transaction', userAuth, walletController.addTestTransaction);



///------------------payment-----------------

router.get('/payment/check-auth', paymentController.checkAuth);
router.post('/order/place', userAuth, paymentController.placeOrder);
router.post('/payment/create-razorpayOrder', userAuth, paymentController.createRazorpayOrder);
router.post('/payment/verify-razorpay-payment', userAuth, paymentController.verifyRazorpayPayment);
router.post('/payment/payment-failure', userAuth, paymentController.handlePaymentFailure);
router.post('/payment/retry-failed-order', userAuth, paymentController.retryPaymentForFailedOrder);
router.get('/orderFailure', paymentController.getOrderFailure);
router.get('/order/get-payment-failure-details/:orderId', userAuth, paymentController.getPaymentFailureDetails);
router.get('/profile/order-list', userAuth, paymentController.getOrderList);


///----------coupns------------

router.get('/api/coupons',userAuth, couponController.getAvailableCouponsJSON);
router.get('/coupons', userAuth,couponController.getAvailableCouponsHTML);
router.get('/api/coupons/:couponId',userAuth, couponController.getCouponDetails);
router.get('/api/coupons/search', userAuth, couponController.searchCoupons);
router.get('/api/coupons/validate/:code', userAuth, couponController.validateCouponCode);
router.post('/coupon/apply', userAuth, couponController.applyCouponAtCheckout);
router.post('/api/coupons/record-usage', userAuth, couponController.recordCouponUsage);


////// -----------referral---------

router.get("/profile/referral/stats", userAuth, referralController.getReferralStats);
router.get("/profile/referral/details", userAuth, referralController.getReferralDetails);
router.get("/profile/referral/referred-users", userAuth, referralController.getReferredUsers);
router.post("/profile/referral/apply", userAuth, referralController.applyReferralCode);
router.get("/profile/referral/leaderboard", referralController.getReferralLeaderboard);



/////-------------contact-----------

router.get('/contact',userAuth,contactController.getContactPage)
router.post("/contact/send", userAuth, contactController.sendMessage);


module.exports = router;