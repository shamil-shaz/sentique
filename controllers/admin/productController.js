const Product = require("../../models/productSchema");
const Category = require("../../models/categorySchema");
const User = require("../../models/userSchema");
const Brand = require("../../models/brandSchema");
const fs = require("fs");
const path = require("path");
const sharp = require("sharp");
const mongoose = require("mongoose");
const { cloudinary } = require('../../config/cloudinary');



const getProductAddPage = async (req, res) => {
  try {
    const category = await Category.find({ isListed: true });
    const brand = await Brand.find({ isBlocked: false });
    res.render("product-add", {
      category: category,
      brand: brand,
      error: req.flash("error"),
      success: req.flash("success")
    });
  } catch (error) {
    console.error("Error fetching add product page:", error);
    req.flash("error", "Failed to load add product page");
    res.redirect('/pageerror');
  }
};

const addProducts = async (req, res) => {
  try {
    const data = req.body;
    console.log('Received product:', {
      productName: data.productName?.trim(),
      description: data.description?.trim(),
      longDescription: data.longDescription?.trim(),
      brand: data.brand,
      category: data.category,
      imageCount: data.croppedImages?.filter(img => img).length,
      variantCount: Array.isArray(data.variantSize) ? data.variantSize.length : 1
    });

    if (!data.productName?.trim()) throw new Error("Product name is required");
    if (data.productName.trim().length < 3) throw new Error("Product name must be at least 3 characters");
    if (!data.description?.trim()) throw new Error("Short description is required");
    if (data.description.trim().length < 3) throw new Error("Short description must be at least 3 characters");
    if (!data.longDescription?.trim()) throw new Error("Long description is required");
    if (data.longDescription.trim().length < 10) throw new Error("Long description must be at least 10 characters");
    if (!data.brand) throw new Error("Brand is required");
    if (!data.category) throw new Error("Category is required");

    const existingProduct = await Product.findOne({
      productName: { $regex: `^${data.productName.trim().replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}$`, $options: 'i' }
    });
    if (existingProduct) {
      console.log(`Duplicate product detected: "${data.productName.trim()}" matches "${existingProduct.productName}"`);
      throw new Error("Product name already exists");
    }

    const brandObj = await Brand.findById(data.brand);
    const categoryObj = await Category.findById(data.category);
    if (!brandObj) throw new Error("Invalid brand");
    if (!categoryObj) throw new Error("Invalid category");

    if (!data.croppedImages || data.croppedImages.length === 0) throw new Error("At least 2 images are required");
    const validImages = data.croppedImages.filter(img => img);
    if (validImages.length < 2) throw new Error("At least 2 images are required");
    if (validImages.length > 4) throw new Error("Maximum 4 images allowed");

    const images = [];
    for (let base64 of validImages) {
      const upload = await cloudinary.uploader.upload(base64, {
        folder: "sentique/products",
        format: 'jpg'
      });
      images.push(upload.secure_url);
    }

    if (!data.variantSize || !data.variantStock || !data.variantRegularPrice || !data.variantSalePrice) {
      throw new Error("At least one variant is required");
    }

    const sizes = Array.isArray(data.variantSize) ? data.variantSize : [data.variantSize];
    const stocks = Array.isArray(data.variantStock) ? data.variantStock : [data.variantStock];
    const regPrices = Array.isArray(data.variantRegularPrice) ? data.variantRegularPrice : [data.variantRegularPrice];
    const salePrices = Array.isArray(data.variantSalePrice) ? data.variantSalePrice : [data.variantSalePrice];

    if (sizes.length < 1) throw new Error("At least one variant is required");

    const variants = sizes.map((size, i) => ({
      size: Number(size),
      stock: Number(stocks[i]),
      regularPrice: Number(regPrices[i]),
      salePrice: Number(salePrices[i])
    }));

    for (const variant of variants) {
      if (variant.size <= 0) throw new Error("Size must be positive");
      if (variant.stock < 0) throw new Error("Stock cannot be negative");
      if (variant.regularPrice <= 0) throw new Error("Regular price must be positive");
      if (variant.salePrice < 0) throw new Error("Sale price cannot be negative");
      if (variant.salePrice > variant.regularPrice) throw new Error("Sale price must be ≤ regular price");
    }

    const product = new Product({
      productName: data.productName.trim(),
      description: data.description.trim(),
      longDescription: data.longDescription.trim(),
      brand: brandObj._id,
      category: categoryObj._id,
      images,
      variants,
      status: variants.some(v => v.stock > 0) ? "Available" : "Out of stock",
      slug: data.productName.trim().toLowerCase().replace(/[^\w\s-]/g, "").replace(/[\s_-]+/g, "-").replace(/^-+|-+$/g, "")
    });

    await product.save();
    console.log('Product added:', data.productName.trim());
    req.flash("success", "Product added successfully!");

    if (req.get('Accept').includes('application/json')) {
      return res.status(201).json({ message: "Product added successfully" });
    }
    res.redirect("/admin/products");
  } catch (error) {
    console.error("Add product error:", error.message);
    req.flash("error", error.message);

    if (req.get('Accept').includes('application/json')) {
      return res.status(400).json({ error: error.message });
    }
    res.redirect("/admin/addProducts");
  }
};

