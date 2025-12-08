// const User = require("../../models/userSchema");
// const Category = require("../../models/categorySchema");
// const Product = require("../../models/productSchema");
// const Brand = require("../../models/brandSchema");
// const mongoose = require("mongoose");
// const Wishlist=require('../../models/wishlistSchema')

// const loadZodiacPage = async (req, res) => {
//   try {
   
//     const sentiqueBrand = await Brand.findOne({
//       brandName: { $regex: /^Sentique$/i },
//       isBlocked: false,
//     });

//     if (!sentiqueBrand) return res.status(404).send("Sentique brand not found");
    
//     const categories = await Category.find({ isListed: true }).lean();
    
//     const products = await Product.find({
//       brand: sentiqueBrand._id,
//       isBlocked: false,
//     })
//       .populate({ path: "category", match: { isListed: true }, select: "name" })
//       .populate({ path: "brand", match: { isBlocked: false }, select: "brandName" })
//       .lean();

//     res.render("zodiac", { products, categories, search: "" });
//   } catch (error) {
//     console.error("Zodiac page error:", error);
//     res.status(500).send("Server error");
//   }
// };


// const getZodiacProducts = async (req, res) => {
//   try {
//     const search = req.query.search?.trim() || "";
//     const categoryFilter = req.query.category || "";
//     const priceRange = req.query.price || "";
//     const sort = req.query.sort || "newest";
    
//     let effectiveSort = sort;
//     if (effectiveSort === "featured") effectiveSort = "newest";

    
//     const sentiqueBrand = await Brand.findOne({
//       brandName: { $regex: /^Sentique$/i },
//       isBlocked: false,
//     });
//     if (!sentiqueBrand) return res.json({ success: true, products: [] });
    
//     const categories = await Category.find({ isListed: true }).lean();

//     const query = {
//       brand: sentiqueBrand._id,
//       isBlocked: false,
//     };
   
//     if (search) query.productName = { $regex: search, $options: "i" };
 
//     const categoryFilters = categoryFilter ? categoryFilter.split(',') : [];
//     if (categoryFilters.length > 0) {
//       const categoryQueries = categoryFilters.map(cf => {
//         if (mongoose.Types.ObjectId.isValid(cf)) {
//           return { _id: new mongoose.Types.ObjectId(cf) };
//         } else {
//           return { name: new RegExp(`^${cf}$`, "i") };
//         }
//       });
//       const foundCategories = await Category.find({ $or: categoryQueries, isListed: true });
//       if (foundCategories.length > 0) {
//         query.category = { $in: foundCategories.map(c => c._id) };
//       }
//     }
   
//     if (priceRange) {
//       let minPrice = 0;
//       let maxPrice = Infinity;
//       if (priceRange.endsWith('+')) {
//         minPrice = parseInt(priceRange.slice(0, -1), 10);
//       } else {
//         const [minStr, maxStr] = priceRange.split('-');
//         minPrice = parseInt(minStr, 10);
//         maxPrice = parseInt(maxStr, 10);
//       }

      
//       query.$expr = {
//         $or: [
//           { $lte: ["$salePrice", maxPrice] },
//           {
//             $and: [
//               { $ifNull: ["$variants", []] },
//               {
//                 $gt: [
//                   {
//                     $size: {
//                       $filter: {
//                         input: "$variants",
//                         as: "variant",
//                         cond: {
//                           $and: [
//                             { $gte: ["$$variant.salePrice", minPrice] },
//                             { $lte: ["$$variant.salePrice", maxPrice] },
//                           ],
//                         },
//                       },
//                     },
//                   },
//                   0,
//                 ],
//               },
//             ],
//           },
//         ],
//       };
//       if (minPrice > 0) {
//         query.$expr.$or[0].$gte = ["$salePrice", minPrice];
//       }
//     }
  
//     let sortOption = {};
//     if (effectiveSort === "price-low") sortOption.salePrice = 1;
//     else if (effectiveSort === "price-high") sortOption.salePrice = -1;
//     else if (effectiveSort === "name") sortOption.productName = 1;
//     else sortOption.createdAt = -1;
   
//     const products = await Product.find(query)
//       .populate({ path: "category", match: { isListed: true }, select: "name" })
//       .populate({ path: "brand", match: { isBlocked: false }, select: "brandName" })
//       .sort(sortOption)
//       .lean();

//     res.json({ success: true, products });
//   } catch (error) {
//     console.error("Zodiac page error:", error);
//     res.status(500).json({ success: false, message: "Server error" });
//   }
// };


// module.exports = {
//   loadZodiacPage,
//   getZodiacProducts,
// };





const User = require("../../models/userSchema");
const Category = require("../../models/categorySchema");
const Product = require("../../models/productSchema");
const Brand = require("../../models/brandSchema");
const mongoose = require("mongoose");

