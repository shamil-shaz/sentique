
const Product=require("../../models/productSchema")
const Category=require("../../models/categorySchema")
const User=require("../../models/userSchema")
const Brand=require("../../models/brandSchema");
const fs=require("fs")
const path=require("path");
const sharp=require("sharp");
const mongoose = require("mongoose");
const {cloudinary} = require('../../config/cloudinary'); // your config


const getProductAddPage =async(req,res)=>{
    try {
        const category =await Category.find({isListed:true})
        const brand=await Brand.find({isBlocked:false})
        res.render("product-add",{
            category:category,
            brand:brand
        });
        
    } catch (error) {
        res.redirect('/pageerror')
    }
}



// const addProducts = async (req, res) => {
//   try {
//     const products = req.body;

//     // Check if product already exists
//     const productsExist = await Product.findOne({ productName: products.productName });
//     if (productsExist) {
//       return res.status(400).json("Product already exists, please try with another name");
//     }

//     // Save images
//     const images = req.files.map(file => file.path);

//     // Process variants as objects
//     let variantsArray = [];
//     if (
//       products.variantSize &&
//       products.variantStock &&
//       products.variantRegularPrice &&
//       products.variantSalePrice
//     ) {
//       const sizes = Array.isArray(products.variantSize) ? products.variantSize : [products.variantSize];
//       const stocks = Array.isArray(products.variantStock) ? products.variantStock : [products.variantStock];
//       const regularPrices = Array.isArray(products.variantRegularPrice) ? products.variantRegularPrice : [products.variantRegularPrice];
//       const salePrices = Array.isArray(products.variantSalePrice) ? products.variantSalePrice : [products.variantSalePrice];

//       variantsArray = sizes.map((size, index) => ({
//         size: size,
//         stock: Number(stocks[index]) || 0,
//         regularPrice: Number(regularPrices[index]) || 0,
//         salePrice: Number(salePrices[index]) || 0,
//       }));
//     }

//     if (variantsArray.length === 0) {
//       return res.status(400).json("At least one variant is required");
//     }

//     // Validate category
//     let categoryObj;
//     if (mongoose.Types.ObjectId.isValid(products.category)) {
//       categoryObj = await Category.findById(products.category);
//     } else {
//       categoryObj = await Category.findOne({
//         $or: [{ name: products.category }, { categoryName: products.category }],
//         isListed: true,
//       });
//     }
//     if (!categoryObj) return res.status(400).json("Invalid category selected");

//     // Validate brand
//     let brandObj;
//     if (mongoose.Types.ObjectId.isValid(products.brand)) {
//       brandObj = await Brand.findById(products.brand);
//     } else {
//       brandObj = await Brand.findOne({
//         $or: [{ name: products.brand }, { brandName: products.brand }],
//         isBlocked: false,
//       });
//     }
//     if (!brandObj) return res.status(400).json("Invalid brand selected");

//     // Create new product
//     const newProduct = new Product({
//       productName: products.productName,
//       description: products.description,
//       brand: brandObj._id,
//       category: categoryObj._id,
//       productOffer: Number(products.productOffer) || 0,
//       images: images,
//       variants: variantsArray,
//       status: "Available",
//     });

//     await newProduct.save();
//     console.log("✅ Product added successfully:", newProduct);
//     return res.redirect('/admin/products');
//   } catch (error) {
//     console.error("❌ Error saving product:", error);
//     if (error.name === 'CastError') {
//       return res.status(400).json(`Invalid ${error.path}: ${error.value}`);
//     }
//     return res.redirect('/pageerror');
//   }
// };




// const addProducts = async (req, res) => {
//   try {
//     const products = req.body;

//     // -----------------------------
//     // Validate product name
//     // -----------------------------
//     if (!products.productName || products.productName.trim() === "") {
//       req.flash("error", "Product name is required");
//       return res.redirect("/admin/addProducts");
//     }

//     const productsExist = await Product.findOne({ productName: products.productName.trim() });
//     if (productsExist) {
//       req.flash("error", "Product already exists, use a different name");
//       return res.redirect("/admin/addProducts");
//     }

