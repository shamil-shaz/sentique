const User = require("../../models/userSchema");
const Category = require("../../models/categorySchema");
const Product = require("../../models/productSchema");
const Brand = require("../../models/brandSchema");
const Wallet = require("../../models/walletSchema");
const mongoose = require("mongoose");
const Review = require("../../models/reviewSchema");

async function attachReviewStats(products) {
  if (!products || products.length === 0) return;

  const productIds = products.map((p) => p._id);

  const reviewStats = await Review.aggregate([
    { $match: { productId: { $in: productIds } } },
    {
      $group: {
        _id: "$productId",
        averageRating: { $avg: "$rating" },
        totalReviews: { $sum: 1 },
      },
    },
  ]);

  const reviewMap = {};
  reviewStats.forEach((r) => {
    reviewMap[r._id.toString()] = {
      averageRating: Number(r.averageRating.toFixed(1)),
      totalReviews: r.totalReviews,
    };
  });

  products.forEach((p) => {
    const id = p._id.toString();
    p.averageRating = reviewMap[id]?.averageRating || 0;
    p.totalReviews = reviewMap[id]?.totalReviews || 0;
  });
}

const loadLandingPage = async (req, res) => {
  try {
    const user = req.session.user || null;
    res.render("landingPage", { user });
  } catch (error) {
    console.error("Landing page error:", error);
    return res.status(500).send("Server error");
  }
};

const loadHomepage = async (req, res) => {
  try {
    const sessionUser = req.session.user;

    const categories = await Category.find({ isListed: true }).lean();
    const listedCategoryIds = categories.map((c) => c._id);

    const brands = await Brand.find({ isBlocked: false }).lean();
    const unblockedBrandIds = brands.map((b) => b._id);

    const fetchProducts = async (filter = {}, sortOption = {}, limit = 4) => {
      const products = await Product.find({
        isBlocked: false,
        category: { $in: listedCategoryIds },
        brand: { $in: unblockedBrandIds },
        "variants.0": { $exists: true },
        ...filter,
      })
        .populate("brand", "brandName brandImage")
        .populate("category", "name categoryImage")
        .sort(sortOption)
        .limit(limit)
        .lean();

      products.forEach((p) => {
        if (p.variants && p.variants.length > 0) {
          p.salePrice = Math.min(
            ...p.variants.map((v) => v.salePrice || v.regularPrice)
          );
          p.regularPrice = Math.max(
            ...p.variants.map((v) => v.regularPrice || v.salePrice)
          );
        } else {
          p.salePrice = p.salePrice || 0;
          p.regularPrice = p.regularPrice || 0;
        }
      });

      return products;
    };

    const [products, newArrivals, bestSelling] = await Promise.all([
      fetchProducts({}, { createdAt: -1 }, 4),
      fetchProducts({}, { createdAt: -1 }, 4),
      fetchProducts({}, { soldCount: -1 }, 4),
    ]);

    await attachReviewStats(products);
    await attachReviewStats(newArrivals);
    await attachReviewStats(bestSelling);

    let userData = null;
    if (sessionUser?.id) {
      userData = await User.findById(sessionUser.id)
        .select("name email phone")
        .lean();
    }

    return res.render("home", {
      user: userData,
      products,
      newArrivals,
      bestSelling,
      categories,
      brands,
    });
  } catch (error) {
    console.error("Home page error:", error);
    return res.status(500).send("Server error");
  }
};

