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



// const mongoose = require('mongoose');
// const Cart = require('../../models/cartSchema');
// const Address = require('../../models/addressSchema');
// const Product = require('../../models/productSchema');
// const User = require('../../models/userSchema');

// const getCheckoutPage = async (req, res) => {
//     try {
//         console.log('Session data:', req.session);
//         console.log('User in session:', req.session.user);

//         const userId = req.session.user?.id || req.session.user?._id;
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
//                     _id: item._id, // CRITICAL: Include item ID for removal
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
//         // ✅ FIX: Try both 'id' and '_id'
//         const userId = req.session.user?.id || req.session.user?._id;
//         const addressId = req.params.id;

//         console.log('=== DEBUG getAddressForEdit ===');
//         console.log('Session user:', req.session.user);
//         console.log('userId:', userId);
//         console.log('userId type:', typeof userId);
//         console.log('addressId:', addressId);
//         console.log('==============================');

//         if (!mongoose.Types.ObjectId.isValid(userId) || !mongoose.Types.ObjectId.isValid(addressId)) {
//             console.log('VALIDATION FAILED');
//             return res.status(400).json({ success: false, message: 'Invalid user or address ID' });
//         }

//         const addressDoc = await Address.findOne({ userId });
//         console.log('Address document found:', addressDoc ? 'Yes' : 'No');
        
//         if (!addressDoc) {
//             return res.status(404).json({ success: false, message: 'Address document not found' });
//         }

//         console.log('Total addresses in document:', addressDoc.address.length);
//         console.log('Looking for addressId:', addressId);
        
//         const address = addressDoc.address.find(addr => {
//             console.log('Comparing:', addr._id.toString(), 'with', addressId);
//             return addr._id.toString() === addressId;
//         });
        
//         if (!address) {
//             console.log('ADDRESS NOT FOUND IN ARRAY');
//             return res.status(404).json({ success: false, message: 'Address not found' });
//         }

//         const safeAddress = {
//             _id: address._id,
//             addressType: address.addressType || '',
//             name: address.name || '',
//             phone: address.phone || '',
//             houseName: address.houseName || '',
//             buildingNumber: address.buildingNumber || '',
//             landmark: address.landmark || '',
//             altPhone: address.altPhone || '',
//             nationality: address.nationality || '',
//             city: address.city || '',
//             state: address.state || '',
//             pincode: address.pincode || '',
//             isDefault: address.isDefault || false
//         };

//         console.log('Sending address:', safeAddress);
//         return res.status(200).json({ success: true, address: safeAddress });
//     } catch (err) {
//         console.error('Get address error:', err);
//         return res.status(500).json({ success: false, message: 'Server error' });
//     }
// };

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

//         // Optional: Recalculate subtotal after removal (return it for potential AJAX UI update without reload)
//         const newSubtotal = cart.items.reduce((sum, item) => sum + (item.price * item.quantity), 0);

//         console.log('Item removed successfully');
//         return res.status(200).json({ 
//             success: true, 
//             message: 'Item removed from cart',
//             newSubtotal: newSubtotal,
//             remainingItems: cart.items.length
//         });
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
const Order=require('../../models/orderSchema')

const getCheckoutPage = async (req, res) => {
    try {
        console.log('Session data:', req.session);
        console.log('User in session:', req.session.user);

        // ✅ Handle both 'id' and '_id' formats
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
                    _id: item._id,
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
        // ✅ FIX: Handle both 'id' and '_id' formats
        const userId = req.session.user?.id || req.session.user?._id;
        const addressId = req.params.id;

        console.log('Getting address for edit - userId:', userId, 'addressId:', addressId);

        if (!mongoose.Types.ObjectId.isValid(userId) || !mongoose.Types.ObjectId.isValid(addressId)) {
            console.log('Validation failed - userId valid:', mongoose.Types.ObjectId.isValid(userId), 'addressId valid:', mongoose.Types.ObjectId.isValid(addressId));
            return res.status(400).json({ success: false, message: 'Invalid user or address ID' });
        }

        const addressDoc = await Address.findOne({ userId });
        if (!addressDoc) {
            console.log('Address document not found for userId:', userId);
            return res.status(404).json({ success: false, message: 'Address document not found' });
        }

        console.log('Found address document with', addressDoc.address.length, 'addresses');

        const address = addressDoc.address.find(addr => addr._id.toString() === addressId);
        if (!address) {
            console.log('Address not found in document. Looking for:', addressId);
            console.log('Available addresses:', addressDoc.address.map(a => a._id.toString()));
            return res.status(404).json({ success: false, message: 'Address not found' });
        }

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

        console.log('Successfully found and returning address');
        return res.status(200).json({ success: true, address: safeAddress });
    } catch (err) {
        console.error('Get address error:', err);
        return res.status(500).json({ success: false, message: 'Server error' });
    }
};


