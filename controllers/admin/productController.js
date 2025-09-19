
const Product=require("../../models/productSchema")
const Category=require("../../models/categorySchema")
const User=require("../../models/userSchema")
const Brand=require("../../models/brandSchema");
const fs=require("fs")
const path=require("path");
const sharp=require("sharp");
const mongoose = require("mongoose");


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

const addProducts = async (req, res) => {
  try {
    const products = req.body;
    const productsExist = await Product.findOne({ productName: products.productName });
    if (productsExist) {
      return res.status(400).json("Product already exists, please try with another name");
    }

     const images = req.files.map(file=>file.path);

     let variantsArray = [];
    if (products.variant) {
      variantsArray = products.variant
        .split(",")              // split by comma
        .map(v => v.trim())      // remove spaces
        .map(Number)             // convert to numbers
        .filter(v => !isNaN(v)); // keep only valid numbers
    }
    
    let categoryObj;
    if (mongoose.Types.ObjectId.isValid(products.category)) {
      categoryObj = await Category.findById(products.category);
    } else {
      categoryObj = await Category.findOne({
        $or: [
          { name: products.category },
          { categoryName: products.category }
        ],
        isListed: true
      });
    }

    if (!categoryObj) {
      return res.status(400).json("Invalid category selected");
    }

    let brandObj;
    if (mongoose.Types.ObjectId.isValid(products.brand)) {
      brandObj = await Brand.findById(products.brand);
    } else {
      brandObj = await Brand.findOne({
        $or: [
          { name: products.brand },
          { brandName: products.brand }
        ],
        isBlocked: false
      });
    }

    if (!brandObj) {
      return res.status(400).json("Invalid brand selected");
    }

    const newProduct = new Product({
      productName: products.productName,
      description: products.description,
      brand: brandObj._id,
      category: categoryObj._id,
      regularPrice: Number(products.regularPrice),
      salePrice: Number(products.salePrice),
      quantity: Number(products.stock),
      variant: variantsArray, 
      images: images,
      status: "Available",
    });

    await newProduct.save();
    console.log("Product added successfully:", newProduct);
    return res.redirect('/admin/products');

  } catch (error) {
    console.error("Error saving product:", error);

    if (error.name === 'CastError') {
      return res.status(400).json(`Invalid ${error.path}: ${error.value}`);
    }

    return res.redirect('/pageerror');
  }
};


