
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
            select: 'productName images price salePrice variants stock isBlocked brand category',
            populate: [
                { path: 'brand', select: 'isBlocked brandName' },
                { path: 'category', select: 'isListed categoryName' }
            ]
        });

        if (!cart || cart.items.length === 0) {
            req.flash('error_msg', 'Your cart is empty');
            return res.redirect('/cart');
        }
        console.log('Cart loaded with', cart.items.length, 'items');

        // Track blocked and valid products
        const blockedProducts = [];
        const validCartItems = [];

        // Process each cart item
        cart.items.forEach(item => {
            const product = item.productId;

            // Check 1: Product doesn't exist
            if (!product) {
                console.warn(`Skipping missing product for item: ${item._id}`);
                blockedProducts.push({
                    name: 'Unknown Product',
                    reason: 'Product no longer exists'
                });
                return;
            }

            // Check 2: Product is blocked by admin
            if (product.isBlocked === true) {
                console.warn(`Product blocked: ${product.productName}`);
                blockedProducts.push({
                    name: product.productName,
                    reason: 'This product has been blocked by admin'
                });
                return;
            }

            // Check 3: Brand is blocked
            if (product.brand && product.brand.isBlocked === true) {
                console.warn(`Brand blocked for product: ${product.productName}`);
                blockedProducts.push({
                    name: product.productName,
                    reason: 'Brand has been blocked by admin'
                });
                return;
            }

            // Check 4: Category is not listed
            if (product.category && product.category.isListed === false) {
                console.warn(`Category blocked for product: ${product.productName}`);
                blockedProducts.push({
                    name: product.productName,
                    reason: 'Product category has been delisted by admin'
                });
                return;
            }

            // Product is valid - process it
            console.log(`✓ Product valid: ${product.productName}`);

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
                quantity: item.quantity,
                price: item.price || (variant.salePrice || variant.price || product.salePrice || product.price || 0)
            };

            validCartItems.push(cartItem);
        });

        console.log('Summary:', {
            totalInCart: cart.items.length,
            blockedCount: blockedProducts.length,
            validCount: validCartItems.length
        });

        // If blocked products exist, render checkout WITH blocked alert
        if (blockedProducts.length > 0) {
            console.log('Rendering checkout with blocked products alert:', blockedProducts);
            return res.render('checkout', {
                cartItems: validCartItems,
                addresses: [],
                subtotal: 0,
                discount: 0,
                total: 0,
                blockedProducts: blockedProducts,
                success_msg: [],
                error_msg: ['Some products in your cart have been blocked or delisted']
            });
        }

        // If no valid items after filtering
        if (validCartItems.length === 0) {
            req.flash('error_msg', 'Your cart contains no valid products');
            return res.redirect('/cart');
        }

        // Check for out of stock items
        const outOfStockItems = validCartItems.filter(item => item.variant.stock <= 0 || item.productId.stock <= 0);
        if (outOfStockItems.length > 0) {
            console.log('Out of stock items:', outOfStockItems.map(item => item.productId.productName));
        }

        // Calculate subtotal
        const subtotal = validCartItems.reduce((sum, item) => {
            const price = item.variant?.salePrice || item.variant?.price || item.price || 0;
            return sum + (price * item.quantity);
        }, 0);

        // Get user addresses
        const userAddress = await Address.findOne({ userId });
        const addresses = userAddress ? userAddress.address.filter(addr => addr && addr._id) : [];

        console.log('Checkout data:', {
            userId,
            validItems: validCartItems.length,
            outOfStockCount: outOfStockItems.length,
            addressCount: addresses.length,
            subtotal
        });

        const discount = 0; 
        const total = subtotal - discount;

        // Render checkout page with all valid data
        res.render('checkout', {
            cartItems: validCartItems,
            addresses,
            subtotal: Math.round(subtotal),
            discount: Math.round(discount),
            total: Math.round(total),
            blockedProducts: [],
            success_msg: req.flash('success_msg'),
            error_msg: req.flash('error_msg')
        });

    } catch (err) {
        console.error('Get checkout error:', err);
        req.flash('error_msg', 'Server error. Please try again.');
        res.redirect('/cart');
    }
};