const addAddress = async (req, res) => {
    try {
        const userId = req.session.user?.id || req.session.user?._id;
        const { addressType, name, phone, houseName, buildingNumber, landmark, altPhone, nationality, city, state, pincode, isDefault } = req.body;

        console.log('Adding new address for userId:', userId);

        if (!mongoose.Types.ObjectId.isValid(userId)) {
            return res.status(400).json({ success: false, message: 'Invalid user ID' });
        }

        // Validation
        if (!addressType || !name || !phone || !houseName || !landmark || !nationality || !city || !state || !pincode) {
            return res.status(400).json({ success: false, message: 'All required fields must be filled' });
        }

        if (!/^\d{10}$/.test(phone)) {
            return res.status(400).json({ success: false, message: 'Phone number must be 10 digits' });
        }

        if (!/^\d{6}$/.test(pincode)) {
            return res.status(400).json({ success: false, message: 'Pincode must be 6 digits' });
        }

        if (altPhone && !/^\d{10}$/.test(altPhone)) {
            return res.status(400).json({ success: false, message: 'Alternative phone must be 10 digits' });
        }

        let addressDoc = await Address.findOne({ userId });

        const newAddress = {
            addressType,
            name,
            phone,
            houseName,
            buildingNumber: buildingNumber || '',
            landmark,
            altPhone: altPhone || '',
            nationality,
            city,
            state,
            pincode,
            isDefault: isDefault || false
        };

        if (!addressDoc) {
            // Create new address document
            addressDoc = new Address({
                userId,
                address: [newAddress]
            });
        } else {
            // If setting as default, unset all other defaults
            if (isDefault) {
                addressDoc.address.forEach(addr => {
                    addr.isDefault = false;
                });
            }
            addressDoc.address.push(newAddress);
        }

        await addressDoc.save();

        console.log('Address added successfully');
        return res.status(200).json({ success: true, message: 'Address added successfully' });
    } catch (err) {
        console.error('Add address error:', err);
        return res.status(500).json({ success: false, message: 'Server error' });
    }
};