const getAllProducts = async (req, res) => {
  try {
    const search = req.query.search?.trim() || "";
    const selectedCategory = req.query.category || "";
    const selectedBrand = req.query.brand || "";
    const selectedVariant = req.query.variant || "";
    const page = parseInt(req.query.page) || 1;
    const limit = 4;

     const query = {};

    if (search) {
      query.$or = [
        { productName: { $regex: search, $options: "i" } },
        { description: { $regex: search, $options: "i" } }
      ];
    }

    if (selectedCategory) {
      if (mongoose.Types.ObjectId.isValid(selectedCategory)) {
        query.category = mongoose.Types.ObjectId(selectedCategory);
      } else {
        const categoryByName = await Category.findOne({
          name: new RegExp(`^${selectedCategory}$`, "i"),
          isListed: true
        });
        if (categoryByName) {
          query.category = categoryByName._id;
        }
      }
    }

    // Brand filter
    if (selectedBrand) {
      if (mongoose.Types.ObjectId.isValid(selectedBrand)) {
        query.brand = mongoose.Types.ObjectId(selectedBrand);
      } else {
        const brandByName = await Brand.findOne({
          $or: [
            { brandName: new RegExp(`^${selectedBrand}$`, "i") },
            { name: new RegExp(`^${selectedBrand}$`, "i") }
          ],
          isBlocked: false
        });
        if (brandByName) {
          query.brand = brandByName._id;
        }
      }
    }

     if (selectedVariant) {
      query.variant = { $in: [parseInt(selectedVariant)] };
    }

    console.log("Final Query:", JSON.stringify(query, null, 2));


    const productData = await Product.find(query)
      .populate("category", "name")
      .populate("brand", "brandName")
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(limit)
      .lean();

    const count = await Product.countDocuments(query);
    
    const categories = await Category.find({ isListed: true }).lean();
    const brands = await Brand.find({ isBlocked: false }).lean();

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
    console.error("Error in getAllProducts:", error);
    
    if (error.name === 'CastError') {
      console.error("CastError details:", {
        path: error.path,
        value: error.value,
        kind: error.kind
      });
      req.flash("error", "Invalid filter parameters");
    } else {
      req.flash("error", "Something went wrong while fetching products!");
    }
    
    res.redirect("/admin/products");
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

    console.log("Product data:", {
      id: product._id,
      name: product.productName,
      brandId: product.brand ? product.brand._id : 'No brand',
      brandName: product.brand ? (product.brand.brandName || product.brand.name) : 'No brand name',
      categoryId: product.category ? product.category._id : 'No category',
      categoryName: product.category ? product.category.name : 'No category name'
    });

    const categories = await Category.find({ isListed: true }).lean();
    const brands = await Brand.find({ isBlocked: false }).lean();

    console.log("Available brands:", brands.map(b => ({
      id: b._id.toString(),
      name: b.brandName || b.name
    })));

    const productBrandId = product.brand ? product.brand._id.toString() : null;
    const brandExists = brands.find(b => b._id.toString() === productBrandId);
    
    if (productBrandId && !brandExists) {
      console.warn(`Product's brand (${productBrandId}) not found in active brands list`);
      const blockedBrand = await Brand.findById(productBrandId).lean();
      if (blockedBrand) {
        brands.push(blockedBrand);
        console.log(`Added blocked brand: ${blockedBrand.brandName || blockedBrand.name}`);
      }
    }

    res.render("edit-product", {
      product,
      cat: categories,
      brands
    });

  } catch (error) {
    console.error("Error fetching product for edit:", error);
    
    if (error.name === 'CastError') {
      console.error("CastError details:", {
        path: error.path,
        value: error.value,
        kind: error.kind
      });
      req.flash("error", "Invalid product data");
    } else {
      req.flash("error", "Something went wrong while fetching product details");
    }
    
    res.redirect("/admin/products");
  }
};