// const getAddressForEdit = async (req, res) => {
//     try {
        
//         const userId = req.session.user?.id || req.session.user?._id;
//         const addressId = req.params.id;

//         console.log('Getting address for edit - userId:', userId, 'addressId:', addressId);

//         if (!mongoose.Types.ObjectId.isValid(userId) || !mongoose.Types.ObjectId.isValid(addressId)) {
//             console.log('Validation failed - userId valid:', mongoose.Types.ObjectId.isValid(userId), 'addressId valid:', mongoose.Types.ObjectId.isValid(addressId));
//             return res.status(400).json({ success: false, message: 'Invalid user or address ID' });
//         }

//         const addressDoc = await Address.findOne({ userId });
//         if (!addressDoc) {
//             console.log('Address document not found for userId:', userId);
//             return res.status(404).json({ success: false, message: 'Address document not found' });
//         }

//         console.log('Found address document with', addressDoc.address.length, 'addresses');

//         const address = addressDoc.address.find(addr => addr._id.toString() === addressId);
//         if (!address) {
//             console.log('Address not found in document. Looking for:', addressId);
//             console.log('Available addresses:', addressDoc.address.map(a => a._id.toString()));
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

//         console.log('Successfully found and returning address');
//         return res.status(200).json({ success: true, address: safeAddress });
//     } catch (err) {
//         console.error('Get address error:', err);
//         return res.status(500).json({ success: false, message: 'Server error' });
//     }
// };


// const deleteAddress = async (req, res) => {
//     try {
//         const userId = req.session.user?.id || req.session.user?._id;
//         const addressId = req.params.id;

//         console.log('Deleting address - userId:', userId, 'addressId:', addressId);

//         if (!mongoose.Types.ObjectId.isValid(userId) || !mongoose.Types.ObjectId.isValid(addressId)) {
//             return res.status(400).json({ success: false, message: 'Invalid user or address ID' });
//         }

//         const addressDoc = await Address.findOne({ userId });
//         if (!addressDoc) {
//             return res.status(404).json({ success: false, message: 'Address document not found' });
//         }
        
//         addressDoc.address = addressDoc.address.filter(addr => addr._id.toString() !== addressId);
//         await addressDoc.save();

//         console.log('Address deleted successfully');
//         return res.status(200).json({ success: true, message: 'Address deleted successfully' });
//     } catch (err) {
//         console.error('Delete address error:', err);
//         return res.status(500).json({ success: false, message: 'Server error' });
//     }
// };


// const validateAddressInput = (data) => {
//   const errors = [];

//   const trimmedData = {};
//   Object.keys(data).forEach(key => {
//     if (typeof data[key] === 'string') {
//       trimmedData[key] = data[key].trim();
//     } else {
//       trimmedData[key] = data[key];
//     }
//   });

//   // Address Type validation
//   if (!trimmedData.addressType) {
//     errors.push("Address type is required");
//   } else if (!['Home', 'Work', 'Other'].includes(trimmedData.addressType)) {
//     errors.push("Address type must be Home, Work, or Other");
//   }

//   // Full Name validation
//   if (!trimmedData.name) {
//     errors.push("Full name is required");
//   } else if (trimmedData.name.length < 3) {
//     errors.push("Full name must be at least 3 characters");
//   }

//   // Phone validation
//   if (!trimmedData.phone) {
//     errors.push("Phone number is required");
//   } else if (!/^\d{10}$/.test(trimmedData.phone)) {
//     errors.push("Phone number must be exactly 10 digits");
//   }

//   // House Name validation
//   if (!trimmedData.houseName) {
//     errors.push("House/Building name is required");
//   } else if (trimmedData.houseName.length < 2) {
//     errors.push("House/Building name must be at least 2 characters");
//   }

//   // Landmark validation
//   if (!trimmedData.landmark) {
//     errors.push("Landmark is required");
//   } else if (trimmedData.landmark.length < 3) {
//     errors.push("Landmark must be at least 3 characters");
//   }

