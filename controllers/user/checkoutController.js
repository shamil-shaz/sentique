// const mongoose = require('mongoose');
// const Cart = require('../../models/cartSchema');
// const Address = require('../../models/addressSchema');
// const Product = require('../../models/productSchema');
// const User = require('../../models/userSchema');





// const getCheckoutPage = async (req, res) => {
//     try {
        
//         console.log('Session data:', req.session);
//         console.log('User in session:', req.session.user);

      
//         const userId = req.session.user?._id || req.session.user?.id;
//         console.log('Checkout - userId:', userId, 'isValid:', mongoose.Types.ObjectId.isValid(userId));

//         if (!userId || !mongoose.Types.ObjectId.isValid(userId)) {
//             console.warn('Invalid or missing userId in session');
//             req.flash('error_msg', 'Please login first');
//             return res.redirect('/login');
//         }

   
//         const user = await User.findById(userId);
//         if (!user) {
//             console.warn('User not found for userId:', userId);
//             req.flash('error_msg', 'User not found. Please login again.');
//             return res.redirect('/login');
//         }

       
//         const cart = await Cart.findOne({ userId }).populate({
//             path: 'items.productId',
//             select: 'productName images price salePrice variants stock isActive'
//         });

//         if (!cart || cart.items.length === 0) {
//             req.flash('error_msg', 'Your cart is empty');
//             return res.redirect('/cart');
//         }
//         console.log('Cart:', JSON.stringify(cart, null, 2));

        
//         const cartItems = cart.items
//             .map(item => {
//                 const product = item.productId;

                
//                 if (!product) {
//                     console.warn(`Skipping missing product for item: ${item._id}`);
//                     return null;
//                 }     
//                 console.log(`Product: ${product.productName}, isActive: ${product.isActive}, Variant Size: ${item.variantSize}`);

//                 const variant = product.variants?.find(v => v.size === item.variantSize) || {};
               
//                 let actualStock = 0;
//                 if (variant && typeof variant.stock === 'number') {
//                     actualStock = variant.stock;
//                 } else if (typeof product.stock === 'number') {
//                     actualStock = product.stock;
//                 }
//                 if (isNaN(actualStock)) {
//                     actualStock = 0;
//                 }

//                 console.log(`Product: ${product.productName}, Variant Stock: ${variant.stock}, Product Stock: ${product.stock}, Actual Stock: ${actualStock}`);

//                 return {
//                     productId: {
//                         _id: product._id,
//                         productName: product.productName || 'Unknown Product',
//                         images: product.images?.length ? product.images : ['default.jpg'],
//                         price: product.price || 0,
//                         salePrice: product.salePrice || 0,
//                         stock: actualStock,
//                         isActive: product.isActive || false
//                     },
//                     variant: {
//                         size: variant.size || item.variantSize || 'N/A',
//                         price: variant.price || product.price || 0,
//                         salePrice: variant.salePrice || product.salePrice || 0,
//                         stock: actualStock
//                     },
//                     quantity: item.quantity,
//                     price: item.price || (variant.salePrice || variant.price || product.salePrice || product.price || 0)
//                 };
//             })
//             .filter(item => item !== null);

//         console.log('Cart Items:', JSON.stringify(cartItems, null, 2));

        
//         const outOfStockItems = cartItems.filter(item => item.variant.stock <= 0 || item.productId.stock <= 0);
//         if (outOfStockItems.length > 0) {
//             console.log('Out of stock items:', outOfStockItems.map(item => ({
//                 name: item.productId.productName,
//                 variantStock: item.variant.stock,
//                 productStock: item.productId.stock
//             })));
//         }

       
//         const subtotal = cartItems.reduce((sum, item) => {
//             const price = item.variant?.salePrice || item.variant?.price || item.price || 0;
//             return sum + (price * item.quantity);
//         }, 0);

      
//         const userAddress = await Address.findOne({ userId });
//         const addresses = userAddress ? userAddress.address.filter(addr => addr && addr._id) : [];