//     // -----------------------------
//     // Handle Images
//     // -----------------------------
//     const images = req.files && req.files.length > 0 ? req.files.map(file => file.path) : [];
//     if (images.length === 0) {
//       req.flash("error", "At least one product image is required");
//       return res.redirect("/admin/addProducts");
//     }

//     // -----------------------------
//     // Validate Variants
//     // -----------------------------
//     let variantsArray = [];
//     if (
//       products.variantSize &&
//       products.variantStock &&
//       products.variantRegularPrice &&
//       products.variantSalePrice
//     ) {
//       const sizes = Array.isArray(products.variantSize) ? products.variantSize : [products.variantSize];
//       const stocks = Array.isArray(products.variantStock) ? products.variantStock : [products.variantStock];
//       const regularPrices = Array.isArray(products.variantRegularPrice) ? products.variantRegularPrice : [products.variantRegularPrice];
//       const salePrices = Array.isArray(products.variantSalePrice) ? products.variantSalePrice : [products.variantSalePrice];

//       if (!(sizes.length === stocks.length && stocks.length === regularPrices.length && regularPrices.length === salePrices.length)) {
//         req.flash("error", "Variant data mismatch. Please check all variant fields.");
//         return res.redirect("/admin/addProducts");
//       }

//       variantsArray = sizes.map((size, index) => ({
//         size: size,
//         stock: Number(stocks[index]) || 0,
//         regularPrice: Number(regularPrices[index]) || 0,
//         salePrice: Number(salePrices[index]) || 0,
//       }));
//     }

//     if (variantsArray.length === 0) {
//       req.flash("error", "At least one variant is required");
//       return res.redirect("/admin/addProducts");
//     }

//     // -----------------------------
//     // Validate Category
//     // -----------------------------
//     let categoryObj = null;
//     if (mongoose.Types.ObjectId.isValid(products.category)) {
//       categoryObj = await Category.findById(products.category);
//     } else {
//       categoryObj = await Category.findOne({
//         $or: [{ name: products.category?.trim() }, { name: products.category?.trim() }],
//         isListed: true,
//       });
//     }

//     if (!categoryObj) {
//       req.flash("error", "Invalid category selected");
//       return res.redirect("/admin/addProducts");
//     }

//     // -----------------------------
//     // Validate Brand
//     // -----------------------------
//     let brandObj = null;
//     if (mongoose.Types.ObjectId.isValid(products.brand)) {
//       brandObj = await Brand.findById(products.brand);
//     } else {
//       brandObj = await Brand.findOne({
//         $or: [{ brandName: products.brand?.trim() }, { brandName: products.brand?.trim() }],
//         isBlocked: false,
//       });
//     }

//     if (!brandObj) {
//       req.flash("error", "Invalid brand selected");
//       return res.redirect("/admin/addProducts");
//     }

//     // -----------------------------
//     // Validate Offer
//     // -----------------------------
//     let productOffer = Number(products.productOffer) || 0;
//     if (productOffer < 0 || productOffer > 100) productOffer = 0;

//     // -----------------------------
//     // Save Product
//     // -----------------------------
//     const newProduct = new Product({
//       productName: products.productName.trim(),
//       description: products.description?.trim(),
//       brand: brandObj._id,
//       category: categoryObj._id,
//       productOffer,
//       images,
//       variants: variantsArray,
//       status: "Available",
//     });

//     await newProduct.save();
//     console.log("✅ Product added successfully:", newProduct.productName);

//     req.flash("success", "Product added successfully!");
//     return res.redirect("/admin/products");

//   } catch (error) {
//     console.error("❌ Error adding product:", error);
//     req.flash("error", "Something went wrong while adding the product");
//     return res.redirect("/admin/addProducts");
//   }
// };



