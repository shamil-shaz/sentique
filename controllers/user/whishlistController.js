const Wishlist = require("../../models/wishlistSchema");
const Product = require("../../models/productSchema");
const Cart = require("../../models/cartSchema");
const User = require("../../models/userSchema");
const mongoose = require("mongoose");

const loadWishlist = async (req, res) => {
  try {
    const userId = req.session.user?.id || req.session.user?._id;
    if (!userId) {
      console.log("User not logged in, redirecting...");
      return res.redirect("/login");
    }

    const page = parseInt(req.query.page) || 1;
    const limit = 8;
    const skip = (page - 1) * limit;

    const wishlist = await Wishlist.findOne({ userId })
      .populate({
        path: "products.productId",
        select:
          "productName price salePrice brand category images discount stock variants isBlocked status",
        populate: [
          { path: "brand", select: "brandName isBlocked" },
          { path: "category", select: "name isListed" },
        ],
      })
      .exec();
    const wishlistItems = wishlist ? wishlist.products : [];

   const validItems = wishlistItems.filter(item => {
  const p = item.productId;
  if (!p) return false;
  const outOfStock = p.variants && p.variants.every(v => v.stock <= 0);
  const unavailable =
    p.isBlocked ||
    p.status !== "Available" ||
    (p.category && p.category.isListed === false) ||
    (p.brand && p.brand.isBlocked === true) ||
    outOfStock;

  return true; // keep all in wishlist but we handle UI differently
});

    const totalItems = validItems.length;

    const totalPages = Math.ceil(totalItems / limit);
    const paginatedItems = validItems.slice(skip, skip + limit);

    console.log("Wishlist Items:", JSON.stringify(paginatedItems, null, 2));
    console.log("Pagination:", { page, limit, totalItems, totalPages });

    res.render("wishlist", {
      wishlistItems: paginatedItems,
      totalItems,
      totalPages,
      currentPage: page,
    });
  } catch (err) {
    console.error("Load wishlist error:", err.message, err.stack);
    res.redirect("/pageNotFound");
  }
};

const addToWishlist = async (req, res) => {
  try {
    const userId = req.session.user?.id || req.session.user?._id;
    const { productId } = req.body;
    console.log("Add to wishlist request:", { userId, productId });

    if (!userId) {
      console.log("No userId in session");
      return res.json({ success: false, message: "Please login first" });
    }

    if (!productId || productId.length !== 24) {
      console.log("Invalid productId:", productId);
      return res.json({ success: false, message: "Invalid product ID" });
    }

    const product = await Product.findById(productId);
    if (!product) {
      console.log("Product not found for productId:", productId);
      return res.json({ success: false, message: "Product not found" });
    }

    if (!product.variants || product.variants.length === 0) {
      console.log("Product has no variants:", productId);
      return res.json({ success: false, message: "Product has no variants" });
    }

    let wishlist = await Wishlist.findOne({ userId });

    if (!wishlist) {
      console.log("Creating new wishlist for userId:", userId);
      wishlist = new Wishlist({ userId, products: [] });
    }

    if (wishlist.products.some((p) => p.productId.toString() === productId)) {
      console.log("Product already in wishlist:", productId);
      return res.json({ success: false, message: "Already in wishlist" });
    }

    wishlist.products.push({
      productId,
      variantSize: req.body.variantSize || null,
    });

    await wishlist.save();
    console.log("Wishlist updated:", JSON.stringify(wishlist, null, 2));

    res.json({ success: true, message: "Product added to wishlist" });
  } catch (error) {
    console.error("Add to wishlist error:", error.message, error.stack);
    res.json({ success: false, message: "Server error" });
  }
};

const removeFromWishlist = async (req, res) => {
  try {
    const userId = req.session.user?.id || req.session.user?._id;
    const productId = req.params.id;

    console.log("Remove from wishlist request:", { userId, productId });

    if (!userId) {
      return res
        .status(401)
        .json({ success: false, message: "Please login first" });
    }

    if (!mongoose.Types.ObjectId.isValid(productId)) {
      return res
        .status(400)
        .json({ success: false, message: "Invalid product ID" });
    }

    const wishlist = await Wishlist.findOne({ userId });
    if (!wishlist) {
      return res
        .status(404)
        .json({ success: false, message: "Wishlist not found" });
    }

    const initialLength = wishlist.products.length;
    wishlist.products = wishlist.products.filter(
      (item) => item.productId.toString() !== productId
    );

    if (wishlist.products.length === initialLength) {
      return res
        .status(404)
        .json({ success: false, message: "Product not found in wishlist" });
    }

    await wishlist.save();
    console.log("Wishlist updated:", wishlist.products);
    res.json({ success: true, message: "Item removed from wishlist" });
  } catch (err) {
    console.error("Remove from wishlist error:", err);
    res
      .status(500)
      .json({ success: false, message: "Server error", error: err.message });
  }
};

