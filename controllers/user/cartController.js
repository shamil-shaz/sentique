const mongoose = require('mongoose');
const Cart = require('../../models/cartSchema');
const Product = require('../../models/productSchema');

const getCartPage = async (req, res) => {
  try {
    const userId = req.session.user?.id;
    const cart = await Cart.findOne({ userId }).populate({
      path: 'items.productId',
      populate: [
        { path: 'brand', select: 'brandName' },
        { path: 'category', select: 'name' }
      ]
    });

    if (!cart || cart.items.length === 0) {
      return res.render("cart", { cartItems: [], totalPrice: 0 });
    }

    let totalPrice = 0;
    const cartItems = cart.items.map((item) => {
      const product = item.productId;
      const variant = product.variants.find(v => v.size === item.variantSize);
      const salePrice = variant ? (variant.salePrice || variant.regularPrice) : item.price;
      const regularPrice = variant ? variant.regularPrice : null;

      const itemTotal = salePrice * item.quantity;
      totalPrice += itemTotal;

      return {
        productId: product,
        variant: variant || {}, // Fallback empty if variant not found
        quantity: item.quantity,
        price: item.price,
        itemTotal,
      };
    });

    res.render("cart", { cartItems, totalPrice });
  } catch (err) {
    console.error(err);
    res.redirect("/pageNotFound");
  }
};

const addToCart = async (req, res) => {
    try {
        const userId = req.session.user?.id || req.session.user?._id;
        const { productId, variantSize, quantity } = req.body;

        console.log('Add to cart request:', { userId, productId, variantSize, quantity });

        if (!userId) {
            return res.status(401).json({ success: false, message: 'Please login first' });
        }

        if (!mongoose.Types.ObjectId.isValid(productId)) {
            return res.status(400).json({ success: false, message: 'Invalid product ID' });
        }

        if (!variantSize || isNaN(Number(variantSize))) {
            return res.status(400).json({ success: false, message: 'Invalid variant size' });
        }

        if (!quantity || isNaN(Number(quantity)) || Number(quantity) < 1) {
            return res.status(400).json({ success: false, message: 'Invalid quantity' });
        }

        const product = await Product.findById(productId);
        if (!product) {
            return res.status(404).json({ success: false, message: 'Product not found' });
        }

        const variant = product.variants.find(v => v.size === Number(variantSize));
        if (!variant) {
            return res.status(404).json({ success: false, message: 'Variant not found' });
        }

        const price = variant.salePrice || variant.regularPrice;
        if (price == null) {
            return res.status(400).json({ success: false, message: 'Variant has no valid price' });
        }

        let cart = await Cart.findOne({ userId });
        if (!cart) {
            cart = new Cart({ userId, items: [] });
        }

        // Clean invalid items
        cart.items = cart.items.filter(item => item.variantSize != null && item.price != null);

        const existingItem = cart.items.find(
            (item) => item.productId.toString() === productId && item.variantSize === Number(variantSize)
        );

        if (existingItem) {
            existingItem.quantity += Number(quantity);
            existingItem.price = price;
        } else {
            cart.items.push({
                productId,
                variantSize: Number(variantSize),
                quantity: Number(quantity),
                price,
            });
        }

        await cart.save();
        console.log('Cart updated:', cart.items);
        res.json({ success: true, message: 'Product added to cart' });
    } catch (err) {
        console.error('Add to cart error:', err);
        res.status(500).json({ success: false, message: 'Server error', error: err.message });
    }
};

const removeFromCart = async (req, res) => {
  try {
    const userId = req.session.user?.id || req.session.user?._id;
    const { productId } = req.params;
    const { variantSize } = req.query;

    console.log('Remove from cart request:', { userId, productId, variantSize });

    if (!userId) {
      console.log('No userId in session');
      return res.status(401).json({ success: false, message: 'Please login first' });
    }

    if (!mongoose.Types.ObjectId.isValid(productId)) {
      console.log('Invalid productId:', productId);
      return res.status(400).json({ success: false, message: 'Invalid product ID' });
    }

    if (!variantSize || isNaN(Number(variantSize))) {
      console.log('Invalid variantSize:', variantSize);
      return res.status(400).json({ success: false, message: 'Invalid variant size' });
    }

    const cart = await Cart.findOne({ userId });
    if (!cart) {
      console.log('Cart not found for userId:', userId);
      return res.status(404).json({ success: false, message: 'Cart not found' });
    }

    const initialLength = cart.items.length;
    cart.items = cart.items.filter(
      (item) => !(item.productId.toString() === productId && item.variantSize === Number(variantSize))
    );

    if (cart.items.length === initialLength) {
      console.log('Item not found in cart:', { productId, variantSize });
      return res.status(404).json({ success: false, message: 'Item not found in cart' });
    }

    await cart.save();
    console.log('Cart updated:', JSON.stringify(cart.items, null, 2));
    res.json({ success: true, message: 'Item removed from cart' });
  } catch (err) {
    console.error('Remove from cart error:', {
      message: err.message,
      stack: err.stack,
      params: req.params,
      query: req.query,
    });
    res.status(500).json({ success: false, message: 'Server error', error: err.message });
  }
};

const updateCart = async (req, res) => {
  try {
    const userId = req.session.user?.id || req.session.user?._id;
    const { productId, variantSize, quantity } = req.body;

    if (!userId) {
      return res.status(401).json({ success: false, message: 'Please login first' });
    }
    if (quantity < 1) {
      return res.json({ success: false, message: 'Invalid quantity' });
    }

    const cart = await Cart.findOne({ userId });
    if (!cart) {
      return res.json({ success: false, message: 'Cart not found' });
    }

    const varSize = Number(variantSize);
    const item = cart.items.find(item => item.productId.toString() === productId && item.variantSize === varSize);
    if (!item) {
      return res.json({ success: false, message: 'Item not found in cart' });
    }

    const product = await Product.findById(productId);
    if (!product) {
      return res.json({ success: false, message: 'Product not found' });
    }

    const variant = product.variants.find(v => v.size === varSize);
    let stock = product.stock;
    if (variant && variant.stock !== undefined) {
      stock = variant.stock; // Optional: if stock per variant
    }
    if (stock < quantity) {
      return res.json({ success: false, message: `Only ${stock} items in stock` });
    }

    item.quantity = quantity;
    item.price = variant ? (variant.salePrice || variant.regularPrice) : (product.salePrice || product.price);
    await cart.save();

    res.json({ success: true, message: 'Cart updated' });
  } catch (err) {
    console.error('Update cart error:', err.message, err.stack);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

module.exports = { getCartPage, addToCart, removeFromCart, updateCart };