const getAllProducts = async (req, res) => {
  try {
    const search = req.query.search?.trim() || "";
    const selectedCategory = req.query.category || "";
    const selectedBrand = req.query.brand || "";
    const selectedVariant = req.query.variant || "";
    const page = Math.max(parseInt(req.query.page) || 1, 1);
    const limit = 4;

    const query = {};

    if (search) {
      query.$or = [
        { productName: { $regex: search, $options: "i" } },
        { description: { $regex: search, $options: "i" } }
      ];
    }

    if (selectedCategory) {
      const category = mongoose.Types.ObjectId.isValid(selectedCategory)
        ? await Category.findOne({ _id: selectedCategory, isListed: true })
        : await Category.findOne({ name: new RegExp(`^${selectedCategory}$`, "i"), isListed: true });

      if (category) query.category = category._id;
      else query.category = null;
    }

    if (selectedBrand) {
      const brand = mongoose.Types.ObjectId.isValid(selectedBrand)
        ? await Brand.findOne({ _id: selectedBrand, isBlocked: false })
        : await Brand.findOne({
          $or: [
            { brandName: new RegExp(`^${selectedBrand}$`, "i") },
            { name: new RegExp(`^${selectedBrand}$`, "i") }
          ],
          isBlocked: false
        });

      if (brand) query.brand = brand._id;
      else query.brand = null;
    }

    if (selectedVariant) {
      query["variants.size"] = selectedVariant;
    }

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
    console.error("Error fetching products:", error);
    req.flash("error", "Something went wrong while fetching products!");
    return res.redirect("/admin/products");
  }
};


// const addProductOffer = async (req, res) => {
//   try {
//     const { productId, percentage } = req.body;
//     const percentNum = parseInt(percentage);
    
//     if (percentNum < 0 || percentNum > 99) {
//       return res.json({ status: false, message: "Offer percentage must be between 0 and 99" });
//     }

//     const findProduct = await Product.findOne({ _id: productId });

//     if (!findProduct) {
//       return res.json({ status: false, message: "Product not found" });
//     }

//     const findCategory = await Category.findOne({ _id: findProduct.category });

//     if (findCategory?.categoryOffer > percentNum) {
//       return res.json({ status: false, message: "This product's category already has a better offer" });
//     }

    
//     const updatedVariants = findProduct.variants.map(variant => ({
//       ...variant.toObject(),
//       salePrice: variant.regularPrice - Math.floor(variant.regularPrice * (percentNum / 100))
//     }));

    
//     await Product.updateOne(
//       { _id: productId },
//       {
//         $set: {
//           variants: updatedVariants,
//           productOffer: percentNum
//         }
//       }
//     );
 

