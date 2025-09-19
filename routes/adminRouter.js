const express = require('express');
const router  = express.Router();
const uploads = require("../helpers/multer");
const adminController = require("../controllers/admin/adminController");
const customerController = require('../controllers/admin/customerController'); 
const categoryController = require("../controllers/admin/categoryController");
const productController = require("../controllers/admin/productController");
const brandController = require('../controllers/admin/brandController');
const { userAuth, adminAuth } = require('../middlewares/auth');
const upload = require('../middlewares/imageUpload');




router.use((req, res, next) => {
  if (req.baseUrl === "/admin") {
    const pathParts = req.path.split("/");
    res.locals.activePage = pathParts[1] || "dashboard";
  }
  next();
});

// Error Management
router.get("/pageerror", adminController.pageerror);

// Login management
router.get("/login", adminController.loadLogin);
router.post("/login", adminController.verifyLogin);
router.get("/dashboard", adminAuth, adminController.loadDashboard);
router.get("/logout", adminController.logout);

// Customer Management
router.get('/customers', adminAuth, customerController.customerInfo);
router.post("/blockCustomer", adminAuth, customerController.customerBlocked);
router.post("/unblockCustomer", adminAuth, customerController.customerunBlocked);

// Category Management
router.get("/category", adminAuth, categoryController.categoryInfo);
router.post("/addCategory", adminAuth, categoryController.addCategory);
router.post("/addCategoryOffer", adminAuth, categoryController.addCategoryOffer);
router.post("/removeCategoryOffer", adminAuth, categoryController.removeCategoryOffer);
router.get('/listCategory', adminAuth, categoryController.getListCategory);
router.get('/unlistCategory', adminAuth, categoryController.getUnlistCategory);
router.get("/editCategory", adminAuth, categoryController.getEditCategory);
router.post("/editCategory/:id", adminAuth, categoryController.editCategory);
router.post("/deleteCategory", adminAuth, categoryController.deleteCategory);


// Brand Management
router.get("/brands", adminAuth, brandController.getBrandPage);
router.get("/addBrand", adminAuth, brandController.getAddBrand);
router.post("/addBrand", adminAuth, uploads.single("brandImage"), brandController.addBrand);
router.get('/blockBrand', adminAuth, brandController.blockBrand);
router.get('/unBlockBrand', adminAuth, brandController.unBlockBrand);
router.get('/deleteBrand', adminAuth, brandController.deleteBrand);


// Product Management
router.get('/addProducts', adminAuth, productController.getProductAddPage);
router.post("/addProducts",adminAuth, upload.any(),productController.addProducts);
router.get("/products", adminAuth, productController.getAllProducts);
router.post('/addProductOffer', adminAuth, productController.addProductOffer);
router.post('/removeProductOffer', adminAuth, productController.removeProductOffer);
router.post('/blockProduct/:id', adminAuth, productController.blockProduct);
router.post('/unblockProduct/:id', adminAuth, productController.unblockProduct);
router.get("/edit-product/:id", adminAuth, productController.getEditProductPage);
router.post("/edit-product/:id",adminAuth,upload.any(),productController.updateProduct);
router.post('/deleteProduct/:id',adminAuth,productController.deleteProduct);


module.exports = router;