const editAddress = async (req, res) => {
    try {
        const userId = req.session.user?.id || req.session.user?._id;
        const addressId = req.params.id;
        const { addressType, name, phone, houseName, buildingNumber, landmark, altPhone, nationality, city, state, pincode, isDefault } = req.body;

        console.log('Editing address - userId:', userId, 'addressId:', addressId);

        if (!mongoose.Types.ObjectId.isValid(userId) || !mongoose.Types.ObjectId.isValid(addressId)) {
            return res.status(400).json({ success: false, message: 'Invalid user or address ID' });
        }

        // Validation
        if (!addressType || !name || !phone || !houseName || !landmark || !nationality || !city || !state || !pincode) {
            return res.status(400).json({ success: false, message: 'All required fields must be filled' });
        }

        if (!/^\d{10}$/.test(phone)) {
            return res.status(400).json({ success: false, message: 'Phone number must be 10 digits' });
        }

        if (!/^\d{6}$/.test(pincode)) {
            return res.status(400).json({ success: false, message: 'Pincode must be 6 digits' });
        }

        if (altPhone && !/^\d{10}$/.test(altPhone)) {
            return res.status(400).json({ success: false, message: 'Alternative phone must be 10 digits' });
        }

        const addressDoc = await Address.findOne({ userId });
        if (!addressDoc) {
            return res.status(404).json({ success: false, message: 'Address document not found' });
        }

        const addressIndex = addressDoc.address.findIndex(addr => addr._id.toString() === addressId);
        if (addressIndex === -1) {
            return res.status(404).json({ success: false, message: 'Address not found' });
        }

        // If setting as default, unset all other defaults
        if (isDefault) {
            addressDoc.address.forEach(addr => {
                addr.isDefault = false;
            });
        }

        // Update the address
        addressDoc.address[addressIndex] = {
            _id: addressDoc.address[addressIndex]._id,
            addressType,
            name,
            phone,
            houseName,
            buildingNumber: buildingNumber || '',
            landmark,
            altPhone: altPhone || '',
            nationality,
            city,
            state,
            pincode,
            isDefault: isDefault || false
        };

        await addressDoc.save();

        console.log('Address updated successfully');
        return res.status(200).json({ success: true, message: 'Address updated successfully' });
    } catch (err) {
        console.error('Edit address error:', err);
        return res.status(500).json({ success: false, message: 'Server error' });
    }
};

const deleteAddress = async (req, res) => {
    try {
        const userId = req.session.user?.id || req.session.user?._id;
        const addressId = req.params.id;

        console.log('Deleting address - userId:', userId, 'addressId:', addressId);

        if (!mongoose.Types.ObjectId.isValid(userId) || !mongoose.Types.ObjectId.isValid(addressId)) {
            return res.status(400).json({ success: false, message: 'Invalid user or address ID' });
        }

        const addressDoc = await Address.findOne({ userId });
        if (!addressDoc) {
            return res.status(404).json({ success: false, message: 'Address document not found' });
        }

        // Remove the address
        addressDoc.address = addressDoc.address.filter(addr => addr._id.toString() !== addressId);
        await addressDoc.save();

        console.log('Address deleted successfully');
        return res.status(200).json({ success: true, message: 'Address deleted successfully' });
    } catch (err) {
        console.error('Delete address error:', err);
        return res.status(500).json({ success: false, message: 'Server error' });
    }
};

// const placeOrder = async (req, res) => {
//     try {
//         const userId = req.session.user?.id || req.session.user?._id;
//         const { addressId, paymentMethod, couponCode } = req.body;

//         console.log('Placing order - userId:', userId, 'addressId:', addressId, 'paymentMethod:', paymentMethod);

//         if (!mongoose.Types.ObjectId.isValid(userId)) {
//             return res.status(400).json({ success: false, message: 'Invalid user ID' });
//         }

//         if (!addressId || !mongoose.Types.ObjectId.isValid(addressId)) {
//             return res.status(400).json({ success: false, message: 'Please select a valid delivery address' });
//         }

//         if (!paymentMethod) {
//             return res.status(400).json({ success: false, message: 'Please select a payment method' });
//         }

//         // Get cart
//         const cart = await Cart.findOne({ userId }).populate({
//             path: 'items.productId',
//             select: 'productName price salePrice variants stock'
//         });

//         if (!cart || cart.items.length === 0) {
//             return res.status(400).json({ success: false, message: 'Your cart is empty' });
//         }

//         // Verify address belongs to user
//         const addressDoc = await Address.findOne({ userId });
//         if (!addressDoc) {
//             return res.status(404).json({ success: false, message: 'Address not found' });
//         }

//         const deliveryAddress = addressDoc.address.find(addr => addr._id.toString() === addressId);
//         if (!deliveryAddress) {
//             return res.status(404).json({ success: false, message: 'Selected address not found' });
//         }

//         // Check stock availability
//         for (const item of cart.items) {
//             const product = item.productId;
//             if (!product) {
//                 return res.status(400).json({ success: false, message: 'Some products are no longer available' });
//             }

//             const variant = product.variants?.find(v => v.size === item.variantSize);
//             const availableStock = variant?.stock ?? product.stock ?? 0;