const updateProduct = async (req, res) => {
  try {
    const {
      productName,
      description,
      brand,
      category,
      stock,
      variant,
      regularPrice,
      salePrice,
      deletedImages,
      productImagesBase64
    } = req.body;

    console.log("Update request data:", req.body);

    if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
      req.flash('error', 'Invalid Product ID');
      return res.redirect('/admin/products');
    }

    const product = await Product.findById(req.params.id);
    if (!product) {
      req.flash('error', 'Product not found');
      return res.redirect('/admin/products');
    }

    let brandId;
    if (brand) {
      if (mongoose.Types.ObjectId.isValid(brand)) {
        const brandExists = await Brand.findById(brand);
        if (!brandExists) {
          req.flash('error', 'Selected brand does not exist');
          return res.redirect(`/admin/editProduct/${req.params.id}`);
        }
        brandId = brand;
      } else {
        const brandByName = await Brand.findOne({ 
          $or: [
            { brandName: new RegExp(`^${brand}$`, "i") },
            { name: new RegExp(`^${brand}$`, "i") }
          ],
          isBlocked: false 
        });
        
        if (!brandByName) {
          req.flash('error', 'Invalid Brand selected');
          return res.redirect(`/admin/editProduct/${req.params.id}`);
        }
        brandId = brandByName._id;
      }
    }

    let categoryId;
    if (category) {
      if (mongoose.Types.ObjectId.isValid(category)) {
        const categoryExists = await Category.findById(category);
        if (!categoryExists) {
          req.flash('error', 'Selected category does not exist');
          return res.redirect(`/admin/editProduct/${req.params.id}`);
        }
        categoryId = category;
      } else {
        const categoryByName = await Category.findOne({ 
          name: new RegExp(`^${category}$`, "i"),
          isListed: true 
        });
        
        if (!categoryByName) {
          req.flash('error', 'Invalid Category selected');
          return res.redirect(`/admin/editProduct/${req.params.id}`);
        }
        categoryId = categoryByName._id;
      }
    }

    const stockNum = stock !== undefined ? Number(stock) : product.stock;
    const regularPriceNum = regularPrice !== undefined ? Number(regularPrice) : product.regularPrice;
    const salePriceNum = salePrice !== undefined ? Number(salePrice) : product.salePrice;

    if (stockNum < 0 || isNaN(stockNum)) {
      req.flash('error', 'Invalid stock quantity');
      return res.redirect(`/admin/editProduct/${req.params.id}`);
    }

    if (regularPriceNum <= 0 || isNaN(regularPriceNum)) {
      req.flash('error', 'Invalid regular price');
      return res.redirect(`/admin/editProduct/${req.params.id}`);
    }

    if (salePriceNum < 0 || isNaN(salePriceNum)) {
      req.flash('error', 'Invalid sale price');
      return res.redirect(`/admin/editProduct/${req.params.id}`);
    }

    product.productName = productName || product.productName;
    product.description = description || product.description;
    product.brand = brandId || product.brand;
    product.category = categoryId || product.category;
    product.stock = stockNum;
    product.variant = variant !== undefined ? variant : product.variant;
    product.regularPrice = regularPriceNum;
    product.salePrice = salePriceNum;

    product.images = product.images || [];

    if (deletedImages && deletedImages.trim() !== '') {
      try {
        const deletedIndexes = deletedImages.split(',')
          .map(i => parseInt(i.trim()))
          .filter(i => !isNaN(i));
        
        deletedIndexes.sort((a, b) => b - a);
        
        deletedIndexes.forEach(index => {
          if (index >= 0 && index < product.images.length) {
            const fileName = product.images[index];
            if (fileName) {
              const filePath = path.join(__dirname, '../../public/uploads/', fileName);
              if (fs.existsSync(filePath)) {
                try {
                  fs.unlinkSync(filePath);
                  console.log(`Deleted image: ${fileName}`);
                } catch (err) {
                  console.error(`Error deleting image ${fileName}:`, err);
                }
              }
              product.images.splice(index, 1);
            }
          }
        });
      } catch (err) {
        console.error("Error processing deleted images:", err);
      }
    }

    if (productImagesBase64) {
      try {
        const base64Images = Array.isArray(productImagesBase64) 
          ? productImagesBase64 
          : [productImagesBase64];
        
        const uploadsDir = path.join(__dirname, '../../public/uploads/');
        if (!fs.existsSync(uploadsDir)) {
          fs.mkdirSync(uploadsDir, { recursive: true });
        }
        
        for (const b64 of base64Images) {
          if (b64 && b64.trim() !== '') {
            try {
              if (!b64.startsWith('data:image/')) {
                console.warn("Invalid base64 image format");
                continue;
              }
              
              const data = b64.replace(/^data:image\/\w+;base64,/, "");
              const buffer = Buffer.from(data, 'base64');
              const fileName = `product_${Date.now()}_${Math.random().toString(36).substr(2, 9)}.jpg`;
              const filePath = path.join(uploadsDir, fileName);
              
              fs.writeFileSync(filePath, buffer);
              product.images.push(fileName);
              console.log(`Added new image: ${fileName}`);
            } catch (err) {
              console.error("Error processing base64 image:", err);
            }
          }
        }
      } catch (err) {
        console.error("Error handling base64 images:", err);
      }
    }

    if (req.files && req.files.length > 0) {
      req.files.forEach(file => {
        if (file.filename) {
          product.images.push(file.filename);
        }
      });
    }

    if (product.images.length === 0) {
      req.flash('error', 'Product must have at least one image');
      return res.redirect(`/admin/editProduct/${req.params.id}`);
    }

    await product.save();
    req.flash('success', 'Product updated successfully!');
    res.redirect('/admin/products');

  } catch (error) {
    console.error('Update Product Error:', error);
    
    if (error.name === 'ValidationError') {
      const errors = Object.values(error.errors).map(err => err.message);
      req.flash('error', `Validation Error: ${errors.join(', ')}`);
    } else if (error.name === 'CastError') {
      req.flash('error', `Invalid ${error.path}: ${error.value}`);
    } else {
      req.flash('error', 'Something went wrong while updating the product!');
    }
    
    res.redirect('/admin/products');
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