//     res.json({ status: true, message: "Product offer added successfully" });
//   } catch (error) {
//     console.error(error);
//     res.status(500).json({ status: false, message: "Internal Server Error" });
//   }
// };

// const removeProductOffer = async (req, res) => {
//   try {
//     const { productId } = req.body;
//     const findProduct = await Product.findOne({ _id: productId });

//     if (!findProduct) {
//       return res.json({ status: false, message: "Product not found" });
//     }

    
//     const updatedVariants = findProduct.variants.map(variant => ({
//       ...variant.toObject(),
//       salePrice: variant.regularPrice
//     }));

   
//     await Product.updateOne(
//       { _id: productId },
//       {
//         $set: {
//           variants: updatedVariants,
//           productOffer: 0
//         }
//       }
//     );

//     console.log(`Product offer removed: ${productId}`);

//     res.json({ status: true, message: "Product offer removed successfully" });
//   } catch (error) {
//     console.error(error);
//     res.status(500).json({ status: false, message: "Internal Server Error" });
//   }
// };







const calculateSalePrice = (regularPrice, productOffer, categoryOffer) => {
  const maxOffer = Math.max(productOffer || 0, categoryOffer || 0);
  if (maxOffer > 0) {
    return regularPrice - Math.floor(regularPrice * (maxOffer / 100));
  }
  return regularPrice;
};



const addProductOffer = async (req, res) => {
  try {
    const { productId, percentage } = req.body;
    const percentNum = parseInt(percentage);
    
    if (percentNum < 0 || percentNum > 99) {
      return res.json({ status: false, message: "Offer percentage must be between 0 and 99" });
    }

    const findProduct = await Product.findOne({ _id: productId });
    if (!findProduct) {
      return res.json({ status: false, message: "Product not found" });
    }

    const findCategory = await Category.findOne({ _id: findProduct.category });
    const categoryOffer = findCategory?.categoryOffer || 0;

    // ✅ NEW VALIDATION: Check if category offer is better
    if (categoryOffer > percentNum) {
      return res.json({ 
        status: false, 
        message: `This product's category already has a better offer of ${categoryOffer}%. Please add an offer higher than ${categoryOffer}%` 
      });
    }

    // Calculate which offer is higher (should be product offer now)
    const effectiveOffer = Math.max(percentNum, categoryOffer);

    const updatedVariants = findProduct.variants.map(variant => ({
      ...variant.toObject(),
      salePrice: variant.regularPrice - Math.floor(variant.regularPrice * (effectiveOffer / 100))
    }));

    // Store the product offer
    await Product.updateOne(
      { _id: productId },
      {
        $set: {
          variants: updatedVariants,
          productOffer: percentNum
        }
      }
    );

    // Success message - product offer is now active
    if (categoryOffer > 0 && percentNum > categoryOffer) {
      return res.json({ 
        status: true, 
        message: `Product offer of ${percentNum}% added successfully! (Higher than category offer of ${categoryOffer}%)` 
      });
    }

    res.json({ status: true, message: "Product offer added successfully" });
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

    // Check if category has an offer
    const findCategory = await Category.findOne({ _id: findProduct.category });
    const categoryOffer = findCategory?.categoryOffer || 0;

    // Update variants - apply category offer if exists, otherwise regular price
    const updatedVariants = findProduct.variants.map(variant => {
      let salePrice = variant.regularPrice;
      
      // Apply category offer if it exists
      if (categoryOffer > 0) {
        salePrice = variant.regularPrice - Math.floor(variant.regularPrice * (categoryOffer / 100));
      }
      
      return {
        ...variant.toObject(),
        salePrice
      };
    });

    await Product.updateOne(
      { _id: productId },
      {
        $set: {
          variants: updatedVariants,
          productOffer: 0
        }
      }
    );

    console.log(`Product offer removed: ${productId}`);

    const message = categoryOffer > 0 
      ? `Product offer removed. Category offer (${categoryOffer}%) is now applied.`
      : "Product offer removed successfully";

    res.json({ status: true, message });
  } catch (error) {
    console.error(error);
    res.status(500).json({ status: false, message: "Internal Server Error" });
  }
};