//         console.log('Checkout data:', {
//             userId,
//             totalItems: cartItems.length,
//             outOfStockCount: outOfStockItems.length,
//             addressesCount: addresses.length,
//             subtotal
//         });

        
//         const discount = 0; 
//         const total = subtotal - discount;

//         res.render('checkout', {
//             cartItems,
//             addresses,
//             subtotal: Math.round(subtotal),
//             discount: Math.round(discount),
//             total: Math.round(total),
//             success_msg: req.flash('success_msg'),
//             error_msg: req.flash('error_msg')
//         });
//     } catch (err) {
//         console.error('Get checkout error:', err);
//         req.flash('error_msg', 'Server error. Please try again.');
//         res.redirect('/cart');
//     }
// };

// const getAddressForEdit = async (req, res) => {
//   try {
//     const userId = req.session.user?._id;
//     const addressId = req.params.id;

//     if (!mongoose.Types.ObjectId.isValid(userId) || !mongoose.Types.ObjectId.isValid(addressId)) {
//       return res.status(400).json({ success: false, message: 'Invalid user or address ID' });
//     }

//     const addressDoc = await Address.findOne({ userId });
//     if (!addressDoc) {
//       return res.status(404).json({ success: false, message: 'Address document not found' });
//     }

//     const address = addressDoc.address.find(addr => addr._id.toString() === addressId);
//     if (!address) {
//       return res.status(404).json({ success: false, message: 'Address not found' });
//     }

//     return res.status(200).json({ success: true, address });
//   } catch (err) {
//     console.error('Get address error:', err);
//     return res.status(500).json({ success: false, message: 'Server error' });
//   }
// };

// module.exports = { getCheckoutPage,getAddressForEdit};




// const mongoose = require('mongoose');
// const Cart = require('../../models/cartSchema');
// const Address = require('../../models/addressSchema');
// const Product = require('../../models/productSchema');
// const User = require('../../models/userSchema');

// const getCheckoutPage = async (req, res) => {
//     try {
//         console.log('Session data:', req.session);
//         console.log('User in session:', req.session.user);

//         const userId = req.session.user?._id || req.session.user?.id;
//         console.log('Checkout - userId:', userId, 'isValid:', mongoose.Types.ObjectId.isValid(userId));

//         if (!userId || !mongoose.Types.ObjectId.isValid(userId)) {
//             console.warn('Invalid or missing userId in session');
//             req.flash('error_msg', 'Please login first');
//             return res.redirect('/login');
//         }

//         const user = await User.findById(userId);
//         if (!user) {
//             console.warn('User not found for userId:', userId);
//             req.flash('error_msg', 'User not found. Please login again.');
//             return res.redirect('/login');
//         }

//         const cart = await Cart.findOne({ userId }).populate({
//             path: 'items.productId',
//             select: 'productName images price salePrice variants stock isActive'
//         });

//         if (!cart || cart.items.length === 0) {
//             req.flash('error_msg', 'Your cart is empty');
//             return res.redirect('/cart');
//         }
//         console.log('Cart:', JSON.stringify(cart, null, 2));

//         const cartItems = cart.items
//             .map(item => {
//                 const product = item.productId;

//                 if (!product) {
//                     console.warn(`Skipping missing product for item: ${item._id}`);
//                     return null;
//                 }     
//                 console.log(`Product: ${product.productName}, isActive: ${product.isActive}, Variant Size: ${item.variantSize}`);

//                 const variant = product.variants?.find(v => v.size === item.variantSize) || {};
               
//                 let actualStock = 0;
//                 if (variant && typeof variant.stock === 'number') {
//                     actualStock = variant.stock;
//                 } else if (typeof product.stock === 'number') {
//                     actualStock = product.stock;
//                 }
//                 if (isNaN(actualStock)) {
//                     actualStock = 0;
//                 }

//                 console.log(`Product: ${product.productName}, Variant Stock: ${variant.stock}, Product Stock: ${product.stock}, Actual Stock: ${actualStock}`);

