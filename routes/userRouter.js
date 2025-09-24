const express=require('express')
const router=express.Router();
const passport = require('passport');
const { userAuth } = require('../middlewares/auth');
const userController=require("../controllers/user/userController");
const profileController=require("../controllers/user/profileController")


router.get('/pageNotFound',userController.pageNotFound)

router.get("/signup",userController.loadSignup);
router.post('/signup', userController.signup);        
router.get('/verify-otp', userController.loadVerifyOtpPage); 
router.post('/verify-otp', userController.verifyOtp);  
router.post('/resend-otp',userController.resendOtp)

//profile Management

router.get('/forgot-password', profileController.loadForgotPassword);
router.post('/forgot-password-valid', profileController.handleForgotPassword);
router.get('/forgotPassword-otp', profileController.loadForgotPageOtp);
router.post('/forgotPassword-otp', profileController.verifyForgotOtp);
router.post('/resend-forgot-otp', profileController.resendOtp);

router.get('/reset-password',profileController.loadResetPasswordPage); 
router.post('/reset-password', profileController.resetPassword);




router.get('/auth/google', passport.authenticate('google', { scope: ['profile', 'email'] }));


router.get('/auth/google/callback', 
  passport.authenticate('google', { failureRedirect: "/signup?error=blocked" }),
  (req, res) => {
    if (req.user) {
      req.session.user = req.user._id.toString();
       
    }
    res.redirect('/'); 
  }
);

router.get('/login',userController.loadLogin)
router.post('/login',userController.login)
router.get('/logout',userController.logout)

router.get("/",userController.loadLandingPage);

router.get("/home",userController.loadHomepage);

router.get("/shopPage",userAuth,userController.loadShopingPage);
router.get("/productDetails",userAuth,userController.loadProductDetails);



module.exports=router;
