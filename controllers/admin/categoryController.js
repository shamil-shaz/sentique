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

const addCategory = async (req, res) => {
  try {
    const { name, description } = req.body;
    const trimmedName = name.trim();
    console.log('Received category:', { name: trimmedName, description, image: !!req.file });

    
    const existingCategory = await Category.findOne({
      name: { $regex: `^${trimmedName.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}$`, $options: 'i' }
    });

    if (existingCategory) {
      console.log(`Duplicate category detected: "${trimmedName}" matches "${existingCategory.name}"`);
      return res.status(400).json({ error: 'Category already exists' });
    }

    let imageUrl = null;
    if (req.file) {
      imageUrl = `/uploads/${req.file.filename}`;
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

// const addCategoryOffer = async (req, res) => {
//   try {
//     const percentage = parseInt(req.body.percentage);
//     const categoryId = req.body.categoryId;
    
//     if (percentage < 0 || percentage > 99) {
//       return res.json({ status: false, message: "Offer percentage must be between 0 and 99" });
//     }

//     const category = await Category.findById(categoryId);
//     if (!category) {
//       return res.status(404).json({ status: false, message: "Category not found" });
//     }

//     const products = await Product.find({ category: category._id });

//     const hasProductOffer = products.some(product => product.productOffer > percentage);
//     if (hasProductOffer) {
//       return res.json({ status: false, message: "A product in this category already has a better offer" });
//     }
    
//     await Category.updateOne({ _id: categoryId }, { $set: { categoryOffer: percentage } });
//     for (const product of products) {
     
//       const updatedVariants = product.variants.map(variant => {
//         const discount = Math.floor(variant.regularPrice * (percentage / 100));
//         const newSalePrice = variant.regularPrice - discount;
        
//         return {
//           ...variant.toObject(),
//           salePrice: newSalePrice
//         };
//       });

//       await Product.updateOne(
//         { _id: product._id },
//         { 
//           $set: { 
//             variants: updatedVariants,
//             productOffer: 0
//           }
//         }
//       );

//       console.log(`Updated product ${product._id} with ${updatedVariants.length} variants - Offer: ${percentage}%`);
//     }

//     res.json({ status: true, message: "Category offer added successfully" });
//   } catch (error) {
//     console.error("Error in addCategoryOffer:", error);
//     res.status(500).json({ status: false, message: "Internal Server Error" });
//   }
// };

const addCategoryOffer = async (req, res) => {
  try {
    const percentage = parseInt(req.body.percentage);
    const categoryId = req.body.categoryId;
    
    if (percentage < 0 || percentage > 99) {
      return res.json({ status: false, message: "Offer percentage must be between 0 and 99" });
    }

    const category = await Category.findById(categoryId);
    if (!category) {
      return res.status(404).json({ status: false, message: "Category not found" });
    }

    const products = await Product.find({ category: category._id });
    
    // Update category offer first
    await Category.updateOne({ _id: categoryId }, { $set: { categoryOffer: percentage } });

    // Update each product with the higher offer (category or product)
    for (const product of products) {
      const productOffer = product.productOffer || 0;
      const effectiveOffer = Math.max(percentage, productOffer);
      
      const updatedVariants = product.variants.map(variant => {
        const discount = Math.floor(variant.regularPrice * (effectiveOffer / 100));
        const newSalePrice = variant.regularPrice - discount;
        
        return {
          ...variant.toObject(),
          salePrice: newSalePrice
        };
      });

      // IMPORTANT: Don't change productOffer - only update variants
      await Product.updateOne(
        { _id: product._id },
        { $set: { variants: updatedVariants } }
      );

      console.log(`Updated product ${product._id} - Category Offer: ${percentage}%, Product Offer: ${productOffer}%, Applied: ${effectiveOffer}%`);
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
      return res.status(404).json({ status: false, message: "Category not found" });
    }
 
    const products = await Product.find({ category: categoryId });

    // Update each product - revert to product offer if exists, else regular price
    for (const product of products) {
      const productOffer = product.productOffer || 0;
      
      const updatedVariants = product.variants.map(variant => {
        let newSalePrice = variant.regularPrice;
        
        // If product has its own offer, apply it
        if (productOffer > 0) {
          const discount = Math.floor(variant.regularPrice * (productOffer / 100));
          newSalePrice = variant.regularPrice - discount;
        }
        
        return {
          ...variant.toObject(),
          salePrice: newSalePrice
        };
      });

      // IMPORTANT: Don't touch productOffer - only update variants
      await Product.updateOne(
        { _id: product._id },
        { $set: { variants: updatedVariants } }
      );

      console.log(`Removed category offer from product ${product._id} - Product Offer: ${productOffer}%`);
    }
    
    // Remove category offer
    await Category.updateOne(
      { _id: categoryId },
      { $set: { categoryOffer: 0 } }
    );

    return res.json({ status: true, message: "Category offer removed successfully" });

  } catch (error) {
    console.error("Error in removeCategoryOffer:", error);
    return res.status(500).json({ status: false, message: "Internal Server Error" });
  }
};


// const removeCategoryOffer = async (req, res) => {
//   try {
//     const categoryId = req.body.categoryId;

//     const category = await Category.findById(categoryId);
//     if (!category) {
//       return res.status(404).json({ status: false, message: "Category not found" });
//     }
 
//     const products = await Product.find({ category: categoryId });

//     for (const product of products) {
//       const updatedVariants = product.variants.map(variant => ({
//         ...variant.toObject(),
//         salePrice: variant.regularPrice
//       }));

//       await Product.updateOne(
//         { _id: product._id },
//         {
//           $set: {
//             variants: updatedVariants,
//             productOffer: 0
//           }
//         }
//       );

//       console.log(`Removed offer from product ${product._id} with ${updatedVariants.length} variants`);
//     }
    
//     await Category.updateOne(
//       { _id: categoryId },
//       { $set: { categoryOffer: 0 } }
//     );

//     return res.json({ status: true, message: "Category offer removed successfully" });

//   } catch (error) {
//     console.error("Error in removeCategoryOffer:", error);
//     return res.status(500).json({ status: false, message: "Internal Server Error" });
//   }
// };

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

    await Category.updateOne({ _id: categoryId }, { $set: { isListed: false } });
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
    const id = req.params.id;
    const { categoryName, description, deleteImage } = req.body;
    const trimmedName = categoryName.trim();
    console.log('Editing category:', { id, name: trimmedName, description, deleteImage, image: !!req.file });
  
    if (!trimmedName || trimmedName.length < 3) {
      console.log('Validation failed: Category name is too short or empty');
      return res.status(400).json({ error: 'Category name is required and must be at least 3 characters' });
    }
  
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