const moveAllToCart = async (req, res) => {
  try {
    const userId = req.session.user?.id || req.session.user?._id;
    console.log("Move all to cart request for userId:", userId);

    if (!userId) {
      return res
        .status(401)
        .json({ success: false, message: "Login required" });
    }

    const wishlist = await Wishlist.findOne({ userId }).populate(
      "products.productId"
    );

    if (!wishlist || wishlist.products.length === 0) {
      return res.json({ success: false, message: "Wishlist empty" });
    }

    let cart = await Cart.findOne({ userId });
    if (!cart) cart = new Cart({ userId, items: [] });

    const variantsMap = req.body?.variantsMap || {};
    console.log("UI Variant Map:", variantsMap);

    let skippedItems = 0;

    for (let wishlistItem of wishlist.products) {
      const product = wishlistItem.productId;
      if (!product) continue;

    if (
  product.isBlocked ||
  product.status !== "Available" ||
  !product.variants ||
  product.variants.length === 0 ||
  product.variants.every(v => v.stock <= 0)
) {
  skippedItems++;
  continue;
}


      let selectedVariant = null;
      const productIdStr = String(product._id);

      // 1️⃣ UI selected variant (Highest priority)
      if (variantsMap[productIdStr]) {
        const uiSize = variantsMap[productIdStr];
        selectedVariant = product.variants.find(
          (v) => String(v.size) === String(uiSize)
        );
      }

      // 2️⃣ DB stored variant in wishlist
      if (!selectedVariant && wishlistItem.variantSize) {
        selectedVariant = product.variants.find(
          (v) => String(v.size) === String(wishlistItem.variantSize)
        );
      }

      // 3️⃣ Fallback: cheapest variant
      if (!selectedVariant) {
        selectedVariant = product.variants.reduce((min, v) => {
          const price = v.salePrice || v.regularPrice;
          return !min || price < (min.salePrice || min.regularPrice) ? v : min;
        }, null);
      }

    if (!selectedVariant || selectedVariant.stock <= 0) {
  skippedItems++;
  continue;
}


      const varSize = selectedVariant.size;
      const price = selectedVariant.salePrice || selectedVariant.regularPrice;

      // Add to cart logic
      const existingItem = cart.items.find(
        (item) =>
          item.productId.toString() === product._id.toString() &&
          item.variantSize === varSize
      );

      if (existingItem) {
        existingItem.quantity += 1;
        existingItem.price = price;
      } else {
        cart.items.push({
          productId: product._id,
          variantSize: varSize,
          quantity: 1,
          price,
        });
      }
    }

    await cart.save();

const movedIds = wishlist.products.filter(item => {
  const p = item.productId;
  if (!p) return false;

  const outOfStock = p.variants && p.variants.every(v => v.stock <= 0);
  const unavailable =
    p.isBlocked ||
    p.status !== "Available" ||
    (p.category && p.category.isListed === false) ||
    (p.brand && p.brand.isBlocked === true) ||
    outOfStock;

  return !unavailable;
}).map(item => item.productId._id);



    await Wishlist.updateOne(
      { userId },
      { $pull: { products: { productId: { $in: movedIds } } } }
    );

    return res.json({
      success: true,
      message: `Moved ${movedIds.length} items to cart${
        skippedItems > 0 ? `, skipped ${skippedItems}` : ""
      }`,
    });
  } catch (err) {
    console.error("Move all to cart error:", err.message, err.stack);
    return res.status(500).json({ success: false, message: "Server error" });
  }
};

const getWishlistCount = async (req, res) => {
  try {
    const userId = req.session.user?._id || req.session.user?.id;

    if (!userId) {
      console.log("[Wishlist Count] No user ID found");
      return res.json({ count: 0 });
    }

    const wishlist = await Wishlist.findOne({ userId }).populate(
      "products.productId"
    );
    const count = wishlist?.products?.filter((p) => p.productId).length || 0;

    return res.json({ count, success: true });
  } catch (err) {
    console.error("[Wishlist Count ERROR]:", err.message);
    return res.json({ count: 0, error: err.message });
  }
};

const updateVariant = async (req, res) => {
  const userId = req.session.user._id;
  const { productId, variantSize } = req.body;

  await Wishlist.updateOne(
    { userId, "products.productId": productId },
    { $set: { "products.$.variantSize": variantSize } }
  );

  res.json({ success: true });
};

module.exports = {
  loadWishlist,
  addToWishlist,
  removeFromWishlist,
  moveAllToCart,
  getWishlistCount,
  updateVariant,
};