//             if (availableStock < item.quantity) {
//                 return res.status(400).json({ 
//                     success: false, 
//                     message: `${product.productName} (${item.variantSize}ml) is out of stock or has insufficient stock` 
//                 });
//             }
//         }

//         // Calculate totals
//         let subtotal = 0;
//         const orderItems = [];

//         for (const item of cart.items) {
//             const product = item.productId;
//             const variant = product.variants?.find(v => v.size === item.variantSize);
//             const price = variant?.salePrice || variant?.price || product.salePrice || product.price || 0;
//             const itemTotal = price * item.quantity;
//             subtotal += itemTotal;

//             orderItems.push({
//                 productId: product._id,
//                 productName: product.productName,
//                 variantSize: item.variantSize,
//                 quantity: item.quantity,
//                 price: price,
//                 total: itemTotal
//             });
//         }

//         // Apply coupon discount if provided
//         let discount = 0;
//         // TODO: Implement coupon validation and discount calculation
//         // if (couponCode) {
//         //     const coupon = await Coupon.findOne({ code: couponCode, isActive: true });
//         //     if (coupon) {
//         //         discount = calculateDiscount(subtotal, coupon);
//         //     }
//         // }

//         const total = subtotal - discount;

//         // Create order (you'll need to create Order model)
//         // For now, we'll just create a simple order object
//         const orderData = {
//             userId,
//             orderId: `ORD${Date.now()}`, // Generate unique order ID
//             items: orderItems,
//             deliveryAddress: {
//                 name: deliveryAddress.name,
//                 phone: deliveryAddress.phone,
//                 houseName: deliveryAddress.houseName,
//                 buildingNumber: deliveryAddress.buildingNumber,
//                 landmark: deliveryAddress.landmark,
//                 city: deliveryAddress.city,
//                 state: deliveryAddress.state,
//                 pincode: deliveryAddress.pincode,
//                 addressType: deliveryAddress.addressType
//             },
//             paymentMethod,
//             subtotal,
//             discount,
//             total,
//             status: 'Pending',
//             paymentStatus: paymentMethod === 'cod' ? 'Pending' : 'Pending',
//             orderedAt: new Date()
//         };

//         // TODO: Save order to database
//         // const order = new Order(orderData);
//         // await order.save();

//         // Update stock without triggering validation
//         for (const item of cart.items) {
//             const product = await Product.findById(item.productId._id);
//             if (product) {
//                 const variantIndex = product.variants?.findIndex(v => v.size === item.variantSize);
//                 if (variantIndex !== -1 && product.variants[variantIndex]) {
//                     // Update specific variant stock
//                     const updateField = `variants.${variantIndex}.stock`;
//                     await Product.findByIdAndUpdate(
//                         item.productId._id,
//                         { $inc: { [updateField]: -item.quantity } },
//                         { runValidators: false }
//                     );
//                 } else if (typeof product.stock === 'number') {
//                     // Update general stock
//                     await Product.findByIdAndUpdate(
//                         item.productId._id,
//                         { $inc: { stock: -item.quantity } },
//                         { runValidators: false }
//                     );
//                 }
//             }
//         }

//         // Clear cart
//         cart.items = [];
//         await cart.save();

//         console.log('Order placed successfully:', orderData.orderId);

//         return res.status(200).json({ 
//             success: true, 
//             message: 'Order placed successfully',
//             orderId: orderData.orderId
//         });

//     } catch (err) {
//         console.error('Place order error:', err);
//         return res.status(500).json({ success: false, message: 'Server error. Please try again.' });
//     }
// };





// const placeOrder = async (req, res) => {
//   try {
//     const userId = req.session.user?.id || req.session.user?._id;
//     const { addressId, paymentMethod, couponCode } = req.body;

//     console.log('Placing order - userId:', userId, 'addressId:', addressId, 'paymentMethod:', paymentMethod);

//     if (!mongoose.Types.ObjectId.isValid(userId)) {
//       return res.status(400).json({ success: false, message: 'Invalid user ID' });
//     }