//   // Nationality validation - ONLY LETTERS AND SPACES
//   if (!trimmedData.nationality) {
//     errors.push("Nationality is required");
//   } else if (trimmedData.nationality.length < 2) {
//     errors.push("Nationality must be at least 2 characters");
//   } else if (!/^[a-zA-Z\s]+$/.test(trimmedData.nationality)) {
//     errors.push("Nationality can only contain letters and spaces (no numbers or special characters)");
//   }

//   // City validation
//   if (!trimmedData.city) {
//     errors.push("City is required");
//   } else if (trimmedData.city.length < 2) {
//     errors.push("City must be at least 2 characters");
//   }

//   // State validation - ONLY LETTERS AND SPACES
//   if (!trimmedData.state) {
//     errors.push("State is required");
//   } else if (trimmedData.state.length < 2) {
//     errors.push("State must be at least 2 characters");
//   } else if (!/^[a-zA-Z\s]+$/.test(trimmedData.state)) {
//     errors.push("State can only contain letters and spaces (no numbers or special characters)");
//   }

//   // Pincode validation - MUST be exactly 6 digits
//   if (!trimmedData.pincode) {
//     errors.push("ZIP code is required");
//   } else if (!/^\d{6}$/.test(trimmedData.pincode)) {
//     errors.push("ZIP code must be exactly 6 digits");
//   } else {
//     const pincodeStr = trimmedData.pincode;
    
//     // Check if all digits are the same (000000, 111111, etc.)
//     if (/^(\d)\1{5}$/.test(pincodeStr)) {
//       errors.push("ZIP code cannot contain all same digits (like 000000 or 111111)");
//     }
    
//     // Check if it's sequential like 123456, 234567, etc.
//     let isSequential = true;
//     for (let i = 1; i < 6; i++) {
//       if (parseInt(pincodeStr[i]) - parseInt(pincodeStr[i - 1]) !== 1) {
//         isSequential = false;
//         break;
//       }
//     }
//     if (isSequential) {
//       errors.push("ZIP code cannot be sequential digits (like 123456)");
//     }
    
//     // Check if it's reverse sequential like 654321, 543210, etc.
//     let isReverseSequential = true;
//     for (let i = 1; i < 6; i++) {
//       if (parseInt(pincodeStr[i - 1]) - parseInt(pincodeStr[i]) !== 1) {
//         isReverseSequential = false;
//         break;
//       }
//     }
//     if (isReverseSequential) {
//       errors.push("ZIP code cannot be reverse sequential digits (like 654321)");
//     }
//   }

//   // Alternative Phone validation (optional but validate if provided)
//   if (trimmedData.altPhone && trimmedData.altPhone.length > 0) {
//     if (!/^\d{10}$/.test(trimmedData.altPhone)) {
//       errors.push("Alternative phone number must be exactly 10 digits");
//     }
//   }

//   return errors;
// };


// const addAddress = async (req, res) => {
//   try {
//     const userId = req.session.user?.id || req.session.user?._id;
//     const { addressType, name, phone, houseName, buildingNumber, landmark, altPhone, nationality, city, state, pincode, isDefault } = req.body;

//     console.log('Adding new address for userId:', userId);

//     if (!userId || !mongoose.Types.ObjectId.isValid(userId)) {
//       return res.status(400).json({ success: false, message: 'Invalid user ID' });
//     }

    
//     const validationErrors = validateAddressInput({
//       addressType,
//       name,
//       phone,
//       houseName,
//       buildingNumber,
//       landmark,
//       altPhone,
//       nationality,
//       city,
//       state,
//       pincode
//     });

//     if (validationErrors.length > 0) {
//       return res.status(400).json({ 
//         success: false, 
//         message: validationErrors[0],
//         errors: validationErrors
//       });
//     }

//     let addressDoc = await Address.findOne({ userId });

//     const newAddress = {
//       addressType: addressType.trim(),
//       name: name.trim(),
//       phone: phone.trim(),
//       houseName: houseName.trim(),
//       buildingNumber: buildingNumber ? buildingNumber.trim() : '',
//       landmark: landmark.trim(),
//       altPhone: altPhone ? altPhone.trim() : '',
//       nationality: nationality.trim(),
//       city: city.trim(),
//       state: state.trim(),
//       pincode: pincode.trim(),
//       isDefault: isDefault || false
//     };

