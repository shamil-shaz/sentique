const Category = require("../../models/categorySchema");
const Product = require("../../models/productSchema");
const mongoose = require("mongoose");
const { cloudinary } = require("../../config/cloudinary");

const categoryInfo = async (req, res) => {
  try {
    let search = req.query.search || "";
    const page = parseInt(req.query.page) || 1;
    const limit = 4;
    const skip = (page - 1) * limit;

    const filter = {
      name: { $regex: ".*" + search + ".*", $options: "i" },
    };

    const categoryData = await Category.find(filter)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit);

    const totalCategories = await Category.countDocuments(filter);
    const totalPages = Math.ceil(totalCategories / limit);

    let message = "";
    if (search && totalCategories === 0) {
      message = "No categories found for your search.";
    }

    res.render("category", {
      cat: categoryData,
      currentPage: page,
      totalPages,
      totalCategories,
      search,
      message,
    });
  } catch (error) {
    console.error("Error in categoryInfo:", error);
    res.redirect("/admin/pageerror");
  }
};

const addCategory = async (req, res) => {
  try {
    const { name, description } = req.body;

    if (!name || !description || !req.file) {
      return res
        .status(400)
        .json({ error: "All fields (Name, Description, Image) are required" });
    }

    const trimmedName = name.trim();
    const trimmedDesc = description.trim();

    if (!/^[A-Za-z\s]{3,20}$/.test(trimmedName)) {
      return res.status(400).json({
        error:
          "Category name must only contain letters and be 3–20 characters long",
      });
    }

    if (trimmedDesc.length < 5 || trimmedDesc.length > 50) {
      return res.status(400).json({
        error: "Description must be between 5 and 50 characters",
      });
    }

    const existingCategory = await Category.findOne({
      name: { $regex: `^${trimmedName}$`, $options: "i" },
    });

    if (existingCategory) {
      return res
        .status(400)
        .json({ error: "This category name already exists" });
    }

    const allowedMimeTypes = [
      "image/jpeg",
      "image/png",
      "image/jpg",
      "image/webp",
    ];
    if (!allowedMimeTypes.includes(req.file.mimetype)) {
      return res
        .status(400)
        .json({ error: "Only JPG, JPEG, PNG, and WEBP images are allowed" });
    }

    const result = await cloudinary.uploader.upload(req.file.path, {
      folder: "sentique/categories",
    });

    const newCategory = new Category({
      name: trimmedName,
      description: trimmedDesc,
      image: result.secure_url,
      imagePublicId: result.public_id,
      isListed: true,
    });

    await newCategory.save();

    return res.status(201).json({
      success: true,
      message: "Category added successfully",
    });
  } catch (error) {
    console.error("Error in addCategory:", error);
    return res.status(500).json({ error: "Internal Server Error" });
  }
};

const addCategoryOffer = async (req, res) => {
  try {
    const percentage = parseInt(req.body.percentage);
    const categoryId = req.body.categoryId;

    if (percentage < 0 || percentage > 99) {
      return res.json({
        status: false,
        message: "Offer percentage must be between 0 and 99",
      });
    }

    const category = await Category.findById(categoryId);
    if (!category) {
      return res
        .status(404)
        .json({ status: false, message: "Category not found" });
    }

    const products = await Product.find({ category: category._id });

    await Category.updateOne(
      { _id: categoryId },
      { $set: { categoryOffer: percentage } }
    );

    for (const product of products) {
      const productOffer = product.productOffer || 0;
      const effectiveOffer = Math.max(percentage, productOffer);

      const updatedVariants = product.variants.map((variant) => {
        const discount = Math.floor(
          variant.regularPrice * (effectiveOffer / 100)
        );
        const newSalePrice = variant.regularPrice - discount;

        return {
          ...variant.toObject(),
          salePrice: newSalePrice,
        };
      });

      await Product.updateOne(
        { _id: product._id },
        { $set: { variants: updatedVariants } }
      );

      console.log(
        `Updated product ${product._id} - Category Offer: ${percentage}%, Product Offer: ${productOffer}%, Applied: ${effectiveOffer}%`
      );
    }

    res.json({ status: true, message: "Category offer added successfully" });
  } catch (error) {
    console.error("Error in addCategoryOffer:", error);
    res.status(500).json({ status: false, message: "Internal Server Error" });
  }
};