// const updateProduct = async (req, res) => {
//   try {
//     const {
//       productName,
//       description,
//       longDescription,
//       brand,
//       category,
//       deletedImages,
//       variantSize,
//       variantStock,
//       variantRegularPrice,
//       variantSalePrice, // This comes from form but we'll recalculate it
//       productImagesBase64
//     } = req.body;

//     const productId = req.params.id;
//     if (!mongoose.Types.ObjectId.isValid(productId)) {
//       req.flash("error", "Invalid Product ID");
//       return res.redirect("/admin/products");
//     }

//     const product = await Product.findById(productId);
//     if (!product) {
//       req.flash("error", "Product not found");
//       return res.redirect("/admin/products");
//     }

//     if (!productName?.trim() || !description?.trim() || !longDescription?.trim() || !brand || !category) {
//       req.flash("error", "All fields are required!");
//       return res.redirect(`/admin/edit-product/${productId}`);
//     }

//     const originalName = product.productName;
//     const newName = productName.trim();
//     if (newName !== originalName) {
//       const existing = await Product.findOne({
//         productName: { $regex: `^${newName}$`, $options: 'i' },
//         _id: { $ne: productId }
//       });
//       if (existing) {
//         req.flash("error", "Product name already exists");
//         return res.redirect(`/admin/edit-product/${productId}`);
//       }
//     }

//     product.productName = newName;
//     product.description = description.trim();
//     product.longDescription = longDescription.trim();

//     if (!mongoose.Types.ObjectId.isValid(brand)) {
//       req.flash("error", "Invalid Brand");
//       return res.redirect(`/admin/edit-product/${productId}`);
//     }
//     const brandExists = await Brand.findById(brand);
//     if (!brandExists) {
//       req.flash("error", "Brand not found");
//       return res.redirect(`/admin/edit-product/${productId}`);
//     }
//     product.brand = brand;

//     if (!mongoose.Types.ObjectId.isValid(category)) {
//       req.flash("error", "Invalid Category");
//       return res.redirect(`/admin/edit-product/${productId}`);
//     }
//     const categoryExists = await Category.findById(category);
//     if (!categoryExists) {
//       req.flash("error", "Category not found");
//       return res.redirect(`/admin/edit-product/${productId}`);
//     }
//     product.category = category;

//     // GET CATEGORY OFFER
//     const categoryOffer = categoryExists?.categoryOffer || 0;
//     // PRESERVE EXISTING PRODUCT OFFER
//     const existingProductOffer = product.productOffer || 0;

//     const sizeArr = Array.isArray(variantSize) ? variantSize : [variantSize];
//     const stockArr = Array.isArray(variantStock) ? variantStock : [variantStock];
//     const rPriceArr = Array.isArray(variantRegularPrice) ? variantRegularPrice : [variantRegularPrice];

//     const newVariants = [];
//     for (let i = 0; i < sizeArr.length; i++) {
//       const sizeVal = Number(sizeArr[i]);
//       let stockVal = Number(stockArr[i]) || 0;
//       const rPriceVal = Number(rPriceArr[i]) || 1;

//       if (sizeVal <= 0) continue;
//       if (stockVal < 0) stockVal = 0;

//       // IMPORTANT: Calculate sale price based on offers, not from form input
//       const finalSalePrice = calculateSalePrice(rPriceVal, existingProductOffer, categoryOffer);

//       newVariants.push({
//         size: sizeVal,
//         stock: stockVal,
//         regularPrice: rPriceVal,
//         salePrice: finalSalePrice
//       });
//     }

//     if (newVariants.length === 0) {
//       req.flash("error", "At least one valid variant is required.");
//       return res.redirect(`/admin/edit-product/${productId}`);
//     }
//     product.variants = newVariants;

