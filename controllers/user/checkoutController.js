const mongoose = require('mongoose');
const Cart = require('../../models/cartSchema');
const Address = require('../../models/addressSchema');
const Product = require('../../models/productSchema');
const User = require('../../models/userSchema');
const Order = require('../../models/orderSchema');

const getCheckoutPage = async (req, res) => {
  try {
    console.log('=== CHECKOUT PAGE REQUEST ===');
    console.log('Session:', !!req.session);
    console.log('User:', !!req.session?.user);

    const userId = req.session?.user?._id || req.session?.user?.id;
    console.log('User ID:', userId);

    if (!userId || !mongoose.Types.ObjectId.isValid(userId)) {
      console.warn('Invalid/missing userId, redirecting to login');
      req.flash('error_msg', 'Please login first');
      return res.redirect('/login');
    }

    let user;
    try {
      user = await User.findById(userId).lean();
      if (!user) {
        console.warn('User not found in database');
        req.flash('error_msg', 'User not found. Please login again.');
        return res.redirect('/login');
      }
    } catch (dbErr) {
      console.error('Database error fetching user:', dbErr.message);
      req.flash('error_msg', 'Database error. Please try again.');
      return res.redirect('/login');
    }

    console.log('User found:', user.email);

    let cart;
    try {
      cart = await Cart.findOne({ userId })
        .populate({
          path: 'items.productId',
          select: 'productName images price salePrice variants stock isBlocked brand category',
          populate: [
            { path: 'brand', select: 'isBlocked brandName' },
            { path: 'category', select: 'isListed categoryName' }
          ]
        })
        .lean();

      if (!cart || !Array.isArray(cart.items) || cart.items.length === 0) {
        console.log('Cart is empty or not found');
        req.flash('error_msg', 'Your cart is empty');
        return res.redirect('/cart');
      }

      console.log('Cart found with', cart.items.length, 'items');
    } catch (cartErr) {
      console.error('Error fetching cart:', cartErr.message);
      req.flash('error_msg', 'Error loading cart. Please try again.');
      return res.redirect('/cart');
    }

    const blockedProducts = [];
    const validCartItems = [];

    cart.items.forEach((item, index) => {
      try {
        const product = item.productId;
        if (!product) {
          blockedProducts.push({ name: 'Unknown Product', reason: 'Product no longer exists' });
          return;
        }

        if (product.isBlocked === true) {
          blockedProducts.push({ name: product.productName, reason: 'This product has been blocked by admin' });
          return;
        }

        if (product.brand && product.brand.isBlocked === true) {
          blockedProducts.push({ name: product.productName, reason: 'Brand has been blocked by admin' });
          return;
        }

        if (product.category && product.category.isListed === false) {
          blockedProducts.push({ name: product.productName, reason: 'Product category has been delisted by admin' });
          return;
        }

        const variant = product.variants?.find(v => v.size === item.variantSize) || {};
        let actualStock = 0;

        if (variant && typeof variant.stock === 'number') actualStock = variant.stock;
        else if (typeof product.stock === 'number') actualStock = product.stock;
        if (isNaN(actualStock)) actualStock = 0;

        const cartItem = {
          _id: item._id,
          productId: {
            _id: product._id,
            productName: product.productName || 'Unknown Product',
            images: product.images?.length ? product.images : ['default.jpg'],
            price: product.price || 0,
            salePrice: product.salePrice || 0,
            stock: actualStock,
            isBlocked: product.isBlocked || false
          },
          variant: {
            size: variant.size || item.variantSize || 'N/A',
            price: variant.price || product.price || 0,
            salePrice: variant.salePrice || product.salePrice || 0,
            stock: actualStock
          },
          quantity: item.quantity || 1,
          price: item.price || (variant.salePrice || variant.price || product.salePrice || product.price || 0)
        };

        validCartItems.push(cartItem);
      } catch (itemErr) {
        console.error(`Error processing item ${index}:`, itemErr.message);
        blockedProducts.push({ name: 'Item', reason: 'Error processing this item' });
      }
    });

    console.log('Summary:', {
      totalItems: cart.items.length,
      blockedCount: blockedProducts.length,
      validCount: validCartItems.length
    });

    if (blockedProducts.length > 0) {
      return res.render('checkout', {
        cartItems: validCartItems,
        addresses: [],
        subtotal: 0,
        discount: 0,
        total: 0,
        blockedProducts: blockedProducts,
        success_msg: req.flash('success_msg') || [],
        error_msg: ['Some products in your cart have been blocked or delisted'],
        user: user
      });
    }

    if (validCartItems.length === 0) {
      req.flash('error_msg', 'Your cart contains no valid products');
      return res.redirect('/cart');
    }

    const outOfStockItems = validCartItems.filter(item => item.variant.stock <= 0 || item.productId.stock <= 0);

    const subtotal = validCartItems.reduce((sum, item) => {
      const price = item.variant?.salePrice || item.variant?.price || item.price || 0;
      const itemTotal = price * (item.quantity || 1);
      return sum + itemTotal;
    }, 0);

    let addresses = [];
    try {
      const userAddress = await Address.findOne({ userId }).lean();
      addresses = userAddress ? userAddress.address?.filter(addr => addr && addr._id) || [] : [];
    } catch (addrErr) {
      console.error('Error fetching addresses:', addrErr.message);
      addresses = [];
    }

    const discount = 0;
    const total = subtotal - discount;

    req.session.checkoutData = {
      userId,
      cartItems: validCartItems.map(item => ({
        productId: item.productId._id,
        productName: item.productId.productName,
        variantSize: item.variant?.size || 'N/A',
        quantity: item.quantity,
        price: item.variant?.salePrice || item.variant?.price || item.price,
        image: item.productId.images?.[0] || 'default.jpg'
      })),
      subtotal,
      discount,
      total,
      addressCount: addresses.length,
      validItems: validCartItems.length,
      outOfStockCount: outOfStockItems.length,
      timestamp: new Date()
    };

    await req.session.save();

    res.render('checkout', {
      cartItems: validCartItems,
      addresses,
      subtotal: Math.round(subtotal * 100) / 100,
      discount: Math.round(discount * 100) / 100,
      total: Math.round(total * 100) / 100,
      blockedProducts: [],
      success_msg: req.flash('success_msg') || [],
      error_msg: req.flash('error_msg') || [],
      user: user
    });
  } catch (err) {
    console.error('CRITICAL ERROR in getCheckoutPage:', err);
    req.flash('error_msg', 'Server error. Please try again.');
    res.redirect('/cart');
  }
};