const removeCategoryOffer = async (req, res) => {
  try {
    const categoryId = req.body.categoryId;

    const category = await Category.findById(categoryId);
    if (!category) {
      return res
        .status(404)
        .json({ status: false, message: "Category not found" });
    }

    const products = await Product.find({ category: categoryId });

    for (const product of products) {
      const productOffer = product.productOffer || 0;

      const updatedVariants = product.variants.map((variant) => {
        let newSalePrice = variant.regularPrice;

        if (productOffer > 0) {
          const discount = Math.floor(
            variant.regularPrice * (productOffer / 100)
          );
          newSalePrice = variant.regularPrice - discount;
        }

        return {
          ...variant.toObject(),
          salePrice: newSalePrice,
        };
      });

      await Product.updateOne(
        { _id: product._id },
        { $set: { variants: updatedVariants } }
      );

      console.log(
        `Removed category offer from product ${product._id} - Product Offer: ${productOffer}%`
      );
    }

    await Category.updateOne(
      { _id: categoryId },
      { $set: { categoryOffer: 0 } }
    );

    return res.json({
      status: true,
      message: "Category offer removed successfully",
    });
  } catch (error) {
    console.error("Error in removeCategoryOffer:", error);
    return res
      .status(500)
      .json({ status: false, message: "Internal Server Error" });
  }
};

const getListCategory = async (req, res) => {
  try {
    const categoryId = req.body.categoryId;
    if (!categoryId) {
      return res.json({ status: false, message: "Category ID is required" });
    }

    await Category.updateOne({ _id: categoryId }, { $set: { isListed: true } });
    res.json({ status: true, message: "Category listed successfully" });
  } catch (error) {
    console.error("Error in getListCategory:", error);
    res.status(500).json({ status: false, message: "Internal Server Error" });
  }
};

const getUnlistCategory = async (req, res) => {
  try {
    const categoryId = req.body.categoryId;
    if (!categoryId) {
      return res.json({ status: false, message: "Category ID is required" });
    }

    await Category.updateOne(
      { _id: categoryId },
      { $set: { isListed: false } }
    );
    res.json({ status: true, message: "Category unlisted successfully" });
  } catch (error) {
    console.error("Error in getUnlistCategory:", error);
    res.status(500).json({ status: false, message: "Internal Server Error" });
  }
};

const getEditCategory = async (req, res) => {
  try {
    const { id } = req.query;

    if (!id) {
      return res.redirect("/pageerror");
    }

    const category = await Category.findById(id);

    if (!category) {
      return res.redirect("/pageerror");
    }

    res.render("edit-category", { category });
  } catch (error) {
    console.error("Edit Category Error:", error.message);
    res.redirect("/pageerror");
  }
};

const editCategory = async (req, res) => {
  try {
    const { categoryName, description } = req.body;
    const id = req.params.id;

    if (!categoryName || !description) {
      return res.status(400).json({
        error: "Name and description are required",
      });
    }

    const trimmedName = categoryName.trim();
    const trimmedDesc = description.trim();

    if (!/^[A-Za-z ]{3,30}$/.test(trimmedName)) {
      return res.status(400).json({
        error:
          "Category name must contain only letters and be 3–30 characters long",
      });
    }

    if (trimmedDesc.length < 3 || trimmedDesc.length > 50) {
      return res.status(400).json({
        error: "Description must be between 3 and 50 characters",
      });
    }

    const existingCategory = await Category.findOne({
      name: { $regex: `^${trimmedName}$`, $options: "i" },
      _id: { $ne: id },
    });

    if (existingCategory) {
      return res.status(400).json({
        error: "Category name already exists",
      });
    }

    const category = await Category.findById(id);
    if (!category) {
      return res.status(404).json({ error: "Category not found" });
    }

    if (req.file) {
      const allowedMimeTypes = [
        "image/jpeg",
        "image/png",
        "image/jpg",
        "image/webp",
      ];
      if (!allowedMimeTypes.includes(req.file.mimetype)) {
        return res.status(400).json({
          error: "Only JPG, JPEG, PNG, WEBP images are allowed",
        });
      }

      if (category.imagePublicId) {
        await cloudinary.uploader.destroy(category.imagePublicId);
      }

      const result = await cloudinary.uploader.upload(req.file.path, {
        folder: "sentique/categories",
      });

      category.image = result.secure_url;
      category.imagePublicId = result.public_id;
    }

    category.name = trimmedName.toLowerCase();
    category.description = trimmedDesc;

    await category.save();

    return res.json({
      success: true,
      message: "Category updated successfully",
    });
  } catch (error) {
    console.error("Error in editCategory:", error);
    return res.status(500).json({ error: "Internal Server Error" });
  }
};

module.exports = {
  categoryInfo,
  addCategory,
  addCategoryOffer,
  removeCategoryOffer,
  getListCategory,
  getUnlistCategory,
  getEditCategory,
  editCategory,
};