//                 return {
//                     _id: item._id, // IMPORTANT: Include cart item ID for removal
//                     productId: {
//                         _id: product._id,
//                         productName: product.productName || 'Unknown Product',
//                         images: product.images?.length ? product.images : ['default.jpg'],
//                         price: product.price || 0,
//                         salePrice: product.salePrice || 0,
//                         stock: actualStock,
//                         isActive: product.isActive || false
//                     },
//                     variant: {
//                         size: variant.size || item.variantSize || 'N/A',
//                         price: variant.price || product.price || 0,
//                         salePrice: variant.salePrice || product.salePrice || 0,
//                         stock: actualStock
//                     },
//                     quantity: item.quantity,
//                     price: item.price || (variant.salePrice || variant.price || product.salePrice || product.price || 0)
//                 };
//             })
//             .filter(item => item !== null);

//         console.log('Cart Items:', JSON.stringify(cartItems, null, 2));

//         const outOfStockItems = cartItems.filter(item => item.variant.stock <= 0 || item.productId.stock <= 0);
//         if (outOfStockItems.length > 0) {
//             console.log('Out of stock items:', outOfStockItems.map(item => ({
//                 name: item.productId.productName,
//                 variantStock: item.variant.stock,
//                 productStock: item.productId.stock
//             })));
//         }

//         const subtotal = cartItems.reduce((sum, item) => {
//             const price = item.variant?.salePrice || item.variant?.price || item.price || 0;
//             return sum + (price * item.quantity);
//         }, 0);

//         const userAddress = await Address.findOne({ userId });
//         const addresses = userAddress ? userAddress.address.filter(addr => addr && addr._id) : [];

//         console.log('Checkout data:', {
//             userId,
//             totalItems: cartItems.length,
//             outOfStockCount: outOfStockItems.length,
//             addressesCount: addresses.length,
//             subtotal
//         });

//         const discount = 0; 
//         const total = subtotal - discount;

//         res.render('checkout', {
//             cartItems,
//             addresses,
//             subtotal: Math.round(subtotal),
//             discount: Math.round(discount),
//             total: Math.round(total),
//             success_msg: req.flash('success_msg'),
//             error_msg: req.flash('error_msg')
//         });
//     } catch (err) {
//         console.error('Get checkout error:', err);
//         req.flash('error_msg', 'Server error. Please try again.');
//         res.redirect('/cart');
//     }
// };

// const getAddressForEdit = async (req, res) => {
//     try {
//         const userId = req.session.user?._id;
//         const addressId = req.params.id;

//         console.log('Getting address for edit - userId:', userId, 'addressId:', addressId);

//         if (!mongoose.Types.ObjectId.isValid(userId) || !mongoose.Types.ObjectId.isValid(addressId)) {
//             return res.status(400).json({ success: false, message: 'Invalid user or address ID' });
//         }

//         const addressDoc = await Address.findOne({ userId });
//         if (!addressDoc) {
//             return res.status(404).json({ success: false, message: 'Address document not found' });
//         }

//         const address = addressDoc.address.find(addr => addr._id.toString() === addressId);
//         if (!address) {
//             return res.status(404).json({ success: false, message: 'Address not found' });
//         }

//         console.log('Found address:', address);
//         return res.status(200).json({ success: true, address });
//     } catch (err) {
//         console.error('Get address error:', err);
//         return res.status(500).json({ success: false, message: 'Server error' });
//     }
// };

// // Add this function to handle cart item removal
// const removeCartItem = async (req, res) => {
//     try {
//         const userId = req.session.user?._id;
//         const itemId = req.params.id;

//         console.log('Removing cart item - userId:', userId, 'itemId:', itemId);

//         if (!mongoose.Types.ObjectId.isValid(userId) || !mongoose.Types.ObjectId.isValid(itemId)) {
//             return res.status(400).json({ success: false, message: 'Invalid user or item ID' });
//         }