//     // Handle image deletion
//     let deletedIndexesArr = [];
//     if (deletedImages) {
//       deletedIndexesArr = deletedImages.split(",").map(i => Number(i));
//     }

//     if (product.images && product.images.length && deletedIndexesArr.length) {
//       const imagesToDelete = product.images.filter((img, idx) => deletedIndexesArr.includes(idx));
//       for (const url of imagesToDelete) {
//         try {
//           const parts = url.split("/");
//           const filename = parts[parts.length - 1];
//           const publicId = `sentique/products/${filename.split(".")[0]}`;
//           await cloudinary.uploader.destroy(publicId);
//         } catch (err) {
//           console.error("Failed to delete image from Cloudinary:", err);
//         }
//       }
//       product.images = product.images.filter((img, idx) => !deletedIndexesArr.includes(idx));
//     }

//     // Handle new image uploads
//     if (productImagesBase64) {
//       const imagesArr = Array.isArray(productImagesBase64) ? productImagesBase64 : [productImagesBase64];
//       for (const base64 of imagesArr) {
//         try {
//           const result = await cloudinary.uploader.upload(base64, { 
//             folder: "sentique/products",
//             format: 'jpg'
//           });
//           product.images.push(result.secure_url);
//         } catch (err) {
//           console.error("Failed to upload image to Cloudinary:", err);
//           req.flash("error", "Failed to upload one or more images.");
//           return res.redirect(`/admin/edit-product/${productId}`);
//         }
//       }
//     }

//     if (product.images.length < 1) {
//       req.flash("error", "At least one product image is required.");
//       return res.redirect(`/admin/edit-product/${productId}`);
//     }
//     if (product.images.length > 4) {
//       req.flash("error", "Maximum 4 images allowed.");
//       return res.redirect(`/admin/edit-product/${productId}`);
//     }

//     // PRESERVE THE PRODUCT OFFER - DON'T CHANGE IT
//     // product.productOffer stays the same as before

//     product.slug = product.productName
//       .toLowerCase()
//       .replace(/[^\w\s-]/g, '')
//       .replace(/[\s_-]+/g, '-')
//       .replace(/^-+|-+$/g, '');

//     product.status = product.variants.some(v => v.stock > 0) ? "Available" : "Out of stock";
//     product.updatedAt = new Date();

//     await product.save();

//     req.flash('success', 'Product updated successfully!');
//     res.redirect('/admin/products');
//   } catch (err) {
//     console.error("Update product error:", err);
//     req.flash('error', err.message || 'Something went wrong!');
//     res.redirect(`/admin/edit-product/${req.params.id}`);
//   }
// };

