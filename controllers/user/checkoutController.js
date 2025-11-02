
const mongoose = require('mongoose');
const Cart = require('../../models/cartSchema');
const Address = require('../../models/addressSchema');
const Product = require('../../models/productSchema');
const User = require('../../models/userSchema');
const Order=require('../../models/orderSchema')


const getCheckoutPage = async (req, res) => {
    try {
        console.log('=== CHECKOUT PAGE REQUEST ===');
        console.log('Session:', !!req.session);
        console.log('User:', !!req.session?.user);
        
        // ✅ FIX 1: Check if user exists in session
        const userId = req.session?.user?._id || req.session?.user?.id;
        console.log('User ID:', userId);

        if (!userId || !mongoose.Types.ObjectId.isValid(userId)) {
            console.warn('❌ Invalid/missing userId, redirecting to login');
            req.flash('error_msg', 'Please login first');
            return res.redirect('/login');
        }

        // ✅ FIX 2: Fetch user from database with error handling
        let user;
        try {
            user = await User.findById(userId).lean();
            if (!user) {
                console.warn('❌ User not found in database');
                req.flash('error_msg', 'User not found. Please login again.');
                return res.redirect('/login');
            }
        } catch (dbErr) {
            console.error('❌ Database error fetching user:', dbErr.message);
            req.flash('error_msg', 'Database error. Please try again.');
            return res.redirect('/login');
        }

        console.log('✅ User found:', user.email);

        // ✅ FIX 3: Fetch cart with proper error handling
        let cart;
        try {
            cart = await Cart.findOne({ userId }).populate({
                path: 'items.productId',
                select: 'productName images price salePrice variants stock isBlocked brand category',
                populate: [
                    { path: 'brand', select: 'isBlocked brandName' },
                    { path: 'category', select: 'isListed categoryName' }
                ]
            }).lean();

            if (!cart || !Array.isArray(cart.items) || cart.items.length === 0) {
                console.log('ℹ️ Cart is empty or not found');
                req.flash('error_msg', 'Your cart is empty');
                return res.redirect('/cart');
            }

            console.log('✅ Cart found with', cart.items.length, 'items');
        } catch (cartErr) {
            console.error('❌ Error fetching cart:', cartErr.message);
            req.flash('error_msg', 'Error loading cart. Please try again.');
            return res.redirect('/cart');
        }

        // ✅ FIX 4: Process cart items with better error handling
        const blockedProducts = [];
        const validCartItems = [];

        cart.items.forEach((item, index) => {
            try {
                const product = item.productId;

                // Check 1: Product doesn't exist
                if (!product) {
                    console.warn(`⚠️ Item ${index}: Missing product`);
                    blockedProducts.push({
                        name: 'Unknown Product',
                        reason: 'Product no longer exists'
                    });
                    return;
                }

                // Check 2: Product is blocked by admin
                if (product.isBlocked === true) {
                    console.warn(`⚠️ Item ${index}: Product blocked - ${product.productName}`);
                    blockedProducts.push({
                        name: product.productName,
                        reason: 'This product has been blocked by admin'
                    });
                    return;
                }

                // Check 3: Brand is blocked
                if (product.brand && product.brand.isBlocked === true) {
                    console.warn(`⚠️ Item ${index}: Brand blocked - ${product.productName}`);
                    blockedProducts.push({
                        name: product.productName,
                        reason: 'Brand has been blocked by admin'
                    });
                    return;
                }

                // Check 4: Category is not listed
                if (product.category && product.category.isListed === false) {
                    console.warn(`⚠️ Item ${index}: Category not listed - ${product.productName}`);
                    blockedProducts.push({
                        name: product.productName,
                        reason: 'Product category has been delisted by admin'
                    });
                    return;
                }

                // Product is valid
                console.log(`✅ Item ${index}: Valid - ${product.productName}`);

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
                    quantity: item.quantity || 1,
                    price: item.price || (variant.salePrice || variant.price || product.salePrice || product.price || 0)
                };

                validCartItems.push(cartItem);
            } catch (itemErr) {
                console.error(`❌ Error processing item ${index}:`, itemErr.message);
                blockedProducts.push({
                    name: 'Item',
                    reason: 'Error processing this item'
                });
            }
        });

        console.log('📊 Summary:', {
            totalItems: cart.items.length,
            blockedCount: blockedProducts.length,
            validCount: validCartItems.length
        });

        // ✅ FIX 5: If blocked products exist, show them but don't redirect
        if (blockedProducts.length > 0) {
            console.log('⚠️ Found blocked products:', blockedProducts);
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

        // If no valid items after filtering
        if (validCartItems.length === 0) {
            console.log('ℹ️ No valid items in cart');
            req.flash('error_msg', 'Your cart contains no valid products');
            return res.redirect('/cart');
        }

        // Check for out of stock items (log but don't block)
        const outOfStockItems = validCartItems.filter(item => 
            (item.variant.stock <= 0) || (item.productId.stock <= 0)
        );
        if (outOfStockItems.length > 0) {
            console.log('⚠️ Out of stock items:', outOfStockItems.map(item => item.productId.productName));
        }

        // ✅ FIX 6: Calculate subtotal safely
        const subtotal = validCartItems.reduce((sum, item) => {
            const price = item.variant?.salePrice || item.variant?.price || item.price || 0;
            const itemTotal = price * (item.quantity || 1);
            return sum + itemTotal;
        }, 0);

        console.log('✅ Subtotal calculated:', subtotal);

        // ✅ FIX 7: Get user addresses
        let addresses = [];
        try {
            const userAddress = await Address.findOne({ userId }).lean();
            addresses = userAddress ? (userAddress.address?.filter(addr => addr && addr._id) || []) : [];
            console.log('✅ Addresses found:', addresses.length);
        } catch (addrErr) {
            console.error('❌ Error fetching addresses:', addrErr.message);
            console.log('Continuing with empty addresses');
            addresses = [];
        }

        console.log('📋 Checkout data:', {
            userId,
            validItems: validCartItems.length,
            outOfStockCount: outOfStockItems.length,
            addressCount: addresses.length,
            subtotal
        });

        // ✅ FIX 8: Render checkout page (no discount calculation here)
        const discount = 0; 
        const total = subtotal - discount;

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
        console.error('❌ CRITICAL ERROR in getCheckoutPage:', err);
        console.error('Stack:', err.stack);
        req.flash('error_msg', 'Server error. Please try again.');
        res.redirect('/cart');
    }
};