const addProducts = async (req, res) => {
  try {
    const products = req.body;

    // Validate basic fields
    if (!products.productName?.trim()) {
      req.flash("error", "Product name is required");
      return res.redirect("/admin/addProducts");
    }
    if (!products.description?.trim()) {
      req.flash("error", "Product description is required");
      return res.redirect("/admin/addProducts");
    }
    if (!products.Longdescription?.trim()) {
      req.flash("error", "Product Longdescription is required");
      return res.redirect("/admin/addProducts");
    }

    // Validate category
    if (!products.category) {
      req.flash("error", "Category is required");
      return res.redirect("/admin/addProducts");
    }
    const categoryObj = await Category.findById(products.category);
    if (!categoryObj || !categoryObj.isListed) {
      req.flash("error", "Invalid or unavailable category selected");
      return res.redirect("/admin/addProducts");
    }

    // Validate brand
    if (!products.brand) {
      req.flash("error", "Brand is required");
      return res.redirect("/admin/addProducts");
    }
    const brandObj = await Brand.findById(products.brand);
    if (!brandObj || brandObj.isBlocked) {
      req.flash("error", "Invalid or blocked brand selected");
      return res.redirect("/admin/addProducts");
    }

    // Handle variants
    let variantsArray = [];
    if (products.variantSize && products.variantStock && products.variantRegularPrice && products.variantSalePrice) {
      const sizes = Array.isArray(products.variantSize) ? products.variantSize : [products.variantSize];
      const stocks = Array.isArray(products.variantStock) ? products.variantStock : [products.variantStock];
      const regularPrices = Array.isArray(products.variantRegularPrice) ? products.variantRegularPrice : [products.variantRegularPrice];
      const salePrices = Array.isArray(products.variantSalePrice) ? products.variantSalePrice : [products.variantSalePrice];

      if (!(sizes.length === stocks.length && stocks.length === regularPrices.length && regularPrices.length === salePrices.length)) {
        req.flash("error", "Variant data mismatch. Check all variant fields.");
        return res.redirect("/admin/addProducts");
      }

      variantsArray = sizes.map((size, i) => ({
        size: Number(size),
        stock: Number(stocks[i]),
        regularPrice: Number(regularPrices[i]),
        salePrice: Number(salePrices[i]),
      }));
    }

    if (variantsArray.length === 0) {
      req.flash("error", "At least one valid variant is required");
      return res.redirect("/admin/addProducts");
    }

    // Handle images (Cloudinary)
    let images = [];
    if (req.files && req.files.length > 0) {
      for (const file of req.files) {
        const uploaded = await cloudinary.uploader.upload(file.path, { folder: "products" });
        images.push(uploaded.secure_url);
      }
    }

    if (images.length === 0) {
      req.flash("error", "At least one product image is required");
      return res.redirect("/admin/addProducts");
    }

    // Product offer
    let productOffer = Number(products.productOffer) || 0;
    if (productOffer < 0 || productOffer > 100) productOffer = 0;

    // Create product
    const newProduct = new Product({
      productName: products.productName.trim(),
      description: products.description.trim(),
      Longdescription: products.Longdescription.trim(),
      brand: brandObj._id,
      category: categoryObj._id,
      variants: variantsArray,
      images,
      productOffer,
      status: variantsArray.some(v => v.stock > 0) ? "Available" : "Out of stock",
      slug: products.productName.trim().toLowerCase().replace(/[^\w\s-]/g, '').replace(/[\s_-]+/g, '-').replace(/^-+|-+$/g, ''),
    });

    await newProduct.save();
    req.flash("success", "Product added successfully!");
    return res.redirect("/admin/products");

  } catch (error) {
    console.error("❌ Error adding product:", error);
    req.flash("error", error.message || "Something went wrong while adding product");
    return res.redirect("/admin/addProducts");
  }
};








// const getAllProducts = async (req, res) => {
//   try {
//     const search = req.query.search?.trim() || "";
//     const selectedCategory = req.query.category || "";
//     const selectedBrand = req.query.brand || "";
//     const selectedVariant = req.query.variant || "";
//     const page = parseInt(req.query.page) || 1;
//     const limit = 4;

//      const query = {};

//     if (search) {
//       query.$or = [
//         { productName: { $regex: search, $options: "i" } },
//         { description: { $regex: search, $options: "i" } }
//       ];
//     }

//     if (selectedCategory) {
//       if (mongoose.Types.ObjectId.isValid(selectedCategory)) {
//         query.category = mongoose.Types.ObjectId(selectedCategory);
//       } else {
//         const categoryByName = await Category.findOne({
//           name: new RegExp(`^${selectedCategory}$`, "i"),
//           isListed: true
//         });
//         if (categoryByName) {
//           query.category = categoryByName._id;
//         }
//       }
//     }