const loadShopingPage = async (req, res) => {
  try {
    const categories = await Category.find({ isListed: true }).lean();
    const listedCategoryIds = categories.map((cat) => cat._id.toString());

    const brands = await Brand.find({ isBlocked: false }).lean();
    const unblockedBrandIds = brands.map((b) => b._id.toString());

    const selectedCategories = Array.isArray(req.query.categorys)
      ? req.query.categorys.filter((catId) => listedCategoryIds.includes(catId))
      : req.query.categorys && listedCategoryIds.includes(req.query.categorys)
      ? [req.query.categorys]
      : [];

    const selectedBrands = Array.isArray(req.query.brands)
      ? req.query.brands.filter((id) => unblockedBrandIds.includes(id))
      : req.query.brands && unblockedBrandIds.includes(req.query.brands)
      ? [req.query.brands]
      : [];

    const sort = req.query.sort || "newest";
    const priceRange = req.query.priceRange || "";
    const page = parseInt(req.query.page) || 1;
    const limit = 12;
    const skip = (page - 1) * limit;

    const filterQuery = {
      isBlocked: false,
      "variants.stock": { $gt: 0 },
    };

    const search = req.query.search ? req.query.search.trim() : "";
    if (search) filterQuery.productName = { $regex: search, $options: "i" };

    filterQuery.category = {
      $in:
        selectedCategories.length > 0
          ? selectedCategories.map((id) => new mongoose.Types.ObjectId(id))
          : listedCategoryIds.map((id) => new mongoose.Types.ObjectId(id)),
    };

    if (selectedBrands.length > 0) {
      filterQuery.brand = {
        $in: selectedBrands.map((id) => new mongoose.Types.ObjectId(id)),
      };
    } else {
      filterQuery.brand = {
        $in: unblockedBrandIds.map((id) => new mongoose.Types.ObjectId(id)),
      };
    }

    if (priceRange) {
      switch (priceRange) {
        case "below1000":
          filterQuery["variants.salePrice"] = { $lt: 1000 };
          break;
        case "1000-2000":
          filterQuery["variants.salePrice"] = { $gte: 1000, $lte: 2000 };
          break;
        case "2000-3000":
          filterQuery["variants.salePrice"] = { $gte: 2000, $lte: 3000 };
          break;
        case "above5000":
          filterQuery["variants.salePrice"] = { $gt: 5000 };
          break;
      }
    }

    let productsAggregation = [
      { $match: filterQuery },

      {
        $addFields: {
          minSalePrice: {
            $min: {
              $map: {
                input: "$variants",
                as: "variant",
                in: {
                  $ifNull: ["$$variant.salePrice", "$$variant.regularPrice"],
                },
              },
            },
          },
        },
      },

      { $sort: {} },
      { $skip: skip },
      { $limit: limit },

      {
        $lookup: {
          from: "brands",
          localField: "brand",
          foreignField: "_id",
          as: "brand",
        },
      },
      { $unwind: "$brand" },

      {
        $lookup: {
          from: "categories",
          localField: "category",
          foreignField: "_id",
          as: "category",
        },
      },
      { $unwind: "$category" },

      {
        $lookup: {
          from: "reviews",
          localField: "_id",
          foreignField: "productId",
          as: "reviews",
        },
      },
      {
        $addFields: {
          totalReviews: { $size: "$reviews" },
          averageRating: {
            $cond: [
              { $gt: [{ $size: "$reviews" }, 0] },
              { $round: [{ $avg: "$reviews.rating" }, 1] },
              0,
            ],
          },
        },
      },

      {
        $lookup: {
          from: "orders",
          let: { productId: "$_id" },
          pipeline: [
            { $match: { paymentStatus: "Paid", orderStatus: "Delivered" } },
            { $unwind: "$items" },
            {
              $match: {
                $expr: { $eq: ["$items.productId", "$$productId"] },
              },
            },
          ],
          as: "orders",
        },
      },
      {
        $addFields: {
          totalBuyers: {
            $size: {
              $setUnion: ["$orders.userId"],
            },
          },
        },
      },
    ];

    let sortStage = {};
    if (sort === "priceLow") sortStage.minSalePrice = 1;
    else if (sort === "priceHigh") sortStage.minSalePrice = -1;
    else if (sort === "nameAZ") sortStage.productName = 1;
    else if (sort === "nameZA") sortStage.productName = -1;
    else sortStage.createdAt = -1;

    productsAggregation[2] = { $sort: sortStage };

    let products = await Product.aggregate(productsAggregation).exec();

    products = products.map((p) => ({ ...p, _id: p._id.toString() }));
    products = products.filter(
      (p) => p.category && p.category.isListed && p.brand && !p.brand.isBlocked
    );

    products.forEach((p) => {
      if (p.variants && p.variants.length > 0) {
        const cheapestVariant = p.variants.reduce(
          (min, cur) => {
            const minPrice = min.salePrice || min.regularPrice || Infinity;
            const curPrice = cur.salePrice || cur.regularPrice || Infinity;
            return curPrice < minPrice ? cur : min;
          },
          { salePrice: Infinity, regularPrice: Infinity }
        );

        p.salePrice =
          cheapestVariant.salePrice || cheapestVariant.regularPrice || 0;
        p.regularPrice =
          cheapestVariant.regularPrice || cheapestVariant.salePrice || 0;
      } else {
        p.salePrice = p.salePrice || 0;
        p.regularPrice = p.regularPrice || 0;
      }
    });

    const totalProducts = await Product.countDocuments(filterQuery);
    const totalPages = Math.ceil(totalProducts / limit);

    res.render("shopPage", {
      products,
      categories,
      brands,
      totalProducts,
      currentPage: page,
      totalPages,
      selectedCategories,
      selectedBrands,
      sort,
      search,
      priceRange,
    });
  } catch (error) {
    console.error("Error in loadShopingPage:", error);
    res.redirect("/pageNotFound");
  }
};