const isValidIndianPincode = (pincode) => {
  if (!/^\d{6}$/.test(pincode)) {
    return { valid: false, message: 'PIN code must be exactly 6 digits' };
  }

  if (/^(\d)\1{5}$/.test(pincode)) {
    return { valid: false, message: 'PIN code cannot have all same digits (like 000000 or 111111)' };
  }
 
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

//   if (!trimmedData.addressType) {
//     errors.push("Address type is required");
//   } else if (!['Home', 'Work', 'Other'].includes(trimmedData.addressType)) {
//     errors.push("Address type must be Home, Work, or Other");
//   }
  
//   if (!trimmedData.name) {
//     errors.push("Full name is required");
//   } else {
//     const name = trimmedData.name;
//     if (name.length < 3) {
//       errors.push("Full name must be at least 3 characters");
//     } else if (name.length > 50) {
//       errors.push("Full name cannot exceed 50 characters");
//     } else if (!/^[a-zA-Z\s]+$/.test(name)) {
//       errors.push("Full name can only contain letters and spaces");
//     }
//   }

//   if (!trimmedData.phone) {
//     errors.push("Phone number is required");
//   } else if (!/^\d{10}$/.test(trimmedData.phone)) {
//     errors.push("Phone number must be exactly 10 digits");
//   }

//   if (!trimmedData.houseName) {
//     errors.push("House/Building name is required");
//   } else if (trimmedData.houseName.length < 2) {
//     errors.push("House/Building name must be at least 2 characters");
//   }


//   if (!trimmedData.landmark) {
//     errors.push("Landmark is required");
//   } else if (trimmedData.landmark.length < 3) {
//     errors.push("Landmark must be at least 3 characters");
//   }

//   if (trimmedData.altPhone && trimmedData.altPhone.length > 0) {
//     if (!/^\d{10}$/.test(trimmedData.altPhone)) {
//       errors.push("Alternative phone number must be exactly 10 digits");
//     } else if (trimmedData.altPhone === trimmedData.phone) {
//       errors.push("Alternative phone cannot be same as main phone number");
//     }
//   }


//   if (!trimmedData.nationality) {
//     errors.push("Nationality is required");
//   } else if (trimmedData.nationality !== 'India') {
//     errors.push("Only India is available as nationality");
//   }


//   if (!trimmedData.city) {
//     errors.push("City is required");
//   } else if (trimmedData.city.length < 2) {
//     errors.push("City must be at least 2 characters");
//   }

//   if (!trimmedData.state) {
//     errors.push("State is required");
//   } else {
//     const validStates = [
//       'Andhra Pradesh', 'Arunachal Pradesh', 'Assam', 'Bihar', 'Chhattisgarh',
//       'Goa', 'Gujarat', 'Haryana', 'Himachal Pradesh', 'Jharkhand',
//       'Karnataka', 'Kerala', 'Madhya Pradesh', 'Maharashtra', 'Manipur',
//       'Meghalaya', 'Mizoram', 'Nagaland', 'Odisha', 'Punjab',
//       'Rajasthan', 'Sikkim', 'Tamil Nadu', 'Telangana', 'Tripura',
//       'Uttar Pradesh', 'Uttarakhand', 'West Bengal'
//     ];
//     if (!validStates.includes(trimmedData.state)) {
//       errors.push("Please select a valid Indian state");
//     }
//   }

//   if (!trimmedData.pincode) {
//     errors.push("PIN code is required");
//   } else {
//     const pincodeValidation = isValidIndianPincode(trimmedData.pincode);
//     if (!pincodeValidation.valid) {
//       errors.push(pincodeValidation.message);
//     }
//   }

//   return errors;
// };

// const getAddressForEdit = async (req, res) => {
//   try {
//     const userId = req.session.user?.id || req.session.user?._id;
//     const addressId = req.params.id;

//     console.log('Getting address for edit - userId:', userId, 'addressId:', addressId);

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

//     const safeAddress = {
//       _id: address._id,
//       addressType: address.addressType || '',
//       name: address.name || '',
//       phone: address.phone || '',
//       houseName: address.houseName || '',
//       buildingNumber: address.buildingNumber || '',
//       landmark: address.landmark || '',
//       altPhone: address.altPhone || '',
//       nationality: address.nationality || 'India',
//       city: address.city || '',
//       state: address.state || '',
//       pincode: address.pincode || '',
//       isDefault: address.isDefault || false
//     };

//     console.log('Successfully found and returning address');
//     return res.status(200).json({ success: true, address: safeAddress });
//   } catch (err) {
//     console.error('Get address error:', err);
//     return res.status(500).json({ success: false, message: 'Server error' });
//   }
// };


// const deleteAddress = async (req, res) => {
//   try {
//     const userId = req.session.user?.id || req.session.user?._id;
//     const addressId = req.params.id;

//     console.log('Deleting address - userId:', userId, 'addressId:', addressId);

//     if (!mongoose.Types.ObjectId.isValid(userId) || !mongoose.Types.ObjectId.isValid(addressId)) {
//       return res.status(400).json({ success: false, message: 'Invalid user or address ID' });
//     }

//     const addressDoc = await Address.findOne({ userId });
//     if (!addressDoc) {
//       return res.status(404).json({ success: false, message: 'Address document not found' });
//     }

//     addressDoc.address = addressDoc.address.filter(addr => addr._id.toString() !== addressId);
//     await addressDoc.save();

//     console.log('Address deleted successfully');
//     return res.status(200).json({ success: true, message: 'Address deleted successfully' });
//   } catch (err) {
//     console.error('Delete address error:', err);
//     return res.status(500).json({ success: false, message: 'Server error' });
//   }
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
//       nationality: 'India',
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
//       nationality: 'India',
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

  // ✅ Address Type Validation
  if (!trimmedData.addressType) {
    errors.push("Address type is required");
  } else if (!['Home', 'Work', 'Other'].includes(trimmedData.addressType)) {
    errors.push("Address type must be Home, Work, or Other");
  }
  
  // ✅ IMPROVED: Name Validation (3-20 letters only, no numbers or special chars)
  if (!trimmedData.name) {
    errors.push("Full name is required");
  } else {
    const name = trimmedData.name;
    
    if (name.length < 3) {
      errors.push("Full name must be at least 3 characters");
    } else if (name.length > 20) {
      errors.push("Full name cannot exceed 20 characters");
    } else if (!/^[a-zA-Z\s'-]+$/.test(name)) {
      errors.push("Full name can only contain letters, spaces, apostrophes, and hyphens");
    }
    
    // Check if it has at least one letter (not just spaces/apostrophes)
    if (!/[a-zA-Z]/.test(name)) {
      errors.push("Full name must contain at least one letter");
    }
  }

  // ✅ IMPROVED: Phone Validation (no ascending/descending sequences, no repeated digits)
  if (!trimmedData.phone) {
    errors.push("Phone number is required");
  } else {
    const phone = trimmedData.phone.trim();
    
    if (!/^\d{10}$/.test(phone)) {
      errors.push("Phone number must be exactly 10 digits");
    } else {
      // ✅ Check for all same digits (e.g., 0000000000, 1111111111)
      const uniqueDigits = new Set(phone.split(''));
      if (uniqueDigits.size === 1) {
        errors.push("Phone number cannot consist of all identical digits");
      }
      
      // ✅ Check for ascending sequence (e.g., 1234567890)
      const digits = phone.split('').map(Number);
      const isAscending = digits.every((d, i) => i === 0 || d === digits[i - 1] + 1);
      if (isAscending) {
        errors.push("Phone number cannot be in ascending order (e.g., 1234567890)");
      }
      
      // ✅ Check for descending sequence (e.g., 9876543210)
      const isDescending = digits.every((d, i) => i === 0 || d === digits[i - 1] - 1);
      if (isDescending) {
        errors.push("Phone number cannot be in descending order (e.g., 9876543210)");
      }
      
      // ✅ Check for more than 3 consecutive identical digits (e.g., 0000, 1111)
      let maxConsecutive = 1;
      let currentConsecutive = 1;
      for (let i = 1; i < phone.length; i++) {
        if (phone[i] === phone[i - 1]) {
          currentConsecutive++;
          maxConsecutive = Math.max(maxConsecutive, currentConsecutive);
        } else {
          currentConsecutive = 1;
        }
      }
      if (maxConsecutive > 3) {
        errors.push("Phone number cannot have more than 3 consecutive identical digits");
      }
    }
  }

  // ✅ IMPROVED: House Name Validation (no full special characters)
  if (!trimmedData.houseName) {
    errors.push("House/Building name is required");
  } else {
    const houseName = trimmedData.houseName;
    
    if (houseName.length < 2) {
      errors.push("House/Building name must be at least 2 characters");
    }
    
    // ✅ Check if it's ONLY special characters
    if (!/[a-zA-Z0-9]/.test(houseName)) {
      errors.push("House/Building name cannot contain only special characters");
    }
    
    // ✅ Check for excessive special characters (more than 50% of string)
    const specialCharCount = (houseName.match(/[^a-zA-Z0-9\s\-'.]/g) || []).length;
    if (specialCharCount > houseName.length * 0.5) {
      errors.push("House/Building name contains too many special characters");
    }
  }

  // ✅ IMPROVED: Building Number Validation (no full special characters)
  if (trimmedData.buildingNumber && trimmedData.buildingNumber.length > 0) {
    const buildingNumber = trimmedData.buildingNumber;
    
    // ✅ Check if it's ONLY special characters
    if (!/[a-zA-Z0-9]/.test(buildingNumber)) {
      errors.push("Building number cannot contain only special characters");
    }
    
    // ✅ Check for excessive special characters
    const specialCharCount = (buildingNumber.match(/[^a-zA-Z0-9\s\-'.\/]/g) || []).length;
    if (specialCharCount > buildingNumber.length * 0.5) {
      errors.push("Building number contains too many special characters");
    }
  }

  // ✅ IMPROVED: Landmark Validation (no full special characters)
  if (!trimmedData.landmark) {
    errors.push("Landmark is required");
  } else {
    const landmark = trimmedData.landmark;
    
    if (landmark.length < 3) {
      errors.push("Landmark must be at least 3 characters");
    }
    
    // ✅ Check if it's ONLY special characters
    if (!/[a-zA-Z0-9]/.test(landmark)) {
      errors.push("Landmark cannot contain only special characters");
    }
    
    // ✅ Check for excessive special characters (more than 50% of string)
    const specialCharCount = (landmark.match(/[^a-zA-Z0-9\s\-'.]/g) || []).length;
    if (specialCharCount > landmark.length * 0.5) {
      errors.push("Landmark contains too many special characters");
    }
  }

  // ✅ Alternative Phone Validation
  if (trimmedData.altPhone && trimmedData.altPhone.length > 0) {
    const altPhone = trimmedData.altPhone.trim();
    
    if (!/^\d{10}$/.test(altPhone)) {
      errors.push("Alternative phone number must be exactly 10 digits");
    } else if (altPhone === trimmedData.phone) {
      errors.push("Alternative phone cannot be same as main phone number");
    } else {
      // Apply same checks as main phone
      const uniqueDigits = new Set(altPhone.split(''));
      if (uniqueDigits.size === 1) {
        errors.push("Alternative phone number cannot consist of all identical digits");
      }
      
      const digits = altPhone.split('').map(Number);
      const isAscending = digits.every((d, i) => i === 0 || d === digits[i - 1] + 1);
      if (isAscending) {
        errors.push("Alternative phone number cannot be in ascending order");
      }
      
      const isDescending = digits.every((d, i) => i === 0 || d === digits[i - 1] - 1);
      if (isDescending) {
        errors.push("Alternative phone number cannot be in descending order");
      }
    }
  }

  // ✅ Nationality Validation
  if (!trimmedData.nationality) {
    errors.push("Nationality is required");
  } else if (trimmedData.nationality !== 'India') {
    errors.push("Only India is available as nationality");
  }

  // ✅ City Validation
  if (!trimmedData.city) {
    errors.push("City is required");
  } else {
    const city = trimmedData.city;
    if (city.length < 2) {
      errors.push("City must be at least 2 characters");
    } else if (!/^[a-zA-Z\s'-]+$/.test(city)) {
      errors.push("City can only contain letters, spaces, apostrophes, and hyphens");
    }
  }

  // ✅ State Validation
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

  // ✅ PIN Code Validation
  if (!trimmedData.pincode) {
    errors.push("PIN code is required");
  } else {
    const pincode = trimmedData.pincode.trim();
    
    if (!/^\d{6}$/.test(pincode)) {
      errors.push("PIN code must be exactly 6 digits");
    } else {
      // Check for all same digits (e.g., 000000, 111111)
      const uniqueDigits = new Set(pincode.split(''));
      if (uniqueDigits.size === 1) {
        errors.push("PIN code cannot consist of all identical digits");
      }
    }
  }

  return errors;
};

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







module.exports = { 
    getCheckoutPage, 
    getAddressForEdit,
    addAddress,
    editAddress,
    deleteAddress,
   
    validateAddressInput
};