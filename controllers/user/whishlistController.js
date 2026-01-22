const Wishlist = require("../../models/wishlistSchema");
const Product = require("../../models/productSchema");
const Cart = require("../../models/cartSchema");
const User = require("../../models/userSchema");
const mongoose = require("mongoose");

const loadWishlist = async (req, res) => {
  try {
    const userId = req.userId;
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

    const validItems = wishlistItems
      .map((item) => {
        const p = item.productId;
        if (!p) return null;

        const outOfStock = p.variants && p.variants.every((v) => v.stock <= 0);

        const isCurrentlyBuyable =
          !p.isBlocked &&
          p.status === "Available" &&
          p.category?.isListed !== false &&
          p.brand?.isBlocked !== true &&
          !outOfStock;

        return {
          ...item.toObject(),
          isCurrentlyBuyable,
        };
      })
      .filter((item) => item !== null);

    const totalItems = validItems.length;

    const totalPages = Math.ceil(totalItems / limit);
    const paginatedItems = validItems.slice(skip, skip + limit);

    res.render("wishlist", {
      wishlistItems: paginatedItems,
      totalItems,
      totalPages,
      currentPage: page,
      user: req.user || req.session.user || null,
    });
  } catch (err) {
    console.error("Load wishlist error:", err.message, err.stack);
    res.redirect("/pageNotFound");
  }
};

const addToWishlist = async (req, res) => {
  try {
    const userId = req.userId;
    const { productId } = req.body;

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
    const userId = req.userId;
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
    const userId = req.userId;
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
        (product.category && product.category.isListed === false)
      ) {
        skippedItems++;
        continue;
      }

      const productIdStr = String(product._id);
      const requestedSize =
        variantsMap[productIdStr] || wishlistItem.variantSize;

      let selectedVariant = product.variants.find(
        (v) => Number(v.size) === Number(requestedSize)
      );

      if (!selectedVariant || selectedVariant.stock <= 0) {
        skippedItems++;
        continue;
      }

      const varSize = Number(selectedVariant.size);
      const price = selectedVariant.salePrice || selectedVariant.regularPrice;

      const existingItem = cart.items.find(
        (item) =>
          item.productId.toString() === product._id.toString() &&
          Number(item.variantSize) === varSize
      );

      if (existingItem) {
        if (existingItem.quantity < 5) {
          existingItem.quantity += 1;
          existingItem.price = price;
        } else {
          skippedItems++;
          continue;
        }
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

    const movedIds = wishlist.products
      .filter((item) => {
        const p = item.productId;
        if (!p || p.isBlocked || p.status !== "Available") return false;

        const requestedSize = variantsMap[String(p._id)] || item.variantSize;
        const selectedVariant = p.variants.find(
          (v) => Number(v.size) === Number(requestedSize)
        );

        return selectedVariant && selectedVariant.stock > 0;
      })
      .map((item) => item.productId._id);

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
    const userId = req.userId;

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
  const userId = req.userId;
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