const updateProduct = async (req, res) => {
  try {
    const {
      productName,
      description,
      longDescription,
      brand,
      category,
      deletedImages,
      variantSize,
      variantStock,
      variantRegularPrice,
      variantSalePrice, // Get this from form
      productImagesBase64
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

    // ... (Validation logic for name, brand, category remains same) ...

    if (!productName?.trim() || !description?.trim() || !longDescription?.trim() || !brand || !category) {
      req.flash("error", "All fields are required!");
      return res.redirect(`/admin/edit-product/${productId}`);
    }

    // Check duplicate name
    const originalName = product.productName;
    const newName = productName.trim();
    if (newName !== originalName) {
      const existing = await Product.findOne({
        productName: { $regex: `^${newName}$`, $options: 'i' },
        _id: { $ne: productId }
      });
      if (existing) {
        req.flash("error", "Product name already exists");
        return res.redirect(`/admin/edit-product/${productId}`);
      }
    }

    product.productName = newName;
    product.description = description.trim();
    product.longDescription = longDescription.trim();
    product.brand = brand;
    product.category = category;

    // --- VARIANT UPDATE LOGIC (FIXED) ---
    
    // Ensure arrays to handle single variant case
    const sizeArr = Array.isArray(variantSize) ? variantSize : [variantSize];
    const stockArr = Array.isArray(variantStock) ? variantStock : [variantStock];
    const rPriceArr = Array.isArray(variantRegularPrice) ? variantRegularPrice : [variantRegularPrice];
    const sPriceArr = Array.isArray(variantSalePrice) ? variantSalePrice : [variantSalePrice];

    const newVariants = [];
    for (let i = 0; i < sizeArr.length; i++) {
      const sizeVal = Number(sizeArr[i]);
      let stockVal = Number(stockArr[i]) || 0;
      const rPriceVal = Number(rPriceArr[i]) || 1;
      
      // Get sale price from form, defaulting to 0 if empty/invalid
      let sPriceVal = Number(sPriceArr[i]);
      if (isNaN(sPriceVal)) sPriceVal = 0;

      if (sizeVal <= 0) continue;
      if (stockVal < 0) stockVal = 0;

      // Validation: Sale Price cannot exceed Regular Price
      // If admin enters a higher sale price, cap it at regular price
      if (sPriceVal > rPriceVal) {
        sPriceVal = rPriceVal; 
      }

      newVariants.push({
        size: sizeVal,
        stock: stockVal,
        regularPrice: rPriceVal,
        salePrice: sPriceVal // Use the value from form
      });
    }

    if (newVariants.length === 0) {
      req.flash("error", "At least one valid variant is required.");
      return res.redirect(`/admin/edit-product/${productId}`);
    }
    product.variants = newVariants;

    // ... (Image handling logic remains same) ...
    
    // Handle image deletion
    let deletedIndexesArr = [];
    if (deletedImages) {
      deletedIndexesArr = deletedImages.split(",").map(i => Number(i));
    }

    if (product.images && product.images.length && deletedIndexesArr.length) {
      const imagesToDelete = product.images.filter((img, idx) => deletedIndexesArr.includes(idx));
      for (const url of imagesToDelete) {
        try {
          const parts = url.split("/");
          const filename = parts[parts.length - 1];
          const publicId = `sentique/products/${filename.split(".")[0]}`;
          await cloudinary.uploader.destroy(publicId);
        } catch (err) {
          console.error("Failed to delete image from Cloudinary:", err);
        }
      }
      product.images = product.images.filter((img, idx) => !deletedIndexesArr.includes(idx));
    }

    // Handle new image uploads
    if (productImagesBase64) {
      const imagesArr = Array.isArray(productImagesBase64) ? productImagesBase64 : [productImagesBase64];
      for (const base64 of imagesArr) {
        try {
          const result = await cloudinary.uploader.upload(base64, { 
            folder: "sentique/products",
            format: 'jpg'
          });
          product.images.push(result.secure_url);
        } catch (err) {
          console.error("Failed to upload image to Cloudinary:", err);
          req.flash("error", "Failed to upload one or more images.");
          return res.redirect(`/admin/edit-product/${productId}`);
        }
      }
    }

    if (product.images.length < 1) {
      req.flash("error", "At least one product image is required.");
      return res.redirect(`/admin/edit-product/${productId}`);
    }
    if (product.images.length > 4) {
      req.flash("error", "Maximum 4 images allowed.");
      return res.redirect(`/admin/edit-product/${productId}`);
    }

    // Slug Update
    product.slug = product.productName
      .toLowerCase()
      .replace(/[^\w\s-]/g, '')
      .replace(/[\s_-]+/g, '-')
      .replace(/^-+|-+$/g, '');

    // Status Update
    product.status = product.variants.some(v => v.stock > 0) ? "Available" : "Out of stock";
    product.updatedAt = new Date();

    await product.save();

    req.flash('success', 'Product updated successfully!');
    res.redirect('/admin/products');
  } catch (err) {
    console.error("Update product error:", err);
    req.flash('error', err.message || 'Something went wrong!');
    res.redirect(`/admin/edit-product/${req.params.id}`);
  }
};

const toggleProductStatus = async (req, res) => {
  try {
    const { block } = req.body;
    const productId = req.params.id;

    if (!mongoose.Types.ObjectId.isValid(productId)) {
      return res.json({ success: false, message: "Invalid product ID" });
    }

    const isBlocked = String(block).trim().toLowerCase() === "true";

    const product = await Product.findByIdAndUpdate(
      productId,
      { isBlocked },
      { new: true }
    );

    if (!product) {
      return res.json({ success: false, message: "Product not found" });
    }

    res.json({
      success: true,
      message: isBlocked
        ? "Product unlisted successfully"
        : "Product listed successfully",
      status: product.isBlocked ? "Unlisted" : "Listed"
    });
  } catch (error) {
    console.error("Toggle product status error:", error);
    res.json({ success: false, message: "Failed to update product status" });
  }
};

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

    product.variants = Array.isArray(product.variants) ? product.variants : [];

    const categories = await Category.find({ isListed: true }).lean();
    const brands = await Brand.find({ isBlocked: false }).lean();

    const productBrandId = product.brand ? product.brand._id.toString() : null;
    if (productBrandId && !brands.find(b => b._id.toString() === productBrandId)) {
      const blockedBrand = await Brand.findById(productBrandId).lean();
      if (blockedBrand) brands.push(blockedBrand);
    }

    res.render("edit-product", {
      product,
      cat: categories,
      brands,
      variants: product.variants || [],
      error: req.flash("error"),
      success: req.flash("success")
    });
  } catch (error) {
    console.error("Error fetching product for edit:", error);
    req.flash("error", "Something went wrong while fetching product details");
    return res.redirect("/admin/products");
  }
};