//     // Brand filter
//     if (selectedBrand) {
//       if (mongoose.Types.ObjectId.isValid(selectedBrand)) {
//         query.brand = mongoose.Types.ObjectId(selectedBrand);
//       } else {
//         const brandByName = await Brand.findOne({
//           $or: [
//             { brandName: new RegExp(`^${selectedBrand}$`, "i") },
//             { name: new RegExp(`^${selectedBrand}$`, "i") }
//           ],
//           isBlocked: false
//         });
//         if (brandByName) {
//           query.brand = brandByName._id;
//         }
//       }
//     }
//  if (selectedVariant) {
//       const variantSize = parseInt(selectedVariant);
//       if (!isNaN(variantSize)) {
//         query["variants.size"] = variantSize; // search inside variant objects
//       }
//     }

//     console.log("Final Query:", JSON.stringify(query, null, 2));


//     const productData = await Product.find(query)
//       .populate("category", "name")
//       .populate("brand", "brandName")
//       .sort({ createdAt: -1 })
//       .skip((page - 1) * limit)
//       .limit(limit)
//       .lean();

//     const count = await Product.countDocuments(query);
    
//     const categories = await Category.find({ isListed: true }).lean();
//     const brands = await Brand.find({ isBlocked: false }).lean();

//     res.render("products", {
//       products: productData,
//       currentPage: page,
//       totalPages: Math.ceil(count / limit),
//       search,
//       selectedCategory,
//       selectedBrand,
//       selectedVariant,
//       cat: categories,
//       brands,
//       successMessage: req.flash("success"),
//       errorMessage: req.flash("error"),
//       totalProducts: count,
//       hasProducts: productData.length > 0
//     });

//   } catch (error) {
//     console.error("Error in getAllProducts:", error);
    
//     if (error.name === 'CastError') {
//       console.error("CastError details:", {
//         path: error.path,
//         value: error.value,
//         kind: error.kind
//       });
//       req.flash("error", "Invalid filter parameters");
//     } else {
//       req.flash("error", "Something went wrong while fetching products!");
//     }
    
//     res.redirect("/admin/products");
//   }
// };




const getAllProducts = async (req, res) => {
  try {
    const search = req.query.search?.trim() || "";
    const selectedCategory = req.query.category || "";
    const selectedBrand = req.query.brand || "";
    const selectedVariant = req.query.variant || "";
    const page = Math.max(parseInt(req.query.page) || 1, 1);
    const limit = 4;

    const query = {};

    // -----------------------------
    // Search
    // -----------------------------
    if (search) {
      query.$or = [
        { productName: { $regex: search, $options: "i" } },
        { description: { $regex: search, $options: "i" } }
      ];
    }

    // -----------------------------
    // Filter Category
    // -----------------------------
    if (selectedCategory) {
      if (mongoose.Types.ObjectId.isValid(selectedCategory)) {
        query.category = mongoose.Types.ObjectId(selectedCategory);
      } else {
        const categoryByName = await Category.findOne({
          name: new RegExp(`^${selectedCategory.trim()}$`, "i"),
          isListed: true
        });
        if (categoryByName) query.category = categoryByName._id;
      }
    }

    // -----------------------------
    // Filter Brand
    // -----------------------------
    if (selectedBrand) {
      if (mongoose.Types.ObjectId.isValid(selectedBrand)) {
        query.brand = mongoose.Types.ObjectId(selectedBrand);
      } else {
        const brandByName = await Brand.findOne({
          $or: [
            { brandName: new RegExp(`^${selectedBrand.trim()}$`, "i") },
            { name: new RegExp(`^${selectedBrand.trim()}$`, "i") }
          ],
          isBlocked: false
        });
        if (brandByName) query.brand = brandByName._id;
      }
    }

    // -----------------------------
    // Filter Variant
    // -----------------------------
    if (selectedVariant) {
      const variantSize = parseInt(selectedVariant);
      if (!isNaN(variantSize)) query["variants.size"] = variantSize;
    }

    console.log("Final Query:", JSON.stringify(query, null, 2));

    // -----------------------------
    // Fetch Products
    // -----------------------------
    const [productData, count, categories, brands] = await Promise.all([
      Product.find(query)
        .populate("category", "name")
        .populate("brand", "brandName")
        .sort({ createdAt: -1 })
        .skip((page - 1) * limit)
        .limit(limit)
        .lean(),

      Product.countDocuments(query),

      Category.find({ isListed: true }).lean(),
      Brand.find({ isBlocked: false }).lean()
    ]);

    res.render("products", {
      products: productData,
      currentPage: page,
      totalPages: Math.ceil(count / limit),
      search,
      selectedCategory,
      selectedBrand,
      selectedVariant,
      cat: categories,
      brands,
      successMessage: req.flash("success"),
      errorMessage: req.flash("error"),
      totalProducts: count,
      hasProducts: productData.length > 0
    });

  } catch (error) {
    console.error("❌ Error fetching products:", error);
    req.flash("error", "Something went wrong while fetching products!");
    return res.redirect("/admin/products");
  }
};



