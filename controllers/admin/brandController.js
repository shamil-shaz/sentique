
const Brand = require("../../models/brandSchema");
const Product = require('../../models/productSchema');
const cloudinary = require("cloudinary").v2;
const path = require("path");
const fs = require("fs");

const getAddBrand = async (req, res) => {
  try {
    const error = req.query.error || null;
    const brandName = req.query.brandName || "";
    res.render("add-brand", { error, brandName });
  } catch (err) {
    console.error("Error loading add-brand page:", err);
    res.redirect("/pageerror");
  }
};

const getBrandPage = async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = 5;
    const skip = (page - 1) * limit;

    const search = req.query.search || "";
    const status = req.query.status || ""; 
    
    let filter = {};
 
    if (search) {
      filter.brandName = { $regex: search, $options: "i" };
    }

  
    if (status === "listed") {
      filter.isBlocked = false;
    } else if (status === "unlisted") {
      filter.isBlocked = true;
    }

   
    const brands = await Brand.find(filter)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit);
 
    const totalBrands = await Brand.countDocuments(filter);
    const totalPages = Math.ceil(totalBrands / limit);

   
    const allBrandsCount = await Brand.countDocuments();
    const listedBrandsCount = await Brand.countDocuments({ isBlocked: false });
    const unlistedBrandsCount = await Brand.countDocuments({ isBlocked: true });

    const { success, error } = req.query;

    res.render("brands", {
      data: brands,
      currentPage: page,
      totalPages,
      totalBrands: allBrandsCount,
      listedBrands: listedBrandsCount,
      unlistedBrands: unlistedBrandsCount,
      search,
      status,
      success,
      error,
    });
  } catch (err) {
    console.error("Error loading brands:", err.message);
    res.redirect("/pageerror");
  }
};

const getBrandList = async (req, res) => {
  try {
    const search = req.query.search || "";
    const status = req.query.status || "";
    const page = parseInt(req.query.page) || 1;
    const limit = 5;
    const skip = (page - 1) * limit;
   
    let filter = {};
    
    if (search) {
      filter.brandName = { $regex: search, $options: "i" };
    }

    if (status === "listed") {
      filter.isBlocked = false;
    } else if (status === "unlisted") {
      filter.isBlocked = true;
    }

    const totalBrands = await Brand.countDocuments(filter);
    const totalPages = Math.ceil(totalBrands / limit);

    const brands = await Brand.find(filter)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit);

    const allBrandsCount = await Brand.countDocuments();
    const listedBrandsCount = await Brand.countDocuments({ isBlocked: false });
    const unlistedBrandsCount = await Brand.countDocuments({ isBlocked: true });

    const success = req.query.success || null;
    const error = req.query.error || null;

    res.render("admin/brand-list", {
      data: brands,
      currentPage: page,
      totalPages,
      totalBrands: allBrandsCount,
      listedBrands: listedBrandsCount,
      unlistedBrands: unlistedBrandsCount,
      search,
      status,
      success,
      error,
    });
  } catch (err) {
    console.error("Error in getBrandList:", err.message);
    res.redirect("/pageerror");
  }
};


const blockBrand = async (req, res) => {
  try {
    const { id } = req.query;
    await Brand.updateOne({ _id: id }, { $set: { isBlocked: true } });
 
    const status = req.query.status || "";
    const redirectUrl = status 
      ? `/admin/brands?success=Brand unlisted successfully&status=${status}`
      : "/admin/brands?success=Brand unlisted successfully";
    
    res.redirect(redirectUrl);
  } catch (err) {
    res.redirect("/pageerror");
  }
};

const unBlockBrand = async (req, res) => {
  try {
    const { id } = req.query;
    await Brand.updateOne({ _id: id }, { $set: { isBlocked: false } });
    
    
    const status = req.query.status || "";
    const redirectUrl = status 
      ? `/admin/brands?success=Brand listed successfully&status=${status}`
      : "/admin/brands?success=Brand listed successfully";
    
    res.redirect(redirectUrl);
  } catch (err) {
    res.redirect("/pageerror");
  }
};

const addBrand = async (req, res) => {
  try {
    const { brandName } = req.body;
    const imageFile = req.file;

    if (!brandName || !brandName.trim()) {
      return res.status(400).json({ error: "Brand name is required" });
    }

    if (!imageFile) {
      return res.status(400).json({ error: "Brand logo is required" });
    }

    const existingBrand = await Brand.findOne({
      brandName: { $regex: `^${brandName.trim()}$`, $options: "i" },
    });

    if (existingBrand) {
      return res.status(400).json({ error: "Brand already exists" });
    }

    const result = await cloudinary.uploader.upload(imageFile.path, {
      folder: "brands",
      width: 500,
      height: 500,
      crop: "limit",
    });

    const newBrand = new Brand({
      brandName: brandName.trim(),
      brandImage: [result.secure_url],
      isActive: true,
    });

    await newBrand.save();

    res.status(200).json({ message: "Brand added successfully" });
  } catch (err) {
    console.error("Error adding brand:", err.message);

    if (err.code === 11000) {
      return res.status(400).json({ error: "Brand already exists" });
    }

    res.status(500).json({ error: "Internal Server Error" });
  }
};

module.exports = {
  getBrandPage,
  getAddBrand,
  addBrand,
  getBrandList,
  blockBrand,
  unBlockBrand,
};