//         const cart = await Cart.findOne({ userId });
//         if (!cart) {
//             return res.status(404).json({ success: false, message: 'Cart not found' });
//         }

//         // Remove the item from cart
//         cart.items = cart.items.filter(item => item._id.toString() !== itemId);
//         await cart.save();

//         console.log('Item removed successfully');
//         return res.status(200).json({ success: true, message: 'Item removed from cart' });
//     } catch (err) {
//         console.error('Remove cart item error:', err);
//         return res.status(500).json({ success: false, message: 'Server error' });
//     }
// };

// module.exports = { 
//     getCheckoutPage, 
//     getAddressForEdit,
//     removeCartItem 
// };



const mongoose = require('mongoose');
const Cart = require('../../models/cartSchema');
const Address = require('../../models/addressSchema');
const Product = require('../../models/productSchema');
const User = require('../../models/userSchema');

const getCheckoutPage = async (req, res) => {
    try {
        console.log('Session data:', req.session);
        console.log('User in session:', req.session.user);

        const userId = req.session.user?._id || req.session.user?.id;
        console.log('Checkout - userId:', userId, 'isValid:', mongoose.Types.ObjectId.isValid(userId));

        if (!userId || !mongoose.Types.ObjectId.isValid(userId)) {
            console.warn('Invalid or missing userId in session');
            req.flash('error_msg', 'Please login first');
            return res.redirect('/login');
        }

        const user = await User.findById(userId);
        if (!user) {
            console.warn('User not found for userId:', userId);
            req.flash('error_msg', 'User not found. Please login again.');
            return res.redirect('/login');
        }

        const cart = await Cart.findOne({ userId }).populate({
            path: 'items.productId',
            select: 'productName images price salePrice variants stock isActive'
        });

        if (!cart || cart.items.length === 0) {
            req.flash('error_msg', 'Your cart is empty');
            return res.redirect('/cart');
        }
        console.log('Cart:', JSON.stringify(cart, null, 2));

        const cartItems = cart.items
            .map(item => {
                const product = item.productId;

                if (!product) {
                    console.warn(`Skipping missing product for item: ${item._id}`);
                    return null;
                }     
                console.log(`Product: ${product.productName}, isActive: ${product.isActive}, Variant Size: ${item.variantSize}`);

                const variant = product.variants?.find(v => v.size === item.variantSize) || {};
               
                let actualStock = 0;
                if (variant && typeof variant.stock === 'number') {
                    actualStock = variant.stock;
                } else if (typeof product.stock === 'number') {
                    actualStock = product.stock;
                }
                if (isNaN(actualStock)) {
                    actualStock = 0;
                }

                console.log(`Product: ${product.productName}, Variant Stock: ${variant.stock}, Product Stock: ${product.stock}, Actual Stock: ${actualStock}`);

                return {
                    _id: item._id, // CRITICAL: Include item ID for removal
                    productId: {
                        _id: product._id,
                        productName: product.productName || 'Unknown Product',
                        images: product.images?.length ? product.images : ['default.jpg'],
                        price: product.price || 0,
                        salePrice: product.salePrice || 0,
                        stock: actualStock,
                        isActive: product.isActive || false
                    },
                    variant: {
                        size: variant.size || item.variantSize || 'N/A',
                        price: variant.price || product.price || 0,
                        salePrice: variant.salePrice || product.salePrice || 0,
                        stock: actualStock
                    },
                    quantity: item.quantity,
                    price: item.price || (variant.salePrice || variant.price || product.salePrice || product.price || 0)
                };
            })
            .filter(item => item !== null);

        console.log('Cart Items:', JSON.stringify(cartItems, null, 2));

        const outOfStockItems = cartItems.filter(item => item.variant.stock <= 0 || item.productId.stock <= 0);
        if (outOfStockItems.length > 0) {
            console.log('Out of stock items:', outOfStockItems.map(item => ({
                name: item.productId.productName,
                variantStock: item.variant.stock,
                productStock: item.productId.stock
            })));
        }

        const subtotal = cartItems.reduce((sum, item) => {
            const price = item.variant?.salePrice || item.variant?.price || item.price || 0;
            return sum + (price * item.quantity);
        }, 0);

        const userAddress = await Address.findOne({ userId });
        const addresses = userAddress ? userAddress.address.filter(addr => addr && addr._id) : [];

        console.log('Checkout data:', {
            userId,
            totalItems: cartItems.length,
            outOfStockCount: outOfStockItems.length,
            addressesCount: addresses.length,
            subtotal
        });

        const discount = 0; 
        const total = subtotal - discount;

        res.render('checkout', {
            cartItems,
            addresses,
            subtotal: Math.round(subtotal),
            discount: Math.round(discount),
            total: Math.round(total),
            success_msg: req.flash('success_msg'),
            error_msg: req.flash('error_msg')
        });
    } catch (err) {
        console.error('Get checkout error:', err);
        req.flash('error_msg', 'Server error. Please try again.');
        res.redirect('/cart');
    }
};

