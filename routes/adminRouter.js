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
const handleProductImages = require('../middlewares/handleProductImages');
const Product = require("../models/productSchema");
const Brand = require("../models/brandSchema");
const Category = require("../models/categorySchema");
const mongoose = require('mongoose');





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


// // Product Management
 //router.get('/addProducts', adminAuth, productController.getProductAddPage);
// router.post("/addProducts",adminAuth, upload.any(),productController.addProducts);
// router.get("/products", adminAuth, productController.getAllProducts);
// router.post('/addProductOffer', adminAuth, productController.addProductOffer);
// router.post('/removeProductOffer', adminAuth, productController.removeProductOffer);
// router.post('/blockProduct/:id', adminAuth, productController.blockProduct);
// router.post('/unblockProduct/:id', adminAuth, productController.unblockProduct);
 router.get("/edit-product/:id", adminAuth, productController.getEditProductPage);
 router.post("/edit-product/:id",adminAuth,upload.any(),productController.updateProduct);
// router.post('/deleteProduct/:id',adminAuth,productController.deleteProduct);


// Product Management

// Add Product Page
router.get('/addProducts', adminAuth, productController.getProductAddPage);

// Add Product with multiple images
router.post(
  "/addProducts",
  adminAuth,
  (req, res, next) => {
    upload.any()(req, res, (err) => {
      if (err) {
        return res.status(400).send({ status: false, message: err.message });
      }
      next();
    });
  },
  productController.addProducts
);

// List All Products
router.get("/products", adminAuth, productController.getAllProducts);

// Add/Remove Product Offers
router.post('/addProductOffer', adminAuth, productController.addProductOffer);
router.post('/removeProductOffer', adminAuth, productController.removeProductOffer);

// Block/Unblock Product
router.post('/blockProduct/:id', adminAuth, productController.blockProduct);
router.post('/unblockProduct/:id', adminAuth, productController.unblockProduct);


// Delete Product
router.post('/deleteProduct/:id', adminAuth, productController.deleteProduct);

module.exports = router;








// Edit Product Page
// router.get('/edit-product/:id', async (req, res) => {
//   try {
//     const product = await Product.findById(req.params.id)
//       .populate('brand')
//       .populate('category');

//     if (!product) return res.redirect('/admin/products');

//     // fetch brands, categories, variants
//     const brands = await Brand.find();
//     const categories = await Category.find();
//     const variants = product.variants || [];

//     res.render('edit-product', { product, brands, cat: categories, variants });
//   } catch (err) {
//     console.error(err);
//     res.redirect('/admin/products');
//   }
// });

// // Update Product with multiple images
// // Update Product with multiple images safely
// router.post('/edit-product/:id', handleProductImages, async (req, res) => {
//   try {
//     const productId = req.params.id;
//     const body = req.body;

//     // Fetch the product first
//     const product = await Product.findById(productId);
//     if (!product) {
//       req.flash('error', 'Product not found');
//       return res.redirect('/admin/products');
//     }

//     // -----------------------------
//     // Validate basic fields
//     // -----------------------------
  
  
//     // -----------------------------
//     // Validate Category
//     // -----------------------------
//     let categoryObj = null;
//     if (mongoose.Types.ObjectId.isValid(body.category)) {
//       categoryObj = await Category.findById(body.category);
//     }
   
//     // -----------------------------
//     // Validate Brand
//     // -----------------------------
//     let brandObj = null;
//     if (mongoose.Types.ObjectId.isValid(body.brand)) {
//       brandObj = await Brand.findById(body.brand);
//     }
   

//     // -----------------------------
//     // Handle Variants
//     // -----------------------------
//     const sizes = Array.isArray(body.variantSize) ? body.variantSize : [body.variantSize];
//     const stocks = Array.isArray(body.variantStock) ? body.variantStock : [body.variantStock];
//     const regularPrices = Array.isArray(body.variantRegularPrice) ? body.variantRegularPrice : [body.variantRegularPrice];
//     const salePrices = Array.isArray(body.variantSalePrice) ? body.variantSalePrice : [body.variantSalePrice];