//     if (!addressId || !mongoose.Types.ObjectId.isValid(addressId)) {
//       return res.status(400).json({ success: false, message: 'Please select a valid delivery address' });
//     }

//     if (!paymentMethod) {
//       return res.status(400).json({ success: false, message: 'Please select a payment method' });
//     }

//     // Get cart
//     const cart = await Cart.findOne({ userId }).populate({
//       path: 'items.productId',
//       select: 'productName price salePrice variants stock',
//     });

//     if (!cart || cart.items.length === 0) {
//       return res.status(400).json({ success: false, message: 'Your cart is empty' });
//     }

//     // Verify address belongs to user
//     const addressDoc = await Address.findOne({ userId });
//     if (!addressDoc) {
//       return res.status(404).json({ success: false, message: 'Address not found' });
//     }

//     const deliveryAddress = addressDoc.address.find((addr) => addr._id.toString() === addressId);
//     if (!deliveryAddress) {
//       return res.status(404).json({ success: false, message: 'Selected address not found' });
//     }

//     // Check stock availability
//     for (const item of cart.items) {
//       const product = item.productId;
//       if (!product) {
//         return res.status(400).json({ success: false, message: 'Some products are no longer available' });
//       }

//       const variant = product.variants?.find((v) => v.size === item.variantSize);
//       const availableStock = variant?.stock ?? product.stock ?? 0;

//       if (availableStock < item.quantity) {
//         return res.status(400).json({
//           success: false,
//           message: `${product.productName} (${item.variantSize}ml) is out of stock or has insufficient stock`,
//         });
//       }
//     }

//     // Calculate totals
//     let subtotal = 0;
//     const orderItems = [];

//     for (const item of cart.items) {
//       const product = item.productId;
//       const variant = product.variants?.find((v) => v.size === item.variantSize);
//       const price = variant?.salePrice || variant?.price || product.salePrice || product.price || 0;
//       const itemTotal = price * item.quantity;
//       subtotal += itemTotal;

//       orderItems.push({
//         product: product._id, // Changed from productId to match schema
//         productName: product.productName,
//         variantSize: item.variantSize,
//         quantity: item.quantity,
//         price: price,
//         total: itemTotal,
//       });
//     }

//     // Apply coupon discount if provided
//     let discount = 0;
//     let couponApplied = false;
//     let appliedCouponCode = null;
//     // TODO: Implement coupon validation and discount calculation
//     // if (couponCode) {
//     //   const coupon = await Coupon.findOne({ code: couponCode, isActive: true });
//     //   if (coupon) {
//     //     discount = calculateDiscount(subtotal, coupon);
//     //     couponApplied = true;
//     //     appliedCouponCode = couponCode;
//     //   }
//     // }

//     const finalAmount = subtotal - discount;

//     // Create order
//     const orderData = {
//       user: userId, // Changed from userId to user to match schema
//       orderItems, // Changed from items to orderItems to match schema
//       totalPrice: subtotal, // Changed from subtotal to totalPrice
//       discount,
//       finalAmount, // Changed from total to finalAmount
//       deliveryAddress: {
//         name: deliveryAddress.name,
//         phone: deliveryAddress.phone,
//         houseName: deliveryAddress.houseName,
//         buildingNumber: deliveryAddress.buildingNumber,
//         landmark: deliveryAddress.landmark,
//         city: deliveryAddress.city,
//         state: deliveryAddress.state,
//         pincode: deliveryAddress.pincode,
//         addressType: deliveryAddress.addressType,
//       },
//       paymentMethod,
//       paymentStatus: paymentMethod === 'COD' ? 'Pending' : 'Pending',
//       couponApplied,
//       couponCode: appliedCouponCode,
//       status: 'Pending',
//       createdOn: new Date(),
//     };

//     // Save order to database
//     const order = new Order(orderData);
//     await order.save();

