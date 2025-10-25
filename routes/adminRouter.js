
const express = require('express');
const router = express.Router();
const mongoose = require('mongoose');

// Controllers
const adminController = require("../controllers/admin/adminController");
const customerController = require('../controllers/admin/customerController');

const categoryController = require("../controllers/admin/categoryController");
const productController = require("../controllers/admin/productController");
const brandController = require('../controllers/admin/brandController');
const adminOrderController=require('../controllers/admin/adminOrderController')
const adminCouponsController=require('../controllers/admin/adminCouponsController')

// Middlewares
const { userAuth, adminAuth } = require('../middlewares/auth');
const { uploadProductImage, uploadCategoryImage } = require("../middlewares/imageUpload");

// Models
const Product = require("../models/productSchema");
const Brand = require("../models/brandSchema");
const Category = require("../models/categorySchema");

//------------- COMMON MIDDLEWARE -----------
router.use((req, res, next) => {
  if (req.baseUrl === "/admin") {
    const pathParts = req.path.split("/");
    res.locals.activePage = pathParts[1] || "dashboard";
  }
  next();
});

// --------------- ERROR MANAGEMENT ----------------
router.get("/pageerror", adminController.pageerror);


// -------------- LOGIN MANAGEMENT ---------------
router.get("/login", adminController.loadLogin);
router.post("/login", adminController.verifyLogin);
router.get("/dashboard", adminAuth, adminController.loadDashboard);
router.get("/logout", adminController.logout);

// ---------------- CUSTOMER MANAGEMENT ----------------
router.get('/customers', adminAuth, customerController.customerInfo);
router.post("/blockCustomer", adminAuth, customerController.customerBlocked);
router.post("/unblockCustomer", adminAuth, customerController.customerUnBlocked);

// -------------- CATEGORY MANAGEMENT ----------------
router.get("/category", adminAuth, categoryController.categoryInfo);
router.post("/addCategory",adminAuth,uploadCategoryImage.single("image"),categoryController.addCategory);
router.post("/editCategory/:id", adminAuth, uploadCategoryImage.single("image"), categoryController.editCategory);
router.post("/addCategoryOffer", adminAuth, categoryController.addCategoryOffer);
router.post("/removeCategoryOffer", adminAuth, categoryController.removeCategoryOffer);
router.post('/listCategory', adminAuth, categoryController.getListCategory);
router.post('/unlistCategory', adminAuth, categoryController.getUnlistCategory);
router.get("/editCategory", adminAuth, categoryController.getEditCategory);


// -------------------- BRAND MANAGEMENT --------------------
router.get("/brands", adminAuth, brandController.getBrandPage);
router.get("/addBrand", adminAuth, brandController.getAddBrand);
router.post("/addBrand", adminAuth,  uploadCategoryImage.single("brandImage"),brandController.addBrand); 
router.get('/blockBrand', adminAuth, brandController.blockBrand);
router.get('/unBlockBrand', adminAuth, brandController.unBlockBrand);


// -------------------- PRODUCT MANAGEMENT --------------------
router.get('/addProducts', adminAuth, productController.getProductAddPage);
router.post("/addProducts", uploadProductImage.array("productImages", 4),productController.addProducts);
router.get("/products", adminAuth, productController.getAllProducts);
router.post('/addProductOffer', adminAuth, productController.addProductOffer);
router.post('/removeProductOffer', adminAuth, productController.removeProductOffer);
router.post('/toggleProductStatus/:id', adminAuth, productController.toggleProductStatus);
router.get("/edit-product/:id", adminAuth, productController.getEditProductPage);
router.post("/edit-product/:id", adminAuth, uploadProductImage.none(), productController.updateProduct);
router.delete('/deleteProduct/:id', adminAuth, productController.deleteProduct);


////--------- ORDER MANAGEMENT ------------

router.get("/orders", adminAuth, adminOrderController.getAdminOrderList);
router.post('/orders/:orderId/items/:itemIndex/:variantSize/status', adminAuth, adminOrderController.updateProductStatus);
router.post('/orders/:orderId/items/:itemIndex/:variantSize/approve-return', adminAuth, adminOrderController.approveReturn);
router.post('/orders/:orderId/items/:itemIndex/:variantSize/reject-return', adminAuth, adminOrderController.rejectReturn);
router.post('/orders/:orderId/items/all/all/approve-return', adminAuth, adminOrderController.approveReturn);
router.post('/orders/:orderId/items/all/all/reject-return', adminAuth, adminOrderController.rejectReturn);


////-------------COUPONS MANAGEMENT-------------

// router.get('/couponsManaging', adminAuth, adminCouponsController.getCoupons);

// // Get all coupons (API)
// router.get('/get-coupons', adminAuth, adminCouponsController.getAllCoupons);

// // Create new coupon
// router.post('/create-coupon', adminAuth, adminCouponsController.createCoupon);

// // Update coupon
// router.put('/update-coupon/:id', adminAuth, adminCouponsController.updateCoupon);

// // Delete coupon
// router.delete('/delete-coupon/:id', adminAuth, adminCouponsController.deleteCoupon);

// // Toggle coupon status (active/inactive)
// router.patch('/toggle-coupon/:id', adminAuth, adminCouponsController.toggleCouponStatus);

router.get('/couponsManaging', adminAuth, adminCouponsController.getCoupons);
router.get('/get-coupons', adminAuth, adminCouponsController.getAllCoupons);
router.post('/create-coupon', adminAuth, adminCouponsController.createCoupon);
router.put('/update-coupon/:id', adminAuth, adminCouponsController.updateCoupon);
router.delete('/delete-coupon/:id', adminAuth, adminCouponsController.deleteCoupon);
router.patch('/toggle-coupon-listing/:id', adminAuth, adminCouponsController.toggleCouponListing);
router.patch('/toggle-coupon/:id', adminAuth, adminCouponsController.toggleCouponStatus);
module.exports = router;