//     if (!(sizes.length === stocks.length && stocks.length === regularPrices.length && regularPrices.length === salePrices.length)) {
//       req.flash('error', 'Variant data mismatch. Please check all variant fields.');
//       return res.redirect(`/admin/edit-product/${productId}`);
//     }

//     const variants = sizes.map((size, i) => ({
//       size: Number(size),
//       stock: Number(stocks[i]),
//       regularPrice: Number(regularPrices[i]),
//       salePrice: Number(salePrices[i])
//     }));

//     if (variants.length === 0) {
//       req.flash('error', 'At least one variant is required');
//       return res.redirect(`/admin/edit-product/${productId}`);
//     }

//     // -----------------------------
//     // Handle Images (optional update)
//     // -----------------------------
//     const newImages = req.files && req.files.length > 0 ? req.files.map(f => f.path) : product.images;

//     // -----------------------------
//     // Validate Offer
//     // -----------------------------
//     let productOffer = Number(body.productOffer) || 0;
//     if (productOffer < 0 || productOffer > 100) productOffer = 0;

//     // -----------------------------
//     // Update Product
//     // -----------------------------
//     product.productName = body.productName
//     product.description = body.description
//     product.brand = brandObj._id;
//     product.category = categoryObj._id;
//     product.variants = variants;
//     product.images = newImages;
//     product.productOffer = productOffer;

//     await product.save();

//     req.flash('success', 'Product updated successfully!');
//     res.redirect('/admin/products');
//   } catch (error) {
//     console.error('❌ Error updating product:', error);
//     req.flash('error', 'Something went wrong while updating the product');
//     res.redirect('/admin/products');
//   }
// });




// router.get('/edit-product/:id', async (req, res) => {
//   try {
//     const product = await Product.findById(req.params.id)
//       .populate('brand')
//       .populate('category');

//     if (!product) return res.redirect('/admin/products');

//     // fetch brands, categories, variants
//     const brands = await Brand.find();
//     const categories = await Category.find();
//     const variants = product.variants || [];

//     res.render('edit-product', { product, brands, cat: categories, variants });
//   } catch (err) {
//     console.error(err);
//     res.redirect('/admin/products');
//   }
// });

// // Update Product with multiple images safely
// router.post('/edit-product/:id', handleProductImages, async (req, res) => {
//   try {
//     const productId = req.params.id;
//     const body = req.body;

//     // Fetch the product first
//     const product = await Product.findById(productId);
//     if (!product) {
//       req.flash('error', 'Product not found');
//       return res.redirect('/admin/products');
//     }

//     // -----------------------------
//     // Validate basic fields
//     // -----------------------------
//     if (!body.productName || body.productName.trim() === '') {
//       req.flash('error', 'Product name is required');
//       return res.redirect(`/admin/edit-product/${productId}`);
//     }

//     if (!body.description || body.description.trim() === '') {
//       req.flash('error', 'Product description is required');
//       return res.redirect(`/admin/edit-product/${productId}`);
//     }

//     // -----------------------------
//     // Validate Category
//     // -----------------------------
//     let categoryObj = null;
//     if (body.category && mongoose.Types.ObjectId.isValid(body.category)) {
//       categoryObj = await Category.findById(body.category);
//       if (!categoryObj) {
//         req.flash('error', 'Invalid category selected');
//         return res.redirect(`/admin/edit-product/${productId}`);
//       }
//     } else {
//       req.flash('error', 'Category is required');
//       return res.redirect(`/admin/edit-product/${productId}`);
//     }
   
//     // -----------------------------
//     // Validate Brand
//     // -----------------------------
//     let brandObj = null;
//     if (body.brand && mongoose.Types.ObjectId.isValid(body.brand)) {
//       brandObj = await Brand.findById(body.brand);
//       if (!brandObj) {
//         req.flash('error', 'Invalid brand selected');
//         return res.redirect(`/admin/edit-product/${productId}`);
//       }
//     } else {
//       req.flash('error', 'Brand is required');
//       return res.redirect(`/admin/edit-product/${productId}`);
//     }