//     // Update stock
//     for (const item of cart.items) {
//       const product = await Product.findById(item.productId._id);
//       if (product) {
//         const variantIndex = product.variants?.findIndex((v) => v.size === item.variantSize);
//         if (variantIndex !== -1 && product.variants[variantIndex]) {
//           const updateField = `variants.${variantIndex}.stock`;
//           await Product.findByIdAndUpdate(
//             item.productId._id,
//             { $inc: { [updateField]: -item.quantity } },
//             { runValidators: false }
//           );
//         } else if (typeof product.stock === 'number') {
//           await Product.findByIdAndUpdate(
//             item.productId._id,
//             { $inc: { stock: -item.quantity } },
//             { runValidators: false }
//           );
//         }
//       }
//     }

//     // Clear cart
//     cart.items = [];
//     await cart.save();

//     console.log('Order placed successfully:', order.orderId);

//     // Set success flash message
//     req.flash('success', 'Order placed successfully!');

//     return res.status(200).json({
//       success: true,
//       message: 'Order placed successfully',
//       orderId: order.orderId,
//     });
//   } catch (err) {
//     console.error('Place order error:', err);
//     return res.status(500).json({ success: false, message: 'Server error. Please try again.' });
//   }
// };


// const placeOrder = async (req, res) => {
//   try {
//     const userId = req.session.user?.id || req.session.user?._id;
//     const { addressId, paymentMethod, couponCode } = req.body;

//     console.log('Placing order - userId:', userId, 'addressId:', addressId, 'paymentMethod:', paymentMethod);

//     if (!mongoose.Types.ObjectId.isValid(userId)) {
//       return res.status(400).json({ success: false, message: 'Invalid user ID' });
//     }

//     if (!addressId || !mongoose.Types.ObjectId.isValid(addressId)) {
//       return res.status(400).json({ success: false, message: 'Please select a valid delivery address' });
//     }

//     if (!paymentMethod) {
//       return res.status(400).json({ success: false, message: 'Please select a payment method' });
//     }

//     // Get cart
//     const cart = await Cart.findOne({ userId }).populate({
//       path: 'items.productId',
//       select: 'productName price salePrice variants stock',
//     });

//     if (!cart || cart.items.length === 0) {
//       return res.status(400).json({ success: false, message: 'Your cart is empty' });
//     }

//     // Verify address belongs to user
//     const addressDoc = await Address.findOne({ userId });
//     if (!addressDoc) {
//       return res.status(404).json({ success: false, message: 'Address not found' });
//     }

//     const deliveryAddress = addressDoc.address.find((addr) => addr._id.toString() === addressId);
//     if (!deliveryAddress) {
//       return res.status(404).json({ success: false, message: 'Selected address not found' });
//     }

//     // Check stock availability
//     for (const item of cart.items) {
//       const product = item.productId;
//       if (!product) {
//         return res.status(400).json({ success: false, message: 'Some products are no longer available' });
//       }

//       const variant = product.variants?.find((v) => v.size === item.variantSize);
//       const availableStock = variant?.stock ?? product.stock ?? 0;

//       if (availableStock < item.quantity) {
//         return res.status(400).json({
//           success: false,
//           message: `${product.productName} (${item.variantSize}ml) is out of stock or has insufficient stock`,
//         });
//       }
//     }

//     // Calculate totals
//     let subtotal = 0;
//     const orderItems = [];

//     for (const item of cart.items) {
//       const product = item.productId;
//       const variant = product.variants?.find((v) => v.size === item.variantSize);
//       const price = variant?.salePrice || variant?.price || product.salePrice || product.price || 0;
//       const itemTotal = price * item.quantity;
//       subtotal += itemTotal;

//       orderItems.push({
//         product: product._id,
//         productName: product.productName,
//         variantSize: item.variantSize,
//         quantity: item.quantity,
//         price: price,
//         total: itemTotal,
//       });
//     }

//     // Apply coupon discount if provided
//     let discount = 0;
//     let couponApplied = false;
//     let appliedCouponCode = null;
//     // TODO: Implement coupon validation and discount calculation
//     // if (couponCode) {
//     //   const coupon = await Coupon.findOne({ code: couponCode, isActive: true });
//     //   if (coupon) {
//     //     discount = calculateDiscount(subtotal, coupon);
//     //     couponApplied = true;
//     //     appliedCouponCode = couponCode;
//     //   }
//     // }