const addProductOffer = async (req, res) => {
  try {
    const { productId, percentage } = req.body; 
    const findProduct = await Product.findOne({ _id: productId });

    if (!findProduct) {
      return res.json({ status: false, message: "Product not found" });
    }

    const findCategory = await Category.findOne({ _id: findProduct.category });

    if (findCategory?.categoryOffer > percentage) {
      return res.json({ status: false, message: "This product's category already has a better offer" });
    }

    findProduct.salePrice = findProduct.regularPrice - Math.floor(findProduct.regularPrice * (percentage / 100));
    findProduct.productOffer = parseInt(percentage);

    await findProduct.save();

    if (findCategory) {
      findCategory.categoryOffer = 0;
      await findCategory.save();
    }

    res.json({ status: true });

  } catch (error) {
    console.error(error);
    res.status(500).json({ status: false, message: "Internal Server Error" });
  }
};


const removeProductOffer = async (req, res) => {
  try {
    const { productId } = req.body;
    const findProduct = await Product.findOne({ _id: productId });

    if (!findProduct) {
      return res.json({ status: false, message: "Product not found" });
    }

    findProduct.salePrice = findProduct.regularPrice;
    findProduct.productOffer = 0;

    await findProduct.save();

    res.json({ status: true });
  } catch (error) {
    console.error(error);
    res.status(500).json({ status: false, message: "Internal Server Error" });
  }
};


const blockProduct = async (req, res) => {
  await Product.findByIdAndUpdate(req.params.id, { isBlocked: true });
  res.redirect('/admin/products');
};

const unblockProduct = async (req, res) => {
  await Product.findByIdAndUpdate(req.params.id, { isBlocked: false });
  res.redirect('/admin/products');
};


// const getEditProductPage = async (req, res) => {
//   try {
//     const productId = req.params.id;

//     if (!mongoose.Types.ObjectId.isValid(productId)) {
//       req.flash("error", "Invalid product ID");
//       return res.redirect("/admin/products");
//     }

//     const product = await Product.findById(productId)
//       .populate('brand', 'brandName name _id')
//       .populate('category', 'name _id')
//       .lean();

//     if (!product) {
//       req.flash("error", "Product not found");
//       return res.redirect("/admin/products");
//     }

//     console.log("Product data:", {
//       id: product._id,
//       name: product.productName,
//       brandId: product.brand ? product.brand._id : 'No brand',
//       brandName: product.brand ? (product.brand.brandName || product.brand.name) : 'No brand name',
//       categoryId: product.category ? product.category._id : 'No category',
//       categoryName: product.category ? product.category.name : 'No category name'
//     });

//     const categories = await Category.find({ isListed: true }).lean();
//     const brands = await Brand.find({ isBlocked: false }).lean();

//     console.log("Available brands:", brands.map(b => ({
//       id: b._id.toString(),
//       name: b.brandName || b.name
//     })));

//     const productBrandId = product.brand ? product.brand._id.toString() : null;
//     const brandExists = brands.find(b => b._id.toString() === productBrandId);
    