const getAddressForEdit = async (req, res) => {
    try {
        const userId = req.session.user?._id;
        const addressId = req.params.id;

        console.log('Getting address for edit - userId:', userId, 'addressId:', addressId);

        if (!mongoose.Types.ObjectId.isValid(userId) || !mongoose.Types.ObjectId.isValid(addressId)) {
            return res.status(400).json({ success: false, message: 'Invalid user or address ID' });
        }

        const addressDoc = await Address.findOne({ userId });
        if (!addressDoc) {
            return res.status(404).json({ success: false, message: 'Address document not found' });
        }

        const address = addressDoc.address.find(addr => addr._id.toString() === addressId);
        if (!address) {
            return res.status(404).json({ success: false, message: 'Address not found' });
        }

        // Ensure all fields are present (fallback to empty strings to avoid undefined errors in modal)
        const safeAddress = {
            _id: address._id,
            addressType: address.addressType || '',
            name: address.name || '',
            phone: address.phone || '',
            houseName: address.houseName || '',
            buildingNumber: address.buildingNumber || '',
            landmark: address.landmark || '',
            altPhone: address.altPhone || '',
            nationality: address.nationality || '',
            city: address.city || '',
            state: address.state || '',
            pincode: address.pincode || '',
            isDefault: address.isDefault || false
        };

        console.log('Found address:', safeAddress);
        return res.status(200).json({ success: true, address: safeAddress });
    } catch (err) {
        console.error('Get address error:', err);
        return res.status(500).json({ success: false, message: 'Server error' });
    }
};

const removeCartItem = async (req, res) => {
    try {
        const userId = req.session.user?._id;
        const itemId = req.params.id;

        console.log('Removing cart item - userId:', userId, 'itemId:', itemId);

        if (!mongoose.Types.ObjectId.isValid(userId) || !mongoose.Types.ObjectId.isValid(itemId)) {
            return res.status(400).json({ success: false, message: 'Invalid user or item ID' });
        }

        const cart = await Cart.findOne({ userId });
        if (!cart) {
            return res.status(404).json({ success: false, message: 'Cart not found' });
        }

        // Remove the item from cart
        cart.items = cart.items.filter(item => item._id.toString() !== itemId);
        await cart.save();

        // Optional: Recalculate subtotal after removal (return it for potential AJAX UI update without reload)
        const newSubtotal = cart.items.reduce((sum, item) => sum + (item.price * item.quantity), 0);

        console.log('Item removed successfully');
        return res.status(200).json({ 
            success: true, 
            message: 'Item removed from cart',
            newSubtotal: newSubtotal,
            remainingItems: cart.items.length
        });
    } catch (err) {
        console.error('Remove cart item error:', err);
        return res.status(500).json({ success: false, message: 'Server error' });
    }
};

module.exports = { 
    getCheckoutPage, 
    getAddressForEdit,
    removeCartItem 
};