//     const finalAmount = subtotal - discount;

//     // Create order
//     const orderData = {
//       user: userId,
//       orderItems,
//       totalPrice: subtotal,
//       discount,
//       finalAmount,
//       deliveryAddress: {
//         name: deliveryAddress.name,
//         phone: deliveryAddress.phone,
//         houseName: deliveryAddress.houseName,
//         buildingNumber: deliveryAddress.buildingNumber,
//         landmark: deliveryAddress.landmark,
//         city: deliveryAddress.city,
//         state: deliveryAddress.state,
//         pincode: deliveryAddress.pincode,
//         addressType: deliveryAddress.addressType,
//       },
//       paymentMethod,
//       paymentStatus: paymentMethod === 'COD' ? 'Pending' : 'Pending',
//       couponApplied,
//       couponCode: appliedCouponCode,
//       status: 'Pending',
//       createdOn: new Date(),
//     };

//     // Save order to database
//     const order = new Order(orderData);
//     await order.save();

//     // Update stock
//     for (const item of cart.items) {
//       const product = await Product.findById(item.productId._id);
//       if (product) {
//         const variantIndex = product.variants?.findIndex((v) => v.size === item.variantSize);
//         if (variantIndex !== -1 && product.variants[variantIndex]) {
//           const updateField = `variants.${variantIndex}.stock`;
//           await Product.findByIdAndUpdate(
//             item.productId._id,
//             { $inc: { [updateField]: -item.quantity } },
//             { runValidators: false }
//           );
//         } else if (typeof product.stock === 'number') {
//           await Product.findByIdAndUpdate(
//             item.productId._id,
//             { $inc: { stock: -item.quantity } },
//             { runValidators: false }
//           );
//         }
//       }
//     }

//     // Clear cart
//     cart.items = [];
//     await cart.save();

//     console.log('Order placed successfully:', order.orderId);

//     // Set success flash message
//     req.flash('success', 'Order placed successfully!');

//     return res.status(200).json({
//       success: true,
//       message: 'Order placed successfully',
//       orderId: order.orderId,
//     });
//   } catch (err) {
//     console.error('Place order error:', err);
//     return res.status(500).json({ success: false, message: 'Server error. Please try again.' });
//   }
// };