const loadZodiacPage = async (req, res) => {
  try {
   
    const sentiqueBrand = await Brand.findOne({
      brandName: { $regex: /^Sentique$/i },
      isBlocked: false,
    });

    if (!sentiqueBrand) return res.status(404).send("Sentique brand not found");
    
    const categories = await Category.find({ isListed: true }).lean();
    
    const products = await Product.find({
      brand: sentiqueBrand._id,
      isBlocked: false,
    })
      .populate({ path: "category", match: { isListed: true }, select: "name" })
      .populate({ path: "brand", match: { isBlocked: false }, select: "brandName" })
      .lean();

    res.render("zodiac", { products, categories, search: "" });
  } catch (error) {
    console.error("Zodiac page error:", error);
    res.status(500).send("Server error");
  }
};

const getZodiacProducts = async (req, res) => {
  try {
    const search = req.query.search?.trim() || "";
    const categoryFilter = req.query.category || "";
    const brandsFilter = req.query.brands || ""; // Use 'brands' to match frontend
    const priceRange = req.query.price || "";
    const sort = req.query.sort || "newest";

    // 1. Find the Sentique Brand
    const sentiqueBrand = await Brand.findOne({
      brandName: { $regex: /^Sentique$/i },
      isBlocked: false,
    });

    if (!sentiqueBrand) return res.json({ success: true, products: [] });

    // 2. Build Basic Database Query
    const query = {
      brand: sentiqueBrand._id,
      isBlocked: false,
    };

    // 2a. Search Filter
    if (search) {
      query.productName = { $regex: search, $options: "i" };
    }

    // 2b. Category Filter
    if (categoryFilter) {
      const catIds = categoryFilter.split(',').filter(id => mongoose.Types.ObjectId.isValid(id));
      if (catIds.length > 0) {
        query.category = { $in: catIds };
      }
    }

    // 2c. Brand Filter (If user selects specific sub-brands or collections)
    if (brandsFilter) {
      const brandIds = brandsFilter.split(',').filter(id => mongoose.Types.ObjectId.isValid(id));
      if (brandIds.length > 0) {
        // If specific brands are selected, override the default Sentique check
        // OR check if Sentique is the parent. Assuming simple filter here:
        query.brand = { $in: brandIds };
      }
    }

    // 3. Fetch Products from DB (Without Price/Sort yet)
    let products = await Product.find(query)
      .populate({ path: "category", match: { isListed: true }, select: "name" })
      .populate({ path: "brand", match: { isBlocked: false }, select: "brandName" })
      .lean();

    // 4. Calculate Effective Price for Each Product
    // This logic handles both Simple Products and Products with Variants
    products.forEach(p => {
      let effectivePrice = 0;
      
      if (p.variants && p.variants.length > 0) {
        // Find the lowest price among variants
        const cheapestVariant = p.variants.reduce((min, curr) => {
          const minP = min.salePrice || min.regularPrice || Infinity;
          const currP = curr.salePrice || curr.regularPrice || Infinity;
          return currP < minP ? curr : min;
        }, { salePrice: Infinity, regularPrice: Infinity });
        
        effectivePrice = cheapestVariant.salePrice || cheapestVariant.regularPrice || 0;
      } else {
        effectivePrice = p.salePrice || p.regularPrice || p.price || 0;
      }
      
      // Attach calculated price to the object for filtering/sorting
      p.effectivePrice = effectivePrice;
    });

    // 5. Apply Price Range Filter (in Memory)
    if (priceRange) {
      let min = 0;
      let max = Infinity;

      if (priceRange.endsWith('+')) {
        min = parseInt(priceRange.slice(0, -1));
      } else if (priceRange.includes('-')) {
        const parts = priceRange.split('-');
        min = parseInt(parts[0]);
        max = parseInt(parts[1]);
      }

      products = products.filter(p => p.effectivePrice >= min && p.effectivePrice <= max);
    }

    // 6. Apply Sorting (in Memory)
    if (sort === "price-low") {
      products.sort((a, b) => a.effectivePrice - b.effectivePrice);
    } else if (sort === "price-high") {
      products.sort((a, b) => b.effectivePrice - a.effectivePrice);
    } else if (sort === "name") {
      products.sort((a, b) => a.productName.localeCompare(b.productName));
    } else {
      // Default: Newest first (using _id timestamp or createdAt)
      products.sort((a, b) => (b.createdAt || b._id) - (a.createdAt || a._id));
    }

    // 7. Send Response
    res.json({ success: true, products });

  } catch (error) {
    console.error("Zodiac API error:", error);
    res.status(500).json({ success: false, message: "Server error" });
  }
};

module.exports = {
  loadZodiacPage,
  getZodiacProducts,
};