//     if (productBrandId && !brandExists) {
//       console.warn(`Product's brand (${productBrandId}) not found in active brands list`);
//       const blockedBrand = await Brand.findById(productBrandId).lean();
//       if (blockedBrand) {
//         brands.push(blockedBrand);
//         console.log(`Added blocked brand: ${blockedBrand.brandName || blockedBrand.name}`);
//       }
//     }

//     res.render("edit-product", {
//       product,
//       cat: categories,
//       brands,
//       variants: product.variants || [] 
//     });

//   } catch (error) {
//     console.error("Error fetching product for edit:", error);
    
//     if (error.name === 'CastError') {
//       console.error("CastError details:", {
//         path: error.path,
//         value: error.value,
//         kind: error.kind
//       });
//       req.flash("error", "Invalid product data");
//     } else {
//       req.flash("error", "Something went wrong while fetching product details");
//     }
    
//     res.redirect("/admin/products");
//   }
// };

// controllers/admin/productController.js (excerpt)



const getEditProductPage = async (req, res) => {
  try {
    const productId = req.params.id;

    if (!mongoose.Types.ObjectId.isValid(productId)) {
      req.flash("error", "Invalid product ID");
      return res.redirect("/admin/products");
    }

    const product = await Product.findById(productId)
      .populate('brand', 'brandName name _id')
      .populate('category', 'name _id')
      .lean();

    if (!product) {
      req.flash("error", "Product not found");
      return res.redirect("/admin/products");
    }

    // ensure variants exists and is an array
    product.variants = Array.isArray(product.variants) ? product.variants : [];

    const categories = await Category.find({ isListed: true }).lean();
    const brands = await Brand.find({ isBlocked: false }).lean();

    // If product uses a brand that is not in active brands (blocked/archived), add it
    const productBrandId = product.brand ? product.brand._id.toString() : null;
    if (productBrandId && !brands.find(b => b._id.toString() === productBrandId)) {
      const blockedBrand = await Brand.findById(productBrandId).lean();
      if (blockedBrand) brands.push(blockedBrand);
    }

    res.render("edit-product", {
      product,
      cat: categories,
      brands,
      variants: product.variants || []
    });
  } catch (error) {
    console.error("Error fetching product for edit:", error);
    req.flash("error", "Something went wrong while fetching product details");
    return res.redirect("/admin/products");
  }
};