const placeOrder = async (req, res) => {
  try {
    const userId = req.session.user?.id || req.session.user?._id;
    const { addressId, paymentMethod, couponCode } = req.body;

    console.log('Placing order - userId:', userId, 'addressId:', addressId, 'paymentMethod:', paymentMethod);

    if (!mongoose.Types.ObjectId.isValid(userId)) {
      return res.status(400).json({ success: false, message: 'Invalid user ID' });
    }

    if (!addressId || !mongoose.Types.ObjectId.isValid(addressId)) {
      return res.status(400).json({ success: false, message: 'Please select a valid delivery address' });
    }

    if (!paymentMethod) {
      return res.status(400).json({ success: false, message: 'Please select a payment method' });
    }

  
    let normalizedPaymentMethod;
    if (paymentMethod.toLowerCase() === 'cod') {
      normalizedPaymentMethod = 'COD';
    } else if (paymentMethod.toLowerCase() === 'online payment') {
      normalizedPaymentMethod = 'Online Payment';
    } else if (paymentMethod.toLowerCase() === 'wallet') {
      normalizedPaymentMethod = 'Wallet';
    } else {
      return res.status(400).json({ success: false, message: 'Invalid payment method' });
    }

    // Get cart
    const cart = await Cart.findOne({ userId }).populate({
      path: 'items.productId',
      select: 'productName price salePrice variants stock',
    });

    if (!cart || cart.items.length === 0) {
      return res.status(400).json({ success: false, message: 'Your cart is empty' });
    }

   
    const addressDoc = await Address.findOne({ userId });
    if (!addressDoc) {
      return res.status(404).json({ success: false, message: 'Address not found' });
    }

    const deliveryAddress = addressDoc.address.find((addr) => addr._id.toString() === addressId);
    if (!deliveryAddress) {
      return res.status(404).json({ success: false, message: 'Selected address not found' });
    }

 
    for (const item of cart.items) {
      const product = item.productId;
      if (!product) {
        return res.status(400).json({ success: false, message: 'Some products are no longer available' });
      }

      const variant = product.variants?.find((v) => v.size === item.variantSize);
      const availableStock = variant?.stock ?? product.stock ?? 0;

      if (availableStock < item.quantity) {
        return res.status(400).json({
          success: false,
          message: `${product.productName} (${item.variantSize}ml) is out of stock or has insufficient stock`,
        });
      }
    }


    let subtotal = 0;
    const orderItems = [];

    for (const item of cart.items) {
      const product = item.productId;
      const variant = product.variants?.find((v) => v.size === item.variantSize);
      const price = variant?.salePrice || variant?.price || product.salePrice || product.price || 0;
      const itemTotal = price * item.quantity;
      subtotal += itemTotal;

      orderItems.push({
        product: product._id,
        productName: product.productName,
        variantSize: item.variantSize,
        quantity: item.quantity,
        price: price,
        total: itemTotal,
      });
    }

    // Apply coupon discount if provided
    let discount = 0;
    let couponApplied = false;
    let appliedCouponCode = null;
    // TODO: Implement coupon validation and discount calculation
    // if (couponCode) {
    //   const coupon = await Coupon.findOne({ code: couponCode, isActive: true });
    //   if (coupon) {
    //     discount = calculateDiscount(subtotal, coupon);
    //     couponApplied = true;
    //     appliedCouponCode = couponCode;
    //   }
    // }

    const finalAmount = subtotal - discount;


    const orderData = {
      user: userId,
      orderItems,
      totalPrice: subtotal,
      discount,
      finalAmount,
      deliveryAddress: {
        name: deliveryAddress.name,
        phone: deliveryAddress.phone,
        houseName: deliveryAddress.houseName,
        buildingNumber: deliveryAddress.buildingNumber,
        landmark: deliveryAddress.landmark,
        city: deliveryAddress.city,
        state: deliveryAddress.state,
        pincode: deliveryAddress.pincode,
        addressType: deliveryAddress.addressType,
      },
      paymentMethod: normalizedPaymentMethod, // Use normalized value
      paymentStatus: normalizedPaymentMethod === 'COD' ? 'Pending' : 'Pending',
      couponApplied,
      couponCode: appliedCouponCode,
      status: 'Pending',
      createdOn: new Date(),
    };

    // Save order to database
    const order = new Order(orderData);
    await order.save();

    // Update stock
    for (const item of cart.items) {
      const product = await Product.findById(item.productId._id);
      if (product) {
        const variantIndex = product.variants?.findIndex((v) => v.size === item.variantSize);
        if (variantIndex !== -1 && product.variants[variantIndex]) {
          const updateField = `variants.${variantIndex}.stock`;
          await Product.findByIdAndUpdate(
            item.productId._id,
            { $inc: { [updateField]: -item.quantity } },
            { runValidators: false }
          );
        } else if (typeof product.stock === 'number') {
          await Product.findByIdAndUpdate(
            item.productId._id,
            { $inc: { stock: -item.quantity } },
            { runValidators: false }
          );
        }
      }
    }

    // Clear cart
    cart.items = [];
    await cart.save();

    console.log('Order placed successfully:', order.orderId);

    // Set success flash message
    req.flash('success', 'Order placed successfully!');

    return res.status(200).json({
      success: true,
      message: 'Order placed successfully',
      orderId: order.orderId,
    });
  } catch (err) {
    console.error('Place order error:', err.message, err.stack);
    return res.status(500).json({ success: false, message: 'Server error. Please try again.' });
  }
};



module.exports = { 
    getCheckoutPage, 
    getAddressForEdit,
    addAddress,
    editAddress,
    deleteAddress,
    placeOrder
};