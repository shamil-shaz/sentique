const Category = require('../../models/categorySchema')
const Product=require("../../models/productSchema")
const mongoose =require('mongoose');



const categoryInfo = async (req, res) => {
  try {
    let search = req.query.search || "";
    const page = parseInt(req.query.page) || 1;
    const limit = 4;
    const skip = (page - 1) * limit;

    const filter = {
      name: { $regex: ".*" + search + ".*", $options: "i" }
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

  const { name, description } = req.body;

  try {
    const existingCategory = await Category.findOne({ name });

    if (existingCategory) {
      return res.status(400).json({ error: "Category already exists" });
    }

    const newCategory = new Category({
      name,
      description,
      isListed: true, // ✅ Fix added here
    });

    await newCategory.save();

    return res.json({ message: "Category added successfully" });

  } catch (error) {
    console.error("Error in addCategory:", error);
    return res.status(500).json({ error: "Internal Server Error" });
  }
};

const addCategoryOffer = async (req, res) => {
  try {
    const percentage = parseInt(req.body.percentage);
    const categoryId = req.body.categoryId;

    const category = await Category.findById(categoryId);
    if (!category) {
      return res.status(404).json({ status: false, message: "Category not found" });
    }

    const products = await Product.find({ category: category._id });

    const hasProductOffer = products.some(product => product.productOffer > percentage);
    if (hasProductOffer) {
      return res.json({ status: false, message: "A product in this category already has a better offer" });
    }

    // ✅ Corrected this line:
    await Category.updateOne({ _id: categoryId }, { $set: { categoryOffer: percentage } });

    for (const product of products) {
      product.productOffer = 0;
      product.salePrice = product.regularPrice - Math.floor(product.regularPrice * (percentage / 100));
      await product.save();
    }

    res.json({ status: true, message: "Category offer added successfully" });
  } catch (error) {
    console.error(error);
    res.status(500).json({ status: false, message: "Internal Server Error" });
  }
};

const removeCategoryOffer = async (req, res) => {
  try {
    const categoryId = req.body.categoryId;

    // 1️⃣ Check if category exists
    const category = await Category.findById(categoryId);
    if (!category) {
      return res.status(404).json({ status: false, message: "Category not found" });
    }

    const percentage = category.categoryOffer;

    // 2️⃣ Fetch all products in this category
    const products = await Product.find({ category: categoryId });

    if (products.length > 0) {
      for (const product of products) {
        product.salePrice = product.regularPrice; // Reset to original price
        product.productOffer = 0; // Remove product-level offer
        await product.save();
      }
    }

    // 3️⃣ Remove the category offer
    category.categoryOffer = 0;
    await category.save();

    return res.json({ status: true, message: "Category offer removed successfully" });

  } catch (error) {
    console.error("Error in removeCategoryOffer:", error);
    return res.status(500).json({ status: false, message: "Internal Server Error" });
  }
};

const getUnlistCategory = async (req, res) => {
  try {
    let id = req.query.id;
    await Category.updateOne({ _id: id }, { $set: { isListed: true } });
    req.session.flashMessage = 'listed'; 
    res.redirect("/admin/category");
  } catch (error) {
    res.redirect("/pageerror");
  }
};

const getListCategory = async (req, res) => {
  try {
    let id = req.query.id;
    await Category.updateOne({ _id: id }, { $set: { isListed: false } });
    req.session.flashMessage = 'unlisted'; 
    res.redirect("/admin/category");
  } catch (error) {
    res.redirect("/pageerror");
  }
};

const getEditCategory = async (req, res) => {
  try {
    const { id } = req.query;

    if (!id) {
      return res.redirect("/pageerror"); // Prevent DB call without ID
    }

   const category = await Category.findById(id);


    if (!category) {
      return res.redirect("/pageerror"); // If category not found
    }

res.render("edit-category", { category });


  } catch (error) {
    console.error("Edit Category Error:", error.message);
    res.redirect("/pageerror");
  }
};

const editCategory = async (req, res) => {
  try {
    const id = req.params.id;
    const { categoryName, description } = req.body;

     if (!categoryName) {
      return res.status(400).json({ error: "Category name is required" });
    }

    const existingCategory = await Category.findOne({ name: categoryName, _id: { $ne: id } });

    if (existingCategory) {
      return res.status(400).json({ error: "Category exists, please choose another name" });
    }

    const updatedCategory = await Category.findByIdAndUpdate(
      id,
      {
        name: categoryName,
        description: description,
      },
      { new: true }
    );

    if (updatedCategory) {
      res.redirect("/admin/category?edited=true");

    } else {
      res.status(404).json({ error: "Category not found" });
    }

  } catch (error) {
    console.error("Edit Category Error:", error.message);
    res.status(500).json({ error: "Internal Server Error" });
  }
};

   const deleteCategory = async (req, res) => {
  try {
    const id = req.body.id;

    if (!id || !mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ success: false, message: "Invalid category ID" });
    }

    await Category.findByIdAndDelete(id);

    return res.json({ success: true, message: "Category deleted successfully" });
  } catch (error) {
    console.error("Delete Category Error:", error);
    return res.status(500).json({ success: false, message: "Something went wrong while deleting the category" });
  }
};

module.exports={
    categoryInfo,
    addCategory,
    addCategoryOffer,
    removeCategoryOffer,
    getListCategory,
    getUnlistCategory,
    getEditCategory,
    editCategory,
    deleteCategory ,

}