//     if (!addressDoc) {
//       addressDoc = new Address({
//         userId,
//         address: [newAddress]
//       });
//     } else {
//       if (isDefault) {
//         addressDoc.address.forEach(addr => {
//           addr.isDefault = false;
//         });
//       }
//       addressDoc.address.push(newAddress);
//     }

//     await addressDoc.save();

//     console.log('Address added successfully');
//     return res.status(200).json({ success: true, message: 'Address added successfully' });
//   } catch (err) {
//     console.error('Add address error:', err);
//     return res.status(500).json({ success: false, message: 'Server error' });
//   }
// };

// const editAddress = async (req, res) => {
//   try {
//     const userId = req.session.user?.id || req.session.user?._id;
//     const addressId = req.params.id;
//     const { addressType, name, phone, houseName, buildingNumber, landmark, altPhone, nationality, city, state, pincode, isDefault } = req.body;

//     console.log('Editing address - userId:', userId, 'addressId:', addressId);

//     if (!userId || !mongoose.Types.ObjectId.isValid(userId)) {
//       return res.status(400).json({ success: false, message: 'Invalid user ID' });
//     }

//     if (!addressId || !mongoose.Types.ObjectId.isValid(addressId)) {
//       return res.status(400).json({ success: false, message: 'Invalid address ID' });
//     }

//     // Validate all inputs
//     const validationErrors = validateAddressInput({
//       addressType,
//       name,
//       phone,
//       houseName,
//       buildingNumber,
//       landmark,
//       altPhone,
//       nationality,
//       city,
//       state,
//       pincode
//     });

//     if (validationErrors.length > 0) {
//       return res.status(400).json({ 
//         success: false, 
//         message: validationErrors[0],
//         errors: validationErrors
//       });
//     }

//     const addressDoc = await Address.findOne({ userId });
//     if (!addressDoc) {
//       return res.status(404).json({ success: false, message: 'Address document not found' });
//     }

//     const addressIndex = addressDoc.address.findIndex(addr => addr._id.toString() === addressId);
//     if (addressIndex === -1) {
//       return res.status(404).json({ success: false, message: 'Address not found' });
//     }

//     if (isDefault) {
//       addressDoc.address.forEach(addr => {
//         addr.isDefault = false;
//       });
//     }

//     addressDoc.address[addressIndex] = {
//       _id: addressDoc.address[addressIndex]._id,
//       addressType: addressType.trim(),
//       name: name.trim(),
//       phone: phone.trim(),
//       houseName: houseName.trim(),
//       buildingNumber: buildingNumber ? buildingNumber.trim() : '',
//       landmark: landmark.trim(),
//       altPhone: altPhone ? altPhone.trim() : '',
//       nationality: nationality.trim(),
//       city: city.trim(),
//       state: state.trim(),
//       pincode: pincode.trim(),
//       isDefault: isDefault || false
//     };

//     await addressDoc.save();

//     console.log('Address updated successfully');
//     return res.status(200).json({ success: true, message: 'Address updated successfully' });
//   } catch (err) {
//     console.error('Edit address error:', err);
//     return res.status(500).json({ success: false, message: 'Server error' });
//   }
// };



const isValidIndianPincode = (pincode) => {
  if (!/^\d{6}$/.test(pincode)) {
    return { valid: false, message: 'PIN code must be exactly 6 digits' };
  }

  // Check if all digits are the same (000000, 111111, etc.)
  if (/^(\d)\1{5}$/.test(pincode)) {
    return { valid: false, message: 'PIN code cannot have all same digits (like 000000 or 111111)' };
  }

  // Check if sequential (123456, 234567, etc.)
  let isSequential = true;
  for (let i = 1; i < 6; i++) {
    if (parseInt(pincode[i]) - parseInt(pincode[i - 1]) !== 1) {
      isSequential = false;
      break;
    }
  }
  if (isSequential) {
    return { valid: false, message: 'PIN code cannot be sequential digits (like 123456)' };
  }

  // Check if reverse sequential (654321, 543210, etc.)
  let isReverseSequential = true;
  for (let i = 1; i < 6; i++) {
    if (parseInt(pincode[i - 1]) - parseInt(pincode[i]) !== 1) {
      isReverseSequential = false;
      break;
    }
  }
  if (isReverseSequential) {
    return { valid: false, message: 'PIN code cannot be reverse sequential digits (like 654321)' };
  }

  return { valid: true, message: 'Valid PIN code' };
};