// const updateProduct = async (req, res) => {
//   try {
//     const {
//       productName,
//       description,
//       longDescription,
//       brand,
//       category,
//       deletedImages,
//       variantSize,
//       variantStock,
//       variantRegularPrice,
//       variantSalePrice,
//       productOffer,
//       productImagesBase64
//     } = req.body;

//     const productId = req.params.id;
//     if (!mongoose.Types.ObjectId.isValid(productId)) {
//       req.flash("error", "Invalid Product ID");
//       return res.redirect("/admin/products");
//     }

//     const product = await Product.findById(productId);
//     if (!product) {
//       req.flash("error", "Product not found");
//       return res.redirect("/admin/products");
//     }

//     if (!productName?.trim() || !description?.trim() || !longDescription?.trim() || !brand || !category) {
//       req.flash("error", "All fields are required!");
//       return res.redirect(`/admin/edit-product/${productId}`);
//     }

//     const originalName = product.productName;
//     const newName = productName.trim();
//     if (newName !== originalName) {
//       const existing = await Product.findOne({
//         productName: { $regex: `^${newName}$`, $options: 'i' },
//         _id: { $ne: productId }
//       });
//       if (existing) {
//         req.flash("error", "Product name already exists");
//         return res.redirect(`/admin/edit-product/${productId}`);
//       }
//     }

//     product.productName = newName;
//     product.description = description.trim();
//     product.longDescription = longDescription.trim();

//     if (!mongoose.Types.ObjectId.isValid(brand)) {
//       req.flash("error", "Invalid Brand");
//       return res.redirect(`/admin/edit-product/${productId}`);
//     }
//     const brandExists = await Brand.findById(brand);
//     if (!brandExists) {
//       req.flash("error", "Brand not found");
//       return res.redirect(`/admin/edit-product/${productId}`);
//     }
//     product.brand = brand;

//     if (!mongoose.Types.ObjectId.isValid(category)) {
//       req.flash("error", "Invalid Category");
//       return res.redirect(`/admin/edit-product/${productId}`);
//     }
//     const categoryExists = await Category.findById(category);
//     if (!categoryExists) {
//       req.flash("error", "Category not found");
//       return res.redirect(`/admin/edit-product/${productId}`);
//     }
//     product.category = category;

