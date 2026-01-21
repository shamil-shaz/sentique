const User = require("../../models/userSchema");
const Category = require("../../models/categorySchema");
const Product = require("../../models/productSchema");
const Brand = require("../../models/brandSchema");
const Review = require("../../models/reviewSchema");
const Order = require("../../models/orderSchema");
const mongoose = require("mongoose");

const loadZodiacPage = async (req, res) => {
  try {
    const sentiqueBrand = await Brand.findOne({
      brandName: { $regex: /^Sentique$/i },
      isBlocked: false,
    });

    if (!sentiqueBrand) return res.status(404).send("Sentique brand not found");

    const categories = await Category.find({ isListed: true }).lean();

    let products = await Product.find({
      brand: sentiqueBrand._id,
      isBlocked: false,
    })
      .populate({ path: "category", match: { isListed: true }, select: "name" })
      .populate({
        path: "brand",
        match: { isBlocked: false },
        select: "brandName",
      })
      .lean();

    products = await attachRatingAndBuyers(products);

    res.render("zodiac", { 
    products, 
    categories, 
    search: "", 
    isZodiac: true,
    user: req.user || req.session.user || null 
});
  } catch (error) {
    console.error("Zodiac page error:", error);
    res.status(500).send("Server error");
  }
};

const getZodiacProducts = async (req, res) => {
  try {
    const search = req.query.search?.trim() || "";
    const categoryFilter = req.query.category || "";
    const brandsFilter = req.query.brands || "";
    const priceRange = req.query.price || "";
    const sort = req.query.sort || "newest";

    const sentiqueBrand = await Brand.findOne({
      brandName: { $regex: /^Sentique$/i },
      isBlocked: false,
    });

    if (!sentiqueBrand) {
      return res.json({ success: true, products: [] });
    }

    const query = {
      brand: sentiqueBrand._id,
      isBlocked: false,
    };

    if (search) {
      query.productName = { $regex: search, $options: "i" };
    }

    if (categoryFilter) {
      const catIds = categoryFilter
        .split(",")
        .filter((id) => mongoose.Types.ObjectId.isValid(id));
      if (catIds.length) query.category = { $in: catIds };
    }

    if (brandsFilter) {
      const brandIds = brandsFilter
        .split(",")
        .filter((id) => mongoose.Types.ObjectId.isValid(id));
      if (brandIds.length) query.brand = { $in: brandIds };
    }

    let products = await Product.find(query)
      .populate({ path: "category", match: { isListed: true }, select: "name" })
      .populate({
        path: "brand",
        match: { isBlocked: false },
        select: "brandName",
      })
      .lean();

    products.forEach((p) => {
      let effectivePrice = 0;
      if (p.variants && p.variants.length > 0) {
        const cheapest = p.variants.reduce(
          (min, curr) => {
            const minP = min.salePrice || min.regularPrice || Infinity;
            const currP = curr.salePrice || curr.regularPrice || Infinity;
            return currP < minP ? curr : min;
          },
          { salePrice: Infinity, regularPrice: Infinity }
        );

        effectivePrice = cheapest.salePrice || cheapest.regularPrice || 0;
      } else {
        effectivePrice = p.salePrice || p.regularPrice || p.price || 0;
      }
      p.effectivePrice = effectivePrice;
    });

    if (priceRange) {
      let min = 0,
        max = Infinity;
      if (priceRange.endsWith("+")) min = parseInt(priceRange);
      else if (priceRange.includes("-")) {
        const [a, b] = priceRange.split("-");
        min = parseInt(a);
        max = parseInt(b);
      }
      products = products.filter(
        (p) => p.effectivePrice >= min && p.effectivePrice <= max
      );
    }

    if (sort === "price-low")
      products.sort((a, b) => a.effectivePrice - b.effectivePrice);
    else if (sort === "price-high")
      products.sort((a, b) => b.effectivePrice - a.effectivePrice);
    else if (sort === "name")
      products.sort((a, b) => a.productName.localeCompare(b.productName));
    else
      products.sort((a, b) => (b.createdAt || b._id) - (a.createdAt || a._id));

    products = await attachRatingAndBuyers(products);

    res.json({ success: true, products });
  } catch (error) {
    console.error("Zodiac API error:", error);
    res.status(500).json({ success: false, message: "Server error" });
  }
};

async function attachRatingAndBuyers(products) {
  const productIds = products.map((p) => p._id);

  const reviews = await Review.aggregate([
    { $match: { productId: { $in: productIds } } },
    {
      $group: {
        _id: "$productId",
        averageRating: { $avg: "$rating" },
        totalReviews: { $sum: 1 },
      },
    },
  ]);

  const buyers = await Order.aggregate([
    { $match: { paymentStatus: "Paid", orderStatus: "Delivered" } },
    { $unwind: "$items" },
    { $match: { "items.productId": { $in: productIds } } },
    {
      $group: {
        _id: "$items.productId",
        buyers: { $addToSet: "$userId" },
      },
    },
    {
      $project: {
        totalBuyers: { $size: "$buyers" },
      },
    },
  ]);

  const reviewMap = {};
  reviews.forEach((r) => {
    reviewMap[r._id.toString()] = {
      averageRating: Number(r.averageRating.toFixed(1)),
      totalReviews: r.totalReviews,
    };
  });

  const buyerMap = {};
  buyers.forEach((b) => {
    buyerMap[b._id.toString()] = b.totalBuyers;
  });

  return products.map((p) => {
    const id = p._id.toString();
    p.averageRating = reviewMap[id]?.averageRating || 0;
    p.totalReviews = reviewMap[id]?.totalReviews || 0;
    p.totalBuyers = buyerMap[id] || 0;
    return p;
  });
}

module.exports = {
  loadZodiacPage,
  getZodiacProducts,
};