const updateProduct = async (req, res) => {
  try {
    const {
      productName,
      description,
      Longdescription,
      brand,
      category,
      deletedImages,       // comma-separated indexes from frontend
      variantSize,
      variantStock,
      variantRegularPrice,
      variantSalePrice,
      productOffer,
      productImagesBase64  // new images from cropper
    } = req.body;

    const productId = req.params.id;
    if (!mongoose.Types.ObjectId.isValid(productId)) {
      req.flash("error", "Invalid Product ID");
      return res.redirect("/admin/products");
    }

    const product = await Product.findById(productId);
    if (!product) {
      req.flash("error", "Product not found");
      return res.redirect("/admin/products");
    }

    // --- Basic fields ---
    if (!productName || !description || !brand || !category || !Longdescription) {
      req.flash("error", "All fields are required!");
      return res.redirect(`/admin/edit-product/${productId}`);
    }

    product.productName = productName.trim();
    product.description = description.trim();
     product.Longdescription = Longdescription.trim();

    // --- Brand ---
    if (mongoose.Types.ObjectId.isValid(brand)) {
      const brandExists = await Brand.findById(brand);
      if (!brandExists) {
        req.flash("error", "Invalid Brand");
        return res.redirect(`/admin/edit-product/${productId}`);
      }
      product.brand = brand;
    }

    // --- Category ---
    if (mongoose.Types.ObjectId.isValid(category)) {
      const categoryExists = await Category.findById(category);
      if (!categoryExists) {
        req.flash("error", "Invalid Category");
        return res.redirect(`/admin/edit-product/${productId}`);
      }
      product.category = category;
    }

    // --- Variants ---
    const sizeArr = Array.isArray(variantSize) ? variantSize : [variantSize];
    const stockArr = Array.isArray(variantStock) ? variantStock : [variantStock];
    const rPriceArr = Array.isArray(variantRegularPrice) ? variantRegularPrice : [variantRegularPrice];
    const sPriceArr = Array.isArray(variantSalePrice) ? variantSalePrice : [variantSalePrice];

    const newVariants = [];
    for (let i = 0; i < sizeArr.length; i++) {
      const sizeVal = Number(sizeArr[i]);
      const stockVal = Number(stockArr[i]) || 0;
      const rPriceVal = Number(rPriceArr[i]) || 1;
      const sPriceVal = Number(sPriceArr[i]) || 0;

      if (sizeVal <= 0) continue;

      newVariants.push({
        size: sizeVal,
        stock: stockVal < 0 ? 0 : stockVal,
        regularPrice: rPriceVal,
        salePrice: sPriceVal > rPriceVal ? rPriceVal : sPriceVal
      });
    }

    if (newVariants.length === 0) {
      req.flash("error", "At least one valid variant is required.");
      return res.redirect(`/admin/edit-product/${productId}`);
    }
    product.variants = newVariants;

    // --- Handle deleted images ---
    let deletedIndexesArr = [];
    if (deletedImages) {
      deletedIndexesArr = deletedImages.split(",").map(i => Number(i));
    }

    if (product.images && product.images.length > 0 && deletedIndexesArr.length > 0) {
      const imagesToDelete = product.images.filter((img, idx) => deletedIndexesArr.includes(idx));
      for (const url of imagesToDelete) {
        try {
          const parts = url.split("/");
          const filename = parts[parts.length - 1];
          const publicId = `products/${filename.split(".")[0]}`;
          await cloudinary.uploader.destroy(publicId);
        } catch (err) {
          console.error("Failed to delete image from Cloudinary:", err);
        }
      }
      // Remove deleted images from DB array
      product.images = product.images.filter((img, idx) => !deletedIndexesArr.includes(idx));
    }

    // --- Upload new images (base64) ---
    if (productImagesBase64) {
      const imagesArr = Array.isArray(productImagesBase64) ? productImagesBase64 : [productImagesBase64];
      for (const base64 of imagesArr) {
        try {
          const result = await cloudinary.uploader.upload(base64, { folder: "products" });
          product.images.push(result.secure_url);
        } catch (err) {
          console.error("Failed to upload image to Cloudinary:", err);
          req.flash("error", "Failed to upload one or more images.");
          return res.redirect(`/admin/edit-product/${productId}`);
        }
      }
    }

    // --- Image validations ---
    if (product.images.length < 1) {
      req.flash("error", "At least one product image is required.");
      return res.redirect(`/admin/edit-product/${productId}`);
    }
    if (product.images.length > 4) {
      req.flash("error", "Maximum 4 images allowed.");
      return res.redirect(`/admin/edit-product/${productId}`);
    }

    // --- Product Offer ---
    let offer = Number(productOffer) || 0;
    if (offer < 0 || offer > 100) offer = 0;
    product.productOffer = offer;

    // --- Slug ---
    product.slug = productName.trim()
      .toLowerCase()
      .replace(/[^\w\s-]/g, '')
      .replace(/[\s_-]+/g, '-')
      .replace(/^-+|-+$/g, '');

    // --- Status & UpdatedAt ---
    product.updatedAt = new Date();
    product.status = product.variants.some(v => v.stock > 0) ? "Available" : "Out of stock";

    // --- Save Product ---
    await product.save();

    req.flash("success", "Product updated successfully!");
    return res.redirect("/admin/products");

  } catch (error) {
    console.error("Update Product Error:", error);
    req.flash("error", "Something went wrong while updating the product!");
    return res.redirect(`/admin/edit-product/${req.params.id}`);
  }
};





const deleteProduct = async (req, res) => {
  try {
    const productId = req.params.id;
    await Product.findByIdAndDelete(productId);
    return res.status(200).json({ success: true });
  } catch (error) {
    console.error("Delete product error:", error);
    return res.status(500).json({ success: false, message: 'Error deleting product' });
  }
};



module.exports = {
  getProductAddPage,
  addProducts,
  getAllProducts,
  addProductOffer,
  removeProductOffer,
  blockProduct,
  unblockProduct,
  getEditProductPage,
  updateProduct,
  deleteProduct,
};
