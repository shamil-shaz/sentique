const mongoose = require('mongoose');
const Cart = require('../../models/cartSchema');
const Product = require('../../models/productSchema');



// const getCartPage = async (req, res) => {
//   try {
//     const userId = req.session.user?.id;
//     const cart = await Cart.findOne({ userId }).populate({
//       path: 'items.productId',
//       populate: [
//         { path: 'brand', select: 'brandName' },
//         { path: 'category', select: 'name' }
//       ]
//     });

//     if (!cart || cart.items.length === 0) {
//       return res.render("cart", { cartItems: [], totalPrice: 0 });
//     }

//     let totalPrice = 0;
//     let outOfStockCount = 0;
    
//     const cartItems = cart.items.map((item) => {
//       const product = item.productId;
      
   
//       const variant = product.variants.find(v => v.size === item.variantSize);
      
   
//       const variantStock = variant ? variant.stock : 0;
//       const productStock = product.stock || 0;
      
   
//       const actualStock = variantStock !== undefined ? variantStock : productStock;
      
//       const salePrice = variant ? (variant.salePrice || variant.regularPrice) : item.price;
//       const regularPrice = variant ? variant.regularPrice : null;

//       const itemTotal = salePrice * item.quantity;
      
   
//       if (actualStock > 0) {
//         totalPrice += itemTotal;
//       } else {
//         outOfStockCount++;
//       }

//       return {
//         productId: {
//           ...product.toObject(),
//           stock: actualStock  
//         },
//         variant: variant ? {
//           size: variant.size,
//           salePrice: variant.salePrice,
//           regularPrice: variant.regularPrice,
//           stock: variantStock
//         } : {},
//         quantity: item.quantity,
//         price: item.price,
//         itemTotal,
//       };
//     });

//     res.render("cart", { 
//       cartItems, 
//       totalPrice,
//       outOfStockCount 
//     });
//   } catch (err) {
//     console.error('Cart page error:', err);
//     res.redirect("/pageNotFound");
//   }
// };


const getCartPage = async (req, res) => {
  try {
    const userId = req.session.user?.id;
    const cart = await Cart.findOne({ userId }).populate({
      path: 'items.productId',
      populate: [
        { path: 'brand', select: 'brandName isListed' },
        { path: 'category', select: 'name isListed' }
      ]
    });

    if (!cart || cart.items.length === 0) {
      return res.render("cart", { 
        cartItems: [], 
        totalPrice: 0,
        outOfStockCount: 0,
        blockedCount: 0
      });
    }

    let totalPrice = 0;
    let outOfStockCount = 0;
    let blockedCount = 0;
    const cartItems = [];

    cart.items.forEach((item) => {
      const product = item.productId;
      
      // Safely check if product exists
      if (!product) {
        return; // Skip if product doesn't exist
      }

      // Check if product, category, or brand is unlisted
      const isProductUnlisted = product.isListed === false;
      const isCategoryUnlisted = product.category?.isListed === false;
      const isBrandUnlisted = product.brand?.isListed === false;
      const isBlocked = isProductUnlisted || isCategoryUnlisted || isBrandUnlisted;
      
      // Determine block reason
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

      // Get product images safely
      const images = product.productImage && product.productImage.length > 0 
        ? product.productImage 
        : (product.images && product.images.length > 0 
          ? product.images 
          : []);

      // Only add to total if not blocked and in stock
      if (!isBlocked && !isOutOfStock) {
        totalPrice += itemTotal;
      }

      // Count unavailable
      if (isBlocked) {
        blockedCount++;
      } else if (isOutOfStock) {
        outOfStockCount++;
      }

      // Add to cartItems regardless, with flags
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

    // Prepare response data
    const responseData = {
      cartItems: cartItems, 
      totalPrice: Math.round(totalPrice * 100) / 100, // Round to 2 decimals
      outOfStockCount,
      blockedCount
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


// Add this endpoint to your checkout controller
const checkoutBlockedItems = async (req, res) => {
  try {
    const userId = req.session.user?.id || req.session.user?._id;
    
    if (!userId) {
      return res.status(401).json({ success: false, error: 'Please login first' });
    }

    // Fetch cart with populated product, category, and brand info
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

    // Check each cart item for blocked status
    cart.items.forEach((item) => {
      const product = item.productId;
      
      if (!product) return;

      // Check if product, category, or brand is unlisted
      const isProductUnlisted = product.isListed === false;
      const isCategoryUnlisted = product.category?.isListed === false;
      const isBrandUnlisted = product.brand?.isListed === false;

      // Determine block reason
      let blockReason = null;
      if (isProductUnlisted) {
        blockReason = `Product "${product.productName}" has been temporarily blocked by admin`;
      } else if (isCategoryUnlisted) {
        blockReason = `Category "${product.category?.name}" has been temporarily blocked by admin`;
      } else if (isBrandUnlisted) {
        blockReason = `Brand "${product.brand?.brandName}" has been temporarily blocked by admin`;
      }

      // If blocked, add to blockedItems array
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



module.exports = {
    getCartPage, 
    addToCart,
    removeFromCart,
    updateCart,
    checkoutBlockedItems

    
};