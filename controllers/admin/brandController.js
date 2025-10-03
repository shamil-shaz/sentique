const Brand = require("../../models/brandSchema");
const Product = require('../../models/productSchema');
const cloudinary = require("cloudinary").v2;
cont = path = require("path");
const fs = require("fs");




const getBrandPage = async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = 5;
    const skip = (page - 1) * limit;

    const brands = await Brand.find().sort({ createdAt: -1 }).skip(skip).limit(limit);
    const totalBrands = await Brand.countDocuments();
    const totalPages = Math.ceil(totalBrands / limit);

    const { success, error } = req.query;

    res.render("brands", {
      data: brands,
      currentPage: page,
      totalPages,
      totalBrands,
      success,
      error
    });
  } catch (err) {
    console.error("Error loading brands:", err.message);
    res.redirect("/pageerror");
  }
};

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

const getBrandList = async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;       
    const limit = 5;                                   
    const skip = (page - 1) * limit;

    const totalBrands = await Brand.countDocuments();
    const totalPages = Math.ceil(totalBrands / limit);

    const brands = await Brand.find()
      .sort({ createdAt: -1 })  
      .skip(skip)
      .limit(limit);

    
    const error = req.query.error || null;

    res.render("admin/brand-list", {
      data: brands,
      currentPage: page,
      totalPages: totalPages,
      error, 
    });
  } catch (error) {
    console.error("Error in getBrandList:", error.message);
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

const blockBrand = async (req, res) => {
  try {
    const { id } = req.query;
    await Brand.updateOne({ _id: id }, { $set: { isBlocked: true } });

    
    res.redirect("/admin/brands?success=Brand unlisted successfully");
  } catch (error) {
    res.redirect("/pageerror");
  }
};

const unBlockBrand = async (req, res) => {
  try {
    const id = req.query.id;
    await Brand.updateOne({ _id: id }, { $set: { isBlocked: false } });

    
    res.redirect("/admin/brands?success=Brand listed successfully");
  } catch (error) {
    console.error("Unblock Brand Error:", error);
    res.redirect("/pageerror");
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