// Comprehensive address validation
const validateAddressInput = (data) => {
  const errors = [];

  const trimmedData = {};
  Object.keys(data).forEach(key => {
    if (typeof data[key] === 'string') {
      trimmedData[key] = data[key].trim();
    } else {
      trimmedData[key] = data[key];
    }
  });

  // Address Type validation
  if (!trimmedData.addressType) {
    errors.push("Address type is required");
  } else if (!['Home', 'Work', 'Other'].includes(trimmedData.addressType)) {
    errors.push("Address type must be Home, Work, or Other");
  }

  // Full Name validation - 3-50 chars, letters and spaces only
  if (!trimmedData.name) {
    errors.push("Full name is required");
  } else {
    const name = trimmedData.name;
    if (name.length < 3) {
      errors.push("Full name must be at least 3 characters");
    } else if (name.length > 50) {
      errors.push("Full name cannot exceed 50 characters");
    } else if (!/^[a-zA-Z\s]+$/.test(name)) {
      errors.push("Full name can only contain letters and spaces");
    }
  }

  // Phone validation - exactly 10 digits
  if (!trimmedData.phone) {
    errors.push("Phone number is required");
  } else if (!/^\d{10}$/.test(trimmedData.phone)) {
    errors.push("Phone number must be exactly 10 digits");
  }

  // House Name validation - min 2 chars
  if (!trimmedData.houseName) {
    errors.push("House/Building name is required");
  } else if (trimmedData.houseName.length < 2) {
    errors.push("House/Building name must be at least 2 characters");
  }

  // Landmark validation - min 3 chars
  if (!trimmedData.landmark) {
    errors.push("Landmark is required");
  } else if (trimmedData.landmark.length < 3) {
    errors.push("Landmark must be at least 3 characters");
  }

  // Alternative Phone validation (optional but validate if provided)
  if (trimmedData.altPhone && trimmedData.altPhone.length > 0) {
    if (!/^\d{10}$/.test(trimmedData.altPhone)) {
      errors.push("Alternative phone number must be exactly 10 digits");
    } else if (trimmedData.altPhone === trimmedData.phone) {
      errors.push("Alternative phone cannot be same as main phone number");
    }
  }

  // Nationality validation - must be India
  if (!trimmedData.nationality) {
    errors.push("Nationality is required");
  } else if (trimmedData.nationality !== 'India') {
    errors.push("Only India is available as nationality");
  }

  // City validation - min 2 chars
  if (!trimmedData.city) {
    errors.push("City is required");
  } else if (trimmedData.city.length < 2) {
    errors.push("City must be at least 2 characters");
  }

  // State validation - must be from predefined list
  if (!trimmedData.state) {
    errors.push("State is required");
  } else {
    const validStates = [
      'Andhra Pradesh', 'Arunachal Pradesh', 'Assam', 'Bihar', 'Chhattisgarh',
      'Goa', 'Gujarat', 'Haryana', 'Himachal Pradesh', 'Jharkhand',
      'Karnataka', 'Kerala', 'Madhya Pradesh', 'Maharashtra', 'Manipur',
      'Meghalaya', 'Mizoram', 'Nagaland', 'Odisha', 'Punjab',
      'Rajasthan', 'Sikkim', 'Tamil Nadu', 'Telangana', 'Tripura',
      'Uttar Pradesh', 'Uttarakhand', 'West Bengal'
    ];
    if (!validStates.includes(trimmedData.state)) {
      errors.push("Please select a valid Indian state");
    }
  }

  // PIN code validation with edge cases
  if (!trimmedData.pincode) {
    errors.push("PIN code is required");
  } else {
    const pincodeValidation = isValidIndianPincode(trimmedData.pincode);
    if (!pincodeValidation.valid) {
      errors.push(pincodeValidation.message);
    }
  }

  return errors;
};

