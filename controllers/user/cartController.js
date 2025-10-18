const mongoose = require('mongoose');
const Cart = require('../../models/cartSchema');
const Product = require('../../models/productSchema');



const getCartPage = async (req, res) => {
  try {
    const userId = req.session.user?.id;
    const cart = await Cart.findOne({ userId }).populate({
      path: 'items.productId',
      populate: [
        { path: 'brand', select: 'brandName isBlocked' },
        { path: 'category', select: 'name isListed' }
      ]
    });

    if (!cart || cart.items.length === 0) {
      return res.render("cart", { 
        cartItems: [], 
        totalPrice: 0,
        outOfStockCount: 0,
        blockedCount: 0,
        blockedProducts: []
      });
    }

    let totalPrice = 0;
    let outOfStockCount = 0;
    let blockedCount = 0;
    const cartItems = [];
    const blockedProducts = [];

    cart.items.forEach((item) => {
      const product = item.productId;
      if (!product) {
        return; 
      }
      
      const isProductUnlisted = product.isBlocked === true;
      const isCategoryUnlisted = product.category?.isListed === false;
      const isBrandUnlisted = product.brand?.isBlocked === true;
      const isBlocked = isProductUnlisted || isCategoryUnlisted || isBrandUnlisted;
  
     let blockReason = null;
if (isProductUnlisted) {
  blockReason = `Product "${product.productName}" has been temporarily blocked by admin`;
} else if (isCategoryUnlisted) {
  blockReason = `Category "${product.category?.name}" has been temporarily blocked by admin`;
} else if (isBrandUnlisted) {
  blockReason = `Brand "${product.brand?.brandName}" has been temporarily blocked by admin`;
}

      const variant = product.variants?.find(v => v.size === item.variantSize);
      const variantStock = variant ? variant.stock : 0;
      const productStock = product.stock || 0;
      const actualStock = variantStock !== undefined ? variantStock : productStock;
      const isOutOfStock = actualStock <= 0;
      
      const salePrice = variant ? (variant.salePrice || variant.regularPrice) : item.price;
      const regularPrice = variant ? variant.regularPrice : null;
      const itemTotal = salePrice * item.quantity;

      const images = product.productImage && product.productImage.length > 0 
        ? product.productImage 
        : (product.images && product.images.length > 0 
          ? product.images 
          : []);
     
      if (!isBlocked && !isOutOfStock) {
        totalPrice += itemTotal;
      }
      
      if (isBlocked) {
        blockedCount++;
        blockedProducts.push({
          productName: product.productName,
          reason: blockReason
        });
      } else if (isOutOfStock) {
        outOfStockCount++;
      }
    
      cartItems.push({
        productId: {
          _id: product._id,
          productName: product.productName,
          brandName: product.brand?.brandName || 'Unknown Brand',
          categoryName: product.category?.name || 'Unknown Category',
          images: images,
          stock: actualStock
        },
        variant: {
          size: item.variantSize,
          salePrice: salePrice,
          regularPrice: regularPrice,
          stock: variantStock
        },
        quantity: item.quantity,
        price: item.price,
        isBlocked: isBlocked,
        blockReason: blockReason,
        isOutOfStock: isOutOfStock,
        availableQty: isBlocked || isOutOfStock ? 0 : Math.min(actualStock, 5)
      });
    });

    const responseData = {
      cartItems: cartItems, 
      totalPrice: Math.round(totalPrice * 100) / 100, 
      outOfStockCount,
      blockedCount,
      blockedProducts 
    };

    res.render("cart", responseData);

  } catch (err) {
    console.error('Cart page error:', err);
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

        cart.items = cart.items.filter(item => item.variantSize != null && item.price != null);

        const existingItem = cart.items.find(
            (item) => item.productId.toString() === productId && item.variantSize === Number(variantSize)
        );
        
        if (existingItem) {
            const newTotal = existingItem.quantity + Number(quantity);
         
            if (newTotal > 5) {
                return res.status(400).json({ 
                    success: false, 
                    message: `Cannot add more items. You already have ${existingItem.quantity} item(s) of ${variantSize}ML in cart. Maximum 5 allowed per variant.`,
                    currentQuantity: existingItem.quantity,
                    canAdd: 5 - existingItem.quantity
                });
            }
            
            existingItem.quantity = newTotal;
            existingItem.price = price;
        } else {
            
            if (Number(quantity) > 5) {
                return res.status(400).json({ 
                    success: false, 
                    message: 'Cannot add more than 5 items at a time per variant',
                    canAdd: 5
                });
            }
            
            cart.items.push({
                productId,
                variantSize: Number(variantSize),
                quantity: Number(quantity),
                price,
            });
        }

        await cart.save();
        console.log('Cart updated:', cart.items);
        res.json({ 
            success: true, 
            message: 'Product added to cart',
            currentQuantity: existingItem ? existingItem.quantity : Number(quantity)
        });
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
      stock = variant.stock; 
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

const checkoutBlockedItems = async (req, res) => {
  try {
    const userId = req.session.user?.id || req.session.user?._id;
    
    if (!userId) {
      return res.status(401).json({ success: false, error: 'Please login first' });
    }
    const cart = await Cart.findOne({ userId }).populate({
      path: 'items.productId',
      populate: [
        { path: 'brand', select: 'brandName isListed' },
        { path: 'category', select: 'name isListed' }
      ]
    });

    if (!cart || cart.items.length === 0) {
      return res.json({ success: true, hasBlockedItems: false, blockedItems: [] });
    }

    const blockedItems = [];
    cart.items.forEach((item) => {
      const product = item.productId;
      
      if (!product) return;
     
      const isProductUnlisted = product.isListed === false;
      const isCategoryUnlisted = product.category?.isListed === false;
      const isBrandUnlisted = product.brand?.isListed === false;
     
      let blockReason = null;
      if (isProductUnlisted) {
        blockReason = `Product "${product.productName}" has been temporarily blocked by admin`;
      } else if (isCategoryUnlisted) {
        blockReason = `Category "${product.category?.name}" has been temporarily blocked by admin`;
      } else if (isBrandUnlisted) {
        blockReason = `Brand "${product.brand?.brandName}" has been temporarily blocked by admin`;
      }
     
      if (blockReason) {
        blockedItems.push({
          productId: product._id,
          productName: product.productName,
          quantity: item.quantity,
          blockReason,
          variantSize: item.variantSize,
          image: product.productImage?.[0] || product.images?.[0] || 'https://via.placeholder.com/80x80?text=No+Image'
        });
      }
    });

    res.json({ 
      success: true, 
      hasBlockedItems: blockedItems.length > 0,
      blockedItems: blockedItems,
      blockedCount: blockedItems.length
    });

  } catch (error) {
    console.error('Error checking blocked items:', error);
    res.status(500).json({ success: false, error: 'Failed to check items' });
  }
};

const checkCartQuantity = async (req, res) => {
  try {
    const userId = req.session.user?.id || req.session.user?._id;
    const { productId } = req.body;

    if (!userId) {
      return res.json({ quantity: 0 }); 
    }

    if (!productId) {
      return res.status(400).json({ error: 'Product ID required' });
    }
   
    const cart = await Cart.findOne({ userId });
    
    if (!cart) {
      return res.json({ quantity: 0 }); 
    }

    const cartItem = cart.items.find(item => item.productId.toString() === productId);
    if (!cartItem) {
      return res.json({ quantity: 0 }); 
    }
   
    const alreadyInCart = cartItem.quantity;
    const canStillAdd = 5 - alreadyInCart;

    return res.json({ 
      quantity: alreadyInCart,
      canAdd: canStillAdd,
      maxAllowed: 5
    }); 
  } catch (error) {
    console.error('Cart check error:', error);
    res.status(500).json({ error: 'Error checking cart' });
  }
};

const getCartCount = async (req, res) => {
  try {
    const userId = req.session.user?._id || req.session.user?.id;
    
    if (!userId) {
      console.log('[Cart Count] No user ID found');
      return res.json({ count: 0 });
    }
    
    const cart = await Cart.findOne({ userId: userId });
    
    console.log('[Cart Count] Cart document:', cart);

    let count = 0;
    if (cart && Array.isArray(cart.items)) {
      count = cart.items.length;
   
    } else {
      console.log('[Cart Count] No cart or items array found');
    }
  
    return res.json({ count, success: true });
  } catch (err) {
    console.error('[Cart Count ERROR]:', err.message);
    return res.json({ count: 0, error: err.message });
  }
};



module.exports = {
    getCartPage, 
    addToCart,
    removeFromCart,
    updateCart,
    checkoutBlockedItems,
    checkCartQuantity,
    getCartCount
    

    
};