//     // -----------------------------
//     // Handle Variants
//     // -----------------------------
//     const sizes = Array.isArray(body.variantSize) ? body.variantSize : [body.variantSize];
//     const stocks = Array.isArray(body.variantStock) ? body.variantStock : [body.variantStock];
//     const regularPrices = Array.isArray(body.variantRegularPrice) ? body.variantRegularPrice : [body.variantRegularPrice];
//     const salePrices = Array.isArray(body.variantSalePrice) ? body.variantSalePrice : [body.variantSalePrice];

//     // Filter out empty/undefined values
//     const validSizes = sizes.filter(size => size && size.toString().trim() !== '');
//     const validStocks = stocks.filter(stock => stock && stock.toString().trim() !== '');
//     const validRegularPrices = regularPrices.filter(price => price && price.toString().trim() !== '');
//     const validSalePrices = salePrices.filter(price => price && price.toString().trim() !== '');

//     if (!(validSizes.length === validStocks.length && validStocks.length === validRegularPrices.length && validRegularPrices.length === validSalePrices.length)) {
//       req.flash('error', 'Variant data mismatch. Please check all variant fields.');
//       return res.redirect(`/admin/edit-product/${productId}`);
//     }

//     const variants = validSizes.map((size, i) => {
//       const variant = {
//         size: Number(size),
//         stock: Number(validStocks[i]),
//         regularPrice: Number(validRegularPrices[i]),
//         salePrice: Number(validSalePrices[i])
//       };

//       // Validate variant data
//       if (isNaN(variant.size) || variant.size <= 0) {
//         throw new Error(`Invalid size: ${size}`);
//       }
//       if (isNaN(variant.stock) || variant.stock < 0) {
//         throw new Error(`Invalid stock: ${validStocks[i]}`);
//       }
//       if (isNaN(variant.regularPrice) || variant.regularPrice <= 0) {
//         throw new Error(`Invalid regular price: ${validRegularPrices[i]}`);
//       }
//       if (isNaN(variant.salePrice) || variant.salePrice < 0) {
//         throw new Error(`Invalid sale price: ${validSalePrices[i]}`);
//       }

//       return variant;
//     });

//     if (variants.length === 0) {
//       req.flash('error', 'At least one variant is required');
//       return res.redirect(`/admin/edit-product/${productId}`);
//     }

//     // -----------------------------
//     // Handle Images (optional update)
//     // -----------------------------
//     const newImages = req.files && req.files.length > 0 ? req.files.map(f => f.path) : product.images;

//     // -----------------------------
//     // Validate Offer
//     // -----------------------------
//     let productOffer = Number(body.productOffer) || 0;
//     if (productOffer < 0 || productOffer > 100) productOffer = 0;

//     // -----------------------------
//     // Update Product Fields
//     // -----------------------------
//     product.productName = body.productName.trim();
//     product.description = body.description.trim();
//     product.brand = brandObj._id;
//     product.category = categoryObj._id;
//     product.variants = variants;
//     product.images = newImages;
//     product.productOffer = productOffer;

//     // Add updatedAt timestamp
//     product.updatedAt = new Date();

//     // Save the product
//     const savedProduct = await product.save();
    
//     console.log('✅ Product updated successfully:', {
//       id: savedProduct._id,
//       name: savedProduct.productName,
//       variants: savedProduct.variants.length,
//       brand: brandObj.name,
//       category: categoryObj.name
//     });

//     req.flash('success', 'Product updated successfully!');
//     res.redirect('/admin/products');
    
//   } catch (error) {
//     console.error('❌ Error updating product:', error);
    
//     // Check if it's a validation error
//     if (error.name === 'ValidationError') {
//       const errorMessages = Object.values(error.errors).map(err => err.message);
//       req.flash('error', `Validation Error: ${errorMessages.join(', ')}`);
//     } else if (error.message.includes('Invalid')) {
//       req.flash('error', error.message);
//     } else {
//       req.flash('error', 'Something went wrong while updating the product');
//     }
    
//     res.redirect(`/admin/edit-product/${req.params.id}`);
//   }
// });


