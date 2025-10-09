const Wishlist = require("../../models/wishlistSchema");
const Product = require("../../models/productSchema");
const Cart = require("../../models/cartSchema");


const loadWishlist = async (req, res) => {
  try {
    const userId = req.session.user?.id;
    if (!userId) return res.redirect("/login");

    const wishlist = await Wishlist.find({ userId })
      .populate("productId");

    res.render("wishlist", { wishlist });
  } catch (err) {
    console.error("Wishlist load error:", err);
    res.redirect("/pageNotFound");
  }
};


const addToWishlist = async (req, res) => {
  try {
    const userId = req.session.user?.id;
    const { productId } = req.body;

    if (!userId) return res.status(401).json({ success: false, message: "Login required" });

    // Check if already exists
    const exists = await Wishlist.findOne({ userId, productId });
    if (exists) {
      return res.status(200).json({ success: false, message: "Already in wishlist" });
    }

    await Wishlist.create({ userId, productId });
    res.status(200).json({ success: true, message: "Added to wishlist" });
  } catch (err) {
    console.error("Add wishlist error:", err);
    res.status(500).json({ success: false, message: "Server error" });
  }
};

const removeFromWishlist = async (req, res) => {
  try {
    const userId = req.session.user?.id;
    const { id } = req.params;

    await Wishlist.findOneAndDelete({ userId, productId: id });
    res.json({ success: true, message: "Item removed" });
  } catch (err) {
    console.error("Remove wishlist error:", err);
    res.status(500).json({ success: false, message: "Server error" });
  }
};


const moveAllToCart = async (req, res) => {
  try {
    const userId = req.session.user?.id;
    if (!userId) return res.status(401).json({ success: false, message: "Login required" });

    const wishlistItems = await Wishlist.find({ userId });
    if (wishlistItems.length === 0) return res.json({ success: false, message: "Wishlist empty" });

    for (let item of wishlistItems) {
      await Cart.updateOne(
        { userId, "items.productId": { $ne: item.productId } },
        { $push: { items: { productId: item.productId, quantity: 1 } } },
        { upsert: true }
      );
    }

    await Wishlist.deleteMany({ userId });

    res.json({ success: true, message: "All items moved to cart" });
  } catch (err) {
    console.error("Move all to cart error:", err);
    res.status(500).json({ success: false, message: "Server error" });
  }
};


 module.exports={
    loadWishlist,
    addToWishlist,
    removeFromWishlist,
    moveAllToCart
 }