const searchProductsApi = async (req, res) => {
  try {
    const query = req.query.query || "";

    if (!query) {
      return res.json({ success: true, results: [] });
    }

    const products = await Product.find({
      productName: { $regex: query, $options: "i" },
      isBlocked: false,
      "variants.stock": { $gt: 0 },
    })
      .select("productName images variants")
      .limit(5);

    const results = products.map((p) => {
      let price = 0;
      if (p.variants && p.variants.length > 0) {
        const cheapest = p.variants.reduce(
          (min, curr) => {
            const currPrice = curr.salePrice || curr.regularPrice;
            const minPrice = min.salePrice || min.regularPrice || Infinity;
            return currPrice < minPrice ? curr : min;
          },
          { salePrice: Infinity }
        );
        price = cheapest.salePrice || cheapest.regularPrice;
      }

      return {
        id: p._id,
        name: p.productName,
        image:
          p.images && p.images.length > 0
            ? p.images[0]
            : "/images/placeholder.jpg",
        price: price,
      };
    });

    res.json({ success: true, results });
  } catch (error) {
    console.error("Search API Error:", error);
    res.status(500).json({ success: false });
  }
};

const addReview = async (req, res) => {
  try {
    const userId = req.session.user?.id || req.user?._id;

    if (!userId) {
      return res.status(401).json({
        success: false,
        message: "Please login to write a review",
      });
    }

    const { productId, rating, comment } = req.body;

    if (!productId || !rating || !comment?.trim()) {
      return res.status(400).json({
        success: false,
        message: "All fields are required",
      });
    }

    const ratingNum = parseInt(rating);
    if (isNaN(ratingNum) || ratingNum < 1 || ratingNum > 5) {
      return res.status(400).json({
        success: false,
        message: "Rating must be between 1 and 5",
      });
    }

    if (comment.trim().length < 5) {
      return res.status(400).json({
        success: false,
        message: "Review must be at least 5 characters long",
      });
    }

    if (comment.trim().length > 500) {
      return res.status(400).json({
        success: false,
        message: "Review cannot exceed 500 characters",
      });
    }

    const product = await Product.findById(productId);
    if (!product) {
      return res.status(404).json({
        success: false,
        message: "Product not found",
      });
    }

    const existingReview = await Review.findOne({ userId, productId });
    if (existingReview) {
      return res.status(400).json({
        success: false,
        message: "You already reviewed this product",
      });
    }

    const review = await Review.create({
      userId,
      productId,
      rating: ratingNum,
      comment: comment.trim(),
    });

    const allReviews = await Review.find({ productId });

    const totalRating = allReviews.reduce((sum, r) => sum + r.rating, 0);
    const averageRating = (totalRating / allReviews.length).toFixed(1);

    return res.status(201).json({
      success: true,
      message: "Review added successfully",
      review: {
        _id: review._id,
        rating: review.rating,
        comment: review.comment,
        createdAt: review.createdAt,
      },
      productStats: {
        averageRating: parseFloat(averageRating),
        totalReviews: allReviews.length,
      },
    });
  } catch (error) {
    console.error("Review Error:", error);

    if (error.code === 11000) {
      return res.status(400).json({
        success: false,
        message: "You already reviewed this product",
      });
    }

    return res.status(500).json({
      success: false,
      message: "Internal Server Error",
    });
  }
};