//     const sizeArr = Array.isArray(variantSize) ? variantSize : [variantSize];
//     const stockArr = Array.isArray(variantStock) ? variantStock : [variantStock];
//     const rPriceArr = Array.isArray(variantRegularPrice) ? variantRegularPrice : [variantRegularPrice];
//     const sPriceArr = Array.isArray(variantSalePrice) ? variantSalePrice : [variantSalePrice];

//     const newVariants = [];
//     for (let i = 0; i < sizeArr.length; i++) {
//       const sizeVal = Number(sizeArr[i]);
//       let stockVal = Number(stockArr[i]) || 0;
//       const rPriceVal = Number(rPriceArr[i]) || 1;
//       const sPriceVal = Number(sPriceArr[i]) || 0;

//       if (sizeVal <= 0) continue;
//       if (stockVal < 0) stockVal = 0;

//       const finalSalePrice = sPriceVal >= rPriceVal ? rPriceVal - 0.01 : sPriceVal;

//       newVariants.push({
//         size: sizeVal,
//         stock: stockVal,
//         regularPrice: rPriceVal,
//         salePrice: finalSalePrice < 0 ? 0 : finalSalePrice
//       });
//     }

//     if (newVariants.length === 0) {
//       req.flash("error", "At least one valid variant is required.");
//       return res.redirect(`/admin/edit-product/${productId}`);
//     }
//     product.variants = newVariants;

//     let deletedIndexesArr = [];
//     if (deletedImages) {
//       deletedIndexesArr = deletedImages.split(",").map(i => Number(i));
//     }

//     if (product.images && product.images.length && deletedIndexesArr.length) {
//       const imagesToDelete = product.images.filter((img, idx) => deletedIndexesArr.includes(idx));
//       for (const url of imagesToDelete) {
//         try {
//           const parts = url.split("/");
//           const filename = parts[parts.length - 1];
//           const publicId = `products/${filename.split(".")[0]}`;
//           await cloudinary.uploader.destroy(publicId);
//         } catch (err) {
//           console.error("Failed to delete image from Cloudinary:", err);
//         }
//       }
//       product.images = product.images.filter((img, idx) => !deletedIndexesArr.includes(idx));
//     }

//     if (productImagesBase64) {
//       const imagesArr = Array.isArray(productImagesBase64) ? productImagesBase64 : [productImagesBase64];
//       for (const base64 of imagesArr) {
//         try {
//           const result = await cloudinary.uploader.upload(base64, { folder: "products" });
//           product.images.push(result.secure_url);
//         } catch (err) {
//           console.error("Failed to upload image to Cloudinary:", err);
//           req.flash("error", "Failed to upload one or more images.");
//           return res.redirect(`/admin/edit-product/${productId}`);
//         }
//       }
//     }

//     if (product.images.length < 1) {
//       req.flash("error", "At least one product image is required.");
//       return res.redirect(`/admin/edit-product/${productId}`);
//     }
//     if (product.images.length > 4) {
//       req.flash("error", "Maximum 4 images allowed.");
//       return res.redirect(`/admin/edit-product/${productId}`);
//     }

//     let offer = Number(productOffer) || 0;
//     if (offer < 0 || offer > 100) offer = 0;
//     product.productOffer = offer;

//     product.slug = product.productName
//       .toLowerCase()
//       .replace(/[^\w\s-]/g, '')
//       .replace(/[\s_-]+/g, '-')
//       .replace(/^-+|-+$/g, '');

//     product.status = product.variants.some(v => v.stock > 0) ? "Available" : "Out of stock";
//     product.updatedAt = new Date();

//     await product.save();

//     req.flash('success', 'Product updated successfully!');
//     res.redirect('/admin/products');
//   } catch (err) {
//     console.error("Update product error:", err);
//     req.flash('error', err.message || 'Something went wrong!');
//     res.redirect(`/admin/edit-product/${req.params.id}`);
//   }
// };

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
  toggleProductStatus,
  getEditProductPage,
  updateProduct,
  deleteProduct
};