const isValidIndianPincode = pincode => {
  if (!/^\d{6}$/.test(pincode)) return { valid: false, message: 'PIN code must be exactly 6 digits' };
  if (/^(\d)\1{5}$/.test(pincode)) return { valid: false, message: 'PIN code cannot have all same digits' };

  let isSequential = true;
  for (let i = 1; i < 6; i++) {
    if (parseInt(pincode[i]) - parseInt(pincode[i - 1]) !== 1) {
      isSequential = false;
      break;
    }
  }
  if (isSequential) return { valid: false, message: 'PIN code cannot be sequential digits' };

  let isReverseSequential = true;
  for (let i = 1; i < 6; i++) {
    if (parseInt(pincode[i - 1]) - parseInt(pincode[i]) !== 1) {
      isReverseSequential = false;
      break;
    }
  }
  if (isReverseSequential) return { valid: false, message: 'PIN code cannot be reverse sequential digits' };

  return { valid: true, message: 'Valid PIN code' };
};

const validateAddressInput = data => {
  const errors = [];
  const trimmedData = {};
  Object.keys(data).forEach(key => {
    trimmedData[key] = typeof data[key] === 'string' ? data[key].trim() : data[key];
  });

  if (!trimmedData.addressType) errors.push('Address type is required');
  else if (!['Home', 'Work', 'Other'].includes(trimmedData.addressType)) errors.push('Invalid address type');

  if (!trimmedData.name) errors.push('Full name is required');
  else {
    const name = trimmedData.name;
    if (name.length < 3) errors.push('Full name must be at least 3 characters');
    else if (name.length > 20) errors.push('Full name cannot exceed 20 characters');
    else if (!/^[a-zA-Z\\s\'-]+$/.test(name)) errors.push('Full name can only contain letters and spaces');
  }

  if (!trimmedData.phone) errors.push('Phone number is required');
  else if (!/^\d{10}$/.test(trimmedData.phone)) errors.push('Phone number must be 10 digits');

  if (!trimmedData.houseName) errors.push('House/Building name is required');
  if (!trimmedData.landmark) errors.push('Landmark is required');
  if (!trimmedData.city) errors.push('City is required');
  if (!trimmedData.state) errors.push('State is required');
  if (!trimmedData.pincode) errors.push('PIN code is required');

  return errors;
};

const getAddressForEdit = async (req, res) => {
  try {
    const userId = req.session.user?.id || req.session.user?._id;
    const addressId = req.params.id;
    if (!mongoose.Types.ObjectId.isValid(userId) || !mongoose.Types.ObjectId.isValid(addressId))
      return res.status(400).json({ success: false, message: 'Invalid IDs' });

    const addressDoc = await Address.findOne({ userId });
    if (!addressDoc) return res.status(404).json({ success: false, message: 'Address not found' });

    const address = addressDoc.address.find(addr => addr._id.toString() === addressId);
    if (!address) return res.status(404).json({ success: false, message: 'Address not found' });

    const safeAddress = {
      _id: address._id,
      addressType: address.addressType || '',
      name: address.name || '',
      phone: address.phone || '',
      houseName: address.houseName || '',
      buildingNumber: address.buildingNumber || '',
      landmark: address.landmark || '',
      altPhone: address.altPhone || '',
      nationality: address.nationality || 'India',
      city: address.city || '',
      state: address.state || '',
      pincode: address.pincode || '',
      isDefault: address.isDefault || false
    };

    return res.status(200).json({ success: true, address: safeAddress });
  } catch (err) {
    console.error('Get address error:', err);
    return res.status(500).json({ success: false, message: 'Server error' });
  }
};

const deleteAddress = async (req, res) => {
  try {
    const userId = req.session.user?.id || req.session.user?._id;
    const addressId = req.params.id;
    if (!mongoose.Types.ObjectId.isValid(userId) || !mongoose.Types.ObjectId.isValid(addressId))
      return res.status(400).json({ success: false, message: 'Invalid IDs' });

    const addressDoc = await Address.findOne({ userId });
    if (!addressDoc) return res.status(404).json({ success: false, message: 'Address document not found' });

    addressDoc.address = addressDoc.address.filter(addr => addr._id.toString() !== addressId);
    await addressDoc.save();
    return res.status(200).json({ success: true, message: 'Address deleted successfully' });
  } catch (err) {
    console.error('Delete address error:', err);
    return res.status(500).json({ success: false, message: 'Server error' });
  }
};

const addAddress = async (req, res) => {
  try {
    const userId = req.session.user?.id || req.session.user?._id;
    const {
      addressType,
      name,
      phone,
      houseName,
      buildingNumber,
      landmark,
      altPhone,
      nationality,
      city,
      state,
      pincode,
      isDefault
    } = req.body;

    if (!userId || !mongoose.Types.ObjectId.isValid(userId))
      return res.status(400).json({ success: false, message: 'Invalid user ID' });

    const validationErrors = validateAddressInput({
      addressType,
      name,
      phone,
      houseName,
      buildingNumber,
      landmark,
      altPhone,
      nationality,
      city,
      state,
      pincode
    });

    if (validationErrors.length > 0)
      return res.status(400).json({ success: false, message: validationErrors[0], errors: validationErrors });

    let addressDoc = await Address.findOne({ userId });

    const newAddress = {
      addressType: addressType.trim(),
      name: name.trim(),
      phone: phone.trim(),
      houseName: houseName.trim(),
      buildingNumber: buildingNumber ? buildingNumber.trim() : '',
      landmark: landmark.trim(),
      altPhone: altPhone ? altPhone.trim() : '',
      nationality: 'India',
      city: city.trim(),
      state: state.trim(),
      pincode: pincode.trim(),
      isDefault: isDefault || false
    };

    if (!addressDoc) {
      addressDoc = new Address({ userId, address: [newAddress] });
    } else {
      if (isDefault) addressDoc.address.forEach(addr => (addr.isDefault = false));
      addressDoc.address.push(newAddress);
    }

    await addressDoc.save();
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
    const {
      addressType,
      name,
      phone,
      houseName,
      buildingNumber,
      landmark,
      altPhone,
      nationality,
      city,
      state,
      pincode,
      isDefault
    } = req.body;

    if (!userId || !mongoose.Types.ObjectId.isValid(userId))
      return res.status(400).json({ success: false, message: 'Invalid user ID' });

    if (!addressId || !mongoose.Types.ObjectId.isValid(addressId))
      return res.status(400).json({ success: false, message: 'Invalid address ID' });

    const validationErrors = validateAddressInput({
      addressType,
      name,
      phone,
      houseName,
      buildingNumber,
      landmark,
      altPhone,
      nationality,
      city,
      state,
      pincode
    });

    if (validationErrors.length > 0)
      return res.status(400).json({ success: false, message: validationErrors[0], errors: validationErrors });

    const addressDoc = await Address.findOne({ userId });
    if (!addressDoc) return res.status(404).json({ success: false, message: 'Address document not found' });

    const addressIndex = addressDoc.address.findIndex(addr => addr._id.toString() === addressId);
    if (addressIndex === -1) return res.status(404).json({ success: false, message: 'Address not found' });

    if (isDefault) addressDoc.address.forEach(addr => (addr.isDefault = false));

    addressDoc.address[addressIndex] = {
      _id: addressDoc.address[addressIndex]._id,
      addressType: addressType.trim(),
      name: name.trim(),
      phone: phone.trim(),
      houseName: houseName.trim(),
      buildingNumber: buildingNumber ? buildingNumber.trim() : '',
      landmark: landmark.trim(),
      altPhone: altPhone ? altPhone.trim() : '',
      nationality: 'India',
      city: city.trim(),
      state: state.trim(),
      pincode: pincode.trim(),
      isDefault: isDefault || false
    };

    await addressDoc.save();
    return res.status(200).json({ success: true, message: 'Address updated successfully' });
  } catch (err) {
    console.error('Edit address error:', err);
    return res.status(500).json({ success: false, message: 'Server error' });
  }
};

module.exports = {
  getCheckoutPage,
  getAddressForEdit,
  addAddress,
  editAddress,
  deleteAddress,
  isValidIndianPincode,
  validateAddressInput
};
