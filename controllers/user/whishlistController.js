
const Wishlist = require("../../models/wishlistSchema");
const Product = require("../../models/productSchema");
const Cart = require("../../models/cartSchema");
const User = require("../../models/userSchema");
const mongoose=require('mongoose')

const loadWishlist = async (req, res) => {
  try {
    const userId = req.session.user?.id || req.session.user?._id;
    if (!userId) {
      console.log("User not logged in, redirecting...");
      return res.redirect('/login');
    }

    
    const page = parseInt(req.query.page) || 1;
    const limit = 8; 
    const skip = (page - 1) * limit;

    const wishlist = await Wishlist.findOne({ userId })
      .populate({
        path: 'products.productId',
        select: 'productName price salePrice brand category images discount stock variants',
        populate: [
          { path: 'brand', select: 'brandName' },
          { path: 'category', select: 'name' }
        ]
      })
      .exec();

    const wishlistItems = wishlist ? wishlist.products : [];
    const totalItems = wishlistItems.length;
    const totalPages = Math.ceil(totalItems / limit);
    const paginatedItems = wishlistItems.slice(skip, skip + limit);

    console.log('Wishlist Items:', JSON.stringify(paginatedItems, null, 2));
    console.log('Pagination:', { page, limit, totalItems, totalPages });

    res.render('wishlist', {
      wishlistItems: paginatedItems,
      totalItems,
      totalPages,
      currentPage: page
    });
  } catch (err) {
    console.error("Load wishlist error:", err.message, err.stack);
    res.redirect('/pageNotFound');
  }
};

const addToWishlist = async (req, res) => {
  try {
    const userId = req.session.user?.id || req.session.user?._id;
    const { productId } = req.body;
    console.log('Add to wishlist request:', { userId, productId });

    if (!userId) {
      console.log('No userId in session');
      return res.json({ success: false, message: 'Please login first' });
    }

    if (!productId || productId.length !== 24) {
      console.log('Invalid productId:', productId);
      return res.json({ success: false, message: 'Invalid product ID' });
    }

    const product = await Product.findById(productId);
    if (!product) {
      console.log('Product not found for productId:', productId);
      return res.json({ success: false, message: 'Product not found' });
    }
  
    if (!product.variants || product.variants.length === 0) {
      console.log('Product has no variants:', productId);
      return res.json({ success: false, message: 'Product has no variants' });
    }

    let wishlist = await Wishlist.findOne({ userId });

    if (!wishlist) {
      console.log('Creating new wishlist for userId:', userId);
      wishlist = new Wishlist({ userId, products: [] });
    }

    if (wishlist.products.some(p => p.productId.toString() === productId)) {
      console.log('Product already in wishlist:', productId);
      return res.json({ success: false, message: 'Already in wishlist' });
    }

    wishlist.products.push({ productId });
    await wishlist.save();
    console.log('Wishlist updated:', JSON.stringify(wishlist, null, 2));

    res.json({ success: true, message: 'Product added to wishlist' });
  } catch (error) {
    console.error("Add to wishlist error:", error.message, error.stack);
    res.json({ success: false, message: 'Server error' });
  }
};

const removeFromWishlist = async (req, res) => {
    try {
        const userId = req.session.user?.id || req.session.user?._id;
        const productId = req.params.id;

        console.log('Remove from wishlist request:', { userId, productId });

        if (!userId) {
            return res.status(401).json({ success: false, message: 'Please login first' });
        }

        if (!mongoose.Types.ObjectId.isValid(productId)) {
            return res.status(400).json({ success: false, message: 'Invalid product ID' });
        }

        const wishlist = await Wishlist.findOne({ userId });
        if (!wishlist) {
            return res.status(404).json({ success: false, message: 'Wishlist not found' });
        }

        const initialLength = wishlist.products.length;
        wishlist.products = wishlist.products.filter(
            (item) => item.productId.toString() !== productId
        );

        if (wishlist.products.length === initialLength) {
            return res.status(404).json({ success: false, message: 'Product not found in wishlist' });
        }

        await wishlist.save();
        console.log('Wishlist updated:', wishlist.products);
        res.json({ success: true, message: 'Item removed from wishlist' });
    } catch (err) {
        console.error('Remove from wishlist error:', err);
        res.status(500).json({ success: false, message: 'Server error', error: err.message });
    }
};

const moveAllToCart = async (req, res) => {
  try {
    const userId = req.session.user?.id || req.session.user?._id;
    console.log('Move all to cart request for userId:', userId);
    if (!userId) {
      console.log('No userId in session');
      return res.status(401).json({ success: false, message: "Login required" });
    }

    const wishlist = await Wishlist.findOne({ userId }).populate('products.productId');
    if (!wishlist || wishlist.products.length === 0) {
      console.log('Wishlist empty for userId:', userId);
      return res.json({ success: false, message: "Wishlist empty" });
    }

    let cart = await Cart.findOne({ userId });
    if (!cart) cart = new Cart({ userId, items: [] });

    let skippedItems = 0;
    for (let wishlistItem of wishlist.products) {
      const product = wishlistItem.productId;
      if (!product) {
        console.log('Skipping: Product not found for wishlist item:', wishlistItem);
        skippedItems++;
        continue;
      }

      if (!product.variants || product.variants.length === 0) {
        console.log('Skipping: Product has no variants:', product._id);
        skippedItems++;
        continue;
      }
    
      let minPrice = Infinity;
      let selectedVariant = null;
      product.variants.forEach(v => {
        const price = v.salePrice || v.regularPrice;
        if (price && price < minPrice && v.size != null) { 
          minPrice = price;
          selectedVariant = v;
        }
      });

      if (!selectedVariant) {
        console.log('Skipping: No valid variant found for product:', product._id);
        skippedItems++;
        continue;
      }

      const varSize = selectedVariant.size;
      const price = minPrice;

      const existingItem = cart.items.find(
        item => item.productId.toString() === product._id.toString() && item.variantSize === varSize
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

    if (cart.items.length > 0) {
      await cart.save();
      await Wishlist.deleteOne({ userId });
      console.log('All valid wishlist items moved to cart and wishlist cleared');
      return res.json({
        success: true,
        message: `Moved ${wishlist.products.length - skippedItems} items to cart${skippedItems > 0 ? `, skipped ${skippedItems} invalid items` : ''}`
      });
    } else {
      console.log('No valid items to move to cart');
      return res.json({ success: false, message: "No valid items to move to cart" });
    }
  } catch (err) {
    console.error("Move all to cart error:", err.message, err.stack);
    res.status(500).json({ success: false, message: "Server error" });
  }
};

const getWishlistCount = async (req, res) => {
  try {
    const userId = req.session.user?._id || req.session.user?.id;
    
    if (!userId) {
      console.log('[Wishlist Count] No user ID found');
      return res.json({ count: 0 });
    }
    
    const wishlist = await Wishlist.findOne({ userId: userId });
    const count = wishlist?.products?.length || 0;
    
    return res.json({ count, success: true });
  } catch (err) {
    console.error('[Wishlist Count ERROR]:', err.message);
    return res.json({ count: 0, error: err.message });
  }
};


module.exports = {
  loadWishlist,
  addToWishlist,
  removeFromWishlist,
  moveAllToCart,
  getWishlistCount
};