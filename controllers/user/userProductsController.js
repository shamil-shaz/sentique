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
    const priceRange = req.query.price || "";
    const sort = req.query.sort || "newest";
    
    let effectiveSort = sort;
    if (effectiveSort === "featured") effectiveSort = "newest";

    
    const sentiqueBrand = await Brand.findOne({
      brandName: { $regex: /^Sentique$/i },
      isBlocked: false,
    });
    if (!sentiqueBrand) return res.json({ success: true, products: [] });

    
    const categories = await Category.find({ isListed: true }).lean();


    const query = {
      brand: sentiqueBrand._id,
      isBlocked: false,
    };

   
    if (search) query.productName = { $regex: search, $options: "i" };

 
    const categoryFilters = categoryFilter ? categoryFilter.split(',') : [];
    if (categoryFilters.length > 0) {
      const categoryQueries = categoryFilters.map(cf => {
        if (mongoose.Types.ObjectId.isValid(cf)) {
          return { _id: new mongoose.Types.ObjectId(cf) };
        } else {
          return { name: new RegExp(`^${cf}$`, "i") };
        }
      });
      const foundCategories = await Category.find({ $or: categoryQueries, isListed: true });
      if (foundCategories.length > 0) {
        query.category = { $in: foundCategories.map(c => c._id) };
      }
    }
   
    if (priceRange) {
      let minPrice = 0;
      let maxPrice = Infinity;
      if (priceRange.endsWith('+')) {
        minPrice = parseInt(priceRange.slice(0, -1), 10);
      } else {
        const [minStr, maxStr] = priceRange.split('-');
        minPrice = parseInt(minStr, 10);
        maxPrice = parseInt(maxStr, 10);
      }

      
      query.$expr = {
        $or: [
          { $lte: ["$salePrice", maxPrice] },
          {
            $and: [
              { $ifNull: ["$variants", []] },
              {
                $gt: [
                  {
                    $size: {
                      $filter: {
                        input: "$variants",
                        as: "variant",
                        cond: {
                          $and: [
                            { $gte: ["$$variant.salePrice", minPrice] },
                            { $lte: ["$$variant.salePrice", maxPrice] },
                          ],
                        },
                      },
                    },
                  },
                  0,
                ],
              },
            ],
          },
        ],
      };
      if (minPrice > 0) {
        query.$expr.$or[0].$gte = ["$salePrice", minPrice];
      }
    }
  
    let sortOption = {};
    if (effectiveSort === "price-low") sortOption.salePrice = 1;
    else if (effectiveSort === "price-high") sortOption.salePrice = -1;
    else if (effectiveSort === "name") sortOption.productName = 1;
    else sortOption.createdAt = -1;

    // Fetch products with populated category & brand
    const products = await Product.find(query)
      .populate({ path: "category", match: { isListed: true }, select: "name" })
      .populate({ path: "brand", match: { isBlocked: false }, select: "brandName" })
      .sort(sortOption)
      .lean();

    res.json({ success: true, products });
  } catch (error) {
    console.error("Zodiac page error:", error);
    res.status(500).json({ success: false, message: "Server error" });
  }
};

module.exports = {
  loadZodiacPage,
  getZodiacProducts,
};