// Get address for edit
const getAddressForEdit = async (req, res) => {
  try {
    const userId = req.session.user?.id || req.session.user?._id;
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

    console.log('Successfully found and returning address');
    return res.status(200).json({ success: true, address: safeAddress });
  } catch (err) {
    console.error('Get address error:', err);
    return res.status(500).json({ success: false, message: 'Server error' });
  }
};

// Delete address
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

    addressDoc.address = addressDoc.address.filter(addr => addr._id.toString() !== addressId);
    await addressDoc.save();

    console.log('Address deleted successfully');
    return res.status(200).json({ success: true, message: 'Address deleted successfully' });
  } catch (err) {
    console.error('Delete address error:', err);
    return res.status(500).json({ success: false, message: 'Server error' });
  }
};

// Add new address
const addAddress = async (req, res) => {
  try {
    const userId = req.session.user?.id || req.session.user?._id;
    const { addressType, name, phone, houseName, buildingNumber, landmark, altPhone, nationality, city, state, pincode, isDefault } = req.body;

    console.log('Adding new address for userId:', userId);

    if (!userId || !mongoose.Types.ObjectId.isValid(userId)) {
      return res.status(400).json({ success: false, message: 'Invalid user ID' });
    }

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

    if (validationErrors.length > 0) {
      return res.status(400).json({
        success: false,
        message: validationErrors[0],
        errors: validationErrors
      });
    }

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
      addressDoc = new Address({
        userId,
        address: [newAddress]
      });
    } else {
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

// Edit address
const editAddress = async (req, res) => {
  try {
    const userId = req.session.user?.id || req.session.user?._id;
    const addressId = req.params.id;
    const { addressType, name, phone, houseName, buildingNumber, landmark, altPhone, nationality, city, state, pincode, isDefault } = req.body;

    console.log('Editing address - userId:', userId, 'addressId:', addressId);

    if (!userId || !mongoose.Types.ObjectId.isValid(userId)) {
      return res.status(400).json({ success: false, message: 'Invalid user ID' });
    }

    if (!addressId || !mongoose.Types.ObjectId.isValid(addressId)) {
      return res.status(400).json({ success: false, message: 'Invalid address ID' });
    }

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

    if (validationErrors.length > 0) {
      return res.status(400).json({
        success: false,
        message: validationErrors[0],
        errors: validationErrors
      });
    }

    const addressDoc = await Address.findOne({ userId });
    if (!addressDoc) {
      return res.status(404).json({ success: false, message: 'Address document not found' });
    }

    const addressIndex = addressDoc.address.findIndex(addr => addr._id.toString() === addressId);
    if (addressIndex === -1) {
      return res.status(404).json({ success: false, message: 'Address not found' });
    }

    if (isDefault) {
      addressDoc.address.forEach(addr => {
        addr.isDefault = false;
      });
    }

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

    console.log('Address updated successfully');
    return res.status(200).json({ success: true, message: 'Address updated successfully' });
  } catch (err) {
    console.error('Edit address error:', err);
    return res.status(500).json({ success: false, message: 'Server error' });
  }
};


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

    let discount = 0;
    let couponApplied = false;
    let appliedCouponCode = null;

    if (couponCode) {
      const coupon = await Coupon.findOne({ code: couponCode, isActive: true });
      if (coupon) {
        discount = (subtotal * coupon.discountPercentage) / 100;
        couponApplied = true;
        appliedCouponCode = couponCode;
        console.log(`Coupon applied: ${couponCode}, Discount: ${discount}`);
      } else {
        console.log(`Invalid coupon code: ${couponCode}`);
      }
    }

    const finalAmount = Math.max(subtotal - discount, 0);

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
      paymentMethod: normalizedPaymentMethod,
      paymentStatus: normalizedPaymentMethod === 'COD' ? 'Pending' : 'Pending',
      couponApplied,
      couponCode: appliedCouponCode,
      status: 'Pending',
      createdOn: new Date(),
    };

    const order = new Order(orderData);
    await order.save();

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

    cart.items = [];
    await cart.save();

    console.log('Order placed successfully:', order.orderId);

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
    placeOrder,
    validateAddressInput
};