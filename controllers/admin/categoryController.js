const Category = require('../../models/categorySchema')
const Product=require("../../models/productSchema")
const mongoose =require('mongoose');
const cloudinary = require('../../config/cloudinary');



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

// const addCategory = async (req, res) => {
//   const { name, description } = req.body;

//   try {
    
//     const existingCategory = await Category.findOne({ name });
//     if (existingCategory) 
//       return res.status(400).json({ error: "Category already exists" });

//     let imageUrl = null;

   
//     if (req.file) {
//       imageUrl = req.file.path; 
//     }

    
//     const newCategory = new Category({
//       name,
//       description,
//       image: imageUrl,
//       isListed: true
//     });

//     await newCategory.save();
//     return res.json({ message: "Category added successfully" });

//   } catch (error) {
//     console.error("Error in addCategory:", error);
//     return res.status(500).json({ error: "Internal Server Error" });
//   }
// };


const addCategory = async (req, res) => {
  try {
    const { name, description } = req.body;
    const trimmedName = name.trim();
    console.log('Received category:', { name: trimmedName, description, image: !!req.file });

    // Check for existing category (case-insensitive)
    const existingCategory = await Category.findOne({
      name: { $regex: `^${trimmedName.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}$`, $options: 'i' }
    });

    if (existingCategory) {
      console.log(`Duplicate category detected: "${trimmedName}" matches "${existingCategory.name}"`);
      return res.status(400).json({ error: 'Category already exists' });
    }

    let imageUrl = null;
    if (req.file) {
      imageUrl = `/uploads/${req.file.filename}`; // Adjust path as per your setup
      console.log('Image uploaded:', imageUrl);
    }

    const newCategory = new Category({
      name: trimmedName,
      description: description.trim(),
      image: imageUrl,
      isListed: true
    });

    await newCategory.save();
    console.log('Category added:', trimmedName);
    return res.status(201).json({ message: 'Category added successfully' });
  } catch (error) {
    console.error('Error in addCategory:', error);
    return res.status(500).json({ error: 'Internal Server Error' });
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

    
    const category = await Category.findById(categoryId);
    if (!category) {
      return res.status(404).json({ status: false, message: "Category not found" });
    }

    const percentage = category.categoryOffer;

   
    const products = await Product.find({ category: categoryId });

    if (products.length > 0) {
      for (const product of products) {
        product.salePrice = product.regularPrice; 
        product.productOffer = 0;
        await product.save();
      }
    }

    
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



// const editCategory = async (req, res) => {
//   try {
//     const id = req.params.id;
//     const { categoryName, description, deleteImage } = req.body;


//     if (!categoryName || categoryName.trim().length < 3) {
//       return res.status(400).json({ error: "Category name is required and must be at least 3 characters" });
//     }

   
//     const existingCategory = await Category.findOne({ name: categoryName, _id: { $ne: id } });
//     if (existingCategory) {
//       return res.status(400).json({ error: "Category exists, choose another name" });
//     }

//     const category = await Category.findById(id);
//     if (!category) return res.status(404).json({ error: "Category not found" });

    
//     if (req.file) {
      
//       if (category.imagePublicId) {
//         try {
//           await cloudinary.uploader.destroy(category.imagePublicId);
//         } catch (err) {
//           console.error("Cloudinary deletion error:", err);
//         }
//       }

      
//       category.image = req.file.path || req.file.location;         
//       category.imagePublicId = req.file.filename || req.file.public_id;
//     }

   
//     if ((deleteImage === 'true' || deleteImage === true) && !req.file && category.imagePublicId) {
//       try {
//         await cloudinary.uploader.destroy(category.imagePublicId);
//       } catch (err) {
//         console.error("Cloudinary deletion error:", err);
//       }
//       category.image = null;
//       category.imagePublicId = null;
//     }

    
//     category.name = categoryName;
//     category.description = description;

//     await category.save();

//     res.json({ success: true, message: "Category updated successfully" });
//   } catch (err) {
//     console.error("Edit Category Error:", err);
//     res.status(500).json({ error: "Internal Server Error" });
//   }
// };

const editCategory = async (req, res) => {
  try {
    const id = req.params.id;
    const { categoryName, description, deleteImage } = req.body;
    const trimmedName = categoryName.trim();
    console.log('Editing category:', { id, name: trimmedName, description, deleteImage, image: !!req.file });

    // Validate category name
    if (!trimmedName || trimmedName.length < 3) {
      console.log('Validation failed: Category name is too short or empty');
      return res.status(400).json({ error: 'Category name is required and must be at least 3 characters' });
    }

    // Check for existing category (case-insensitive, excluding current category)
    const existingCategory = await Category.findOne({
      name: { $regex: `^${trimmedName.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}$`, $options: 'i' },
      _id: { $ne: id }
    });

    if (existingCategory) {
      console.log(`Duplicate category detected: "${trimmedName}" matches "${existingCategory.name}"`);
      return res.status(400).json({ error: 'Category already exists' });
    }

    const category = await Category.findById(id);
    if (!category) {
      console.log(`Category not found: ID ${id}`);
      return res.status(404).json({ error: 'Category not found' });
    }

    // Handle image upload
    if (req.file) {
      if (category.imagePublicId) {
        try {
          await cloudinary.uploader.destroy(category.imagePublicId);
          console.log('Cloudinary image deleted:', category.imagePublicId);
        } catch (err) {
          console.error('Cloudinary deletion error:', err);
        }
      }
      category.image = req.file.path || req.file.location;
      category.imagePublicId = req.file.filename || req.file.public_id;
      console.log('New image uploaded:', category.image);
    }

    // Handle image deletion
    if ((deleteImage === 'true' || deleteImage === true) && !req.file && category.imagePublicId) {
      try {
        await cloudinary.uploader.destroy(category.imagePublicId);
        console.log('Cloudinary image deleted:', category.imagePublicId);
        category.image = null;
        category.imagePublicId = null;
      } catch (err) {
        console.error('Cloudinary deletion error:', err);
      }
    }

    // Update category fields
    category.name = trimmedName;
    category.description = description.trim();
    await category.save();

    console.log('Category updated:', trimmedName);
    res.json({ success: true, message: 'Category updated successfully' });
  } catch (err) {
    console.error('Edit Category Error:', err);
    res.status(500).json({ error: 'Internal Server Error' });
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
  

}