const loadProductDetails = async (req, res) => {
  try {
    const productId = req.query.id || req.params.id;

    if (!productId) {
      return res.redirect("/shopPage");
    }

    const product = await Product.findOne({
      _id: productId,
      isBlocked: false,
    })
      .populate({
        path: "brand",
        select: "brandName brandImage",
      })
      .populate({
        path: "category",
        select: "name categoryImage",
      })
      .lean();

    if (!product) {
      return res.redirect("/shopPage");
    }

    const relatedProducts = await Product.find({
      category: product.category._id,
      _id: { $ne: product._id },
      isBlocked: false,
      status: "Available",
    })
      .populate({
        path: "brand",
        select: "brandName",
      })
      .limit(4)
      .lean();

    const reviews = await Review.find({ productId: product._id })
      .populate({
        path: "userId",
        select: "name email",
      })
      .sort({ createdAt: -1 })
      .lean();

    let averageRating = 0;
    const ratingDistribution = { 5: 0, 4: 0, 3: 0, 2: 0, 1: 0 };

    if (reviews.length > 0) {
      const totalRating = reviews.reduce((sum, r) => sum + r.rating, 0);
      averageRating = (totalRating / reviews.length).toFixed(1);

      reviews.forEach((review) => {
        ratingDistribution[review.rating]++;
      });
    }

    let userHasReviewed = false;
    let userReview = null;

    if (req.user?._id || req.session?.user?.id) {
      const userId = req.user?._id || req.session.user?.id;

      userReview = reviews.find((r) => {
        const uid = r.userId?._id || r.userId;
        return uid?.toString() === userId.toString();
      });

      userHasReviewed = !!userReview;
    }

    const ratingPercentage = {};
    Object.keys(ratingDistribution).forEach((star) => {
      ratingPercentage[star] =
        reviews.length > 0
          ? Math.round((ratingDistribution[star] / reviews.length) * 100)
          : 0;
    });

    res.render("productDetails", {
      product,
      relatedProducts,
      reviews,
      averageRating: parseFloat(averageRating),
      totalReviews: reviews.length,
      ratingDistribution,
      ratingPercentage,
      userHasReviewed,
      userReview,
      user: req.user || req.session.user || null,
    });
  } catch (error) {
    console.error("Error loading product details:", error);
    res.redirect("/shopPage");
  }
};

const getProductRating = async (req, res) => {
  try {
    const { productId } = req.params;

    if (!productId) {
      return res.status(400).json({
        success: false,
        message: "Product ID is required",
      });
    }

    const reviews = await Review.find({ productId }).lean();

    let averageRating = 0;
    const ratingDistribution = { 5: 0, 4: 0, 3: 0, 2: 0, 1: 0 };

    if (reviews.length > 0) {
      const totalRating = reviews.reduce((sum, r) => sum + r.rating, 0);
      averageRating = (totalRating / reviews.length).toFixed(1);

      reviews.forEach((review) => {
        ratingDistribution[review.rating]++;
      });
    }

    const ratingPercentage = {};
    Object.keys(ratingDistribution).forEach((star) => {
      ratingPercentage[star] =
        reviews.length > 0
          ? Math.round((ratingDistribution[star] / reviews.length) * 100)
          : 0;
    });

    return res.status(200).json({
      success: true,
      averageRating: parseFloat(averageRating),
      totalReviews: reviews.length,
      ratingDistribution,
      ratingPercentage,
    });
  } catch (error) {
    console.error("Error fetching product rating:", error);
    return res.status(500).json({
      success: false,
      message: "Internal Server Error",
    });
  }
};

module.exports = {
  loadLandingPage,
  loadHomepage,
  loadShopingPage,
  searchProductsApi,
  loadProductDetails,
  addReview,
  getProductRating,
};
