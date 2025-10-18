
const Address = require("../../models/addressSchema");
const User = require("../../models/userSchema");


const getAddresses = async (req, res) => {
  try {
    const userId = req.session.user?.id;
    if (!userId) {
      req.flash('error', 'Please log in');
      return res.redirect('/login');
    }

    const user = await User.findById(userId);
    let userAddress = await Address.findOne({ userId });
 
    if (!userAddress) {
      userAddress = new Address({ userId, address: [] });
      await userAddress.save();
    }

    res.render('address', {
      title: 'Manage Addresses',
      addresses: userAddress.address,
      user
    });
  } catch (err) {
    console.error('Get Addresses Error:', err);
    res.status(500).json({ error: "Internal server error." });
  }
};

const getAddressesJSON = async (req, res) => {
  try {
    const userId = req.session.user?.id;
    if (!userId) {
      return res.status(401).json({ success: false, message: "Please log in" });
    }

    const userAddress = await Address.findOne({ userId });
    if (!userAddress) {
      return res.json({ success: true, addresses: [] });
    }

    res.json({ success: true, addresses: userAddress.address });
  } catch (err) {
    console.error("Get Addresses JSON Error:", err);
    res.status(500).json({ success: false, message: "Server error" });
  }
};

// const addAddress = async (req, res) => {
//   try {
//     const userId = req.session.user?.id;
//     if (!userId) {
//       return res.status(401).json({ success: false, message: "Please log in", redirect: '/login' });
//     }

//     const {
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
//       pincode,
//       isDefault
//     } = req.body;

  
//     if (!addressType || !name || !phone || !landmark || !city || !state || !pincode) {
//       return res.status(400).json({ success: false, message: "All required fields must be filled" });
//     }

//     const validAddressTypes = ['Home', 'Work', 'Other'];
//     if (!validAddressTypes.includes(addressType)) {
//       return res.status(400).json({ success: false, message: `Address type must be one of: ${validAddressTypes.join(', ')}` });
//     }

//     if (!/^\d{10}$/.test(phone)) {
//       return res.status(400).json({ success: false, message: "Phone number must be 10 digits" });
//     }

//     if (altPhone && !/^\d{10}$/.test(altPhone)) {
//       return res.status(400).json({ success: false, message: "Alternate phone number must be 10 digits" });
//     }

//     let userAddress = await Address.findOne({ userId });
//     if (!userAddress) {
//       userAddress = new Address({ userId, address: [] });
//     }
  
//     if (isDefault) {
//       userAddress.address.forEach(addr => addr.isDefault = false);
//     }

//     userAddress.address.push({
//       addressType,
//       name,
//       phone,
//       houseName: houseName || "Unknown",
//       buildingNumber,
//       landmark,
//       altPhone,
//       nationality: nationality || "Unknown",
//       city,
//       state,
//       pincode,
//       isDefault: !!isDefault
//     });

//     if (req.query.from === 'checkout') {
//       return res.redirect('/checkout');
//     }

//     await userAddress.save();
//     res.json({ success: true, message: "Address added successfully" });
//   } catch (err) {
//     console.error("Add Address Error:", err);
//     res.status(500).json({ success: false, message: err.message || "Server Error" });
//   }
// };

const getEditAddress = async (req, res) => {
    try {
        const userId = req.session.user?.id;
        const addressId = req.params.id;

        if (!userId) return res.redirect('/login');

        const userAddress = await Address.findOne({ userId });
        if (!userAddress) return res.redirect('/profile/address');

        const address = userAddress.address.id(addressId);
        if (!address) return res.redirect('/profile/address');

        const user = await User.findById(userId);

        res.render("edit-address", { address, user });
    } catch (error) {
        console.error("Get Edit Address Error:", error);
        res.redirect("/pageNotFound");
    }
};

// const editAddress = async (req, res) => {
//     try {
//         const userId = req.session.user?.id;
//         const {
//             id,
//             addressType,
//             name,
//             phone,
//             houseName,
//             buildingNumber,
//             landmark,
//             altPhone,
//             nationality,
//             city,
//             state,
//             pincode,
//             isDefault
//         } = req.body;

//         if (req.query.from === 'checkout') {
//       return res.redirect('/checkout');
//     }

//         if (!userId) return res.status(401).json({ success: false, message: "Please log in", redirect: '/login' });
//         if (!id) return res.status(400).json({ success: false, message: "Address ID is required" });

//         const userAddress = await Address.findOne({ userId });
//         if (!userAddress) return res.status(404).json({ success: false, message: "No addresses found" });

//         const addr = userAddress.address.id(id);
//         if (!addr) return res.status(404).json({ success: false, message: "Address not found" });
       
//         if (isDefault) {
//             userAddress.address.forEach(a => a.isDefault = false);
//         }
      
//         addr.addressType = addressType;
//         addr.name = name;
//         addr.phone = phone;
//         addr.houseName = houseName || "Unknown";
//         addr.buildingNumber = buildingNumber;
//         addr.landmark = landmark;
//         addr.altPhone = altPhone;
//         addr.nationality = nationality || "Unknown";
//         addr.city = city;
//         addr.state = state;
//         addr.pincode = pincode;
//         addr.isDefault = !!isDefault;

//         await userAddress.save();

//         res.json({ success: true, message: "Address updated successfully" });
//     } catch (err) {
//         console.error("Edit Address Error:", err);
//         res.status(500).json({ success: false, message: err.message || "Server Error" });
//     }
// };

const deleteAddress = async (req, res) => {
  try {
    const userId = req.session.user?.id;
    const { id } = req.params;

    if (!userId) return res.status(401).json({ success: false, message: "Please log in" });
    if (!id) return res.status(400).json({ success: false, message: "Address ID is required" });

    const userAddress = await Address.findOne({ userId });
    if (!userAddress) return res.status(404).json({ success: false, message: "No addresses found" });


    const addr = userAddress.address.id(id);
    if (!addr) return res.status(404).json({ success: false, message: "Address not found" });

 
    userAddress.address.pull({ _id: id });

    await userAddress.save();
    res.json({ success: true, message: "Address deleted successfully" });

  } catch (err) {
    console.error("Delete Address Error:", err);
    res.status(500).json({ success: false, message: err.message || "Server Error" });
  }
};


// Validation helper function
const validateAddressInput = (data) => {
  const errors = [];

  // Check if addressType is provided and valid
  if (!data.addressType || !data.addressType.trim()) {
    errors.push("Address type is required");
  } else if (!['Home', 'Work', 'Other'].includes(data.addressType.trim())) {
    errors.push("Address type must be Home, Work, or Other");
  }

  // Check name
  if (!data.name || !data.name.trim()) {
    errors.push("Full name is required");
  } else if (data.name.trim().length < 3) {
    errors.push("Full name must be at least 3 characters");
  }

  // Check phone
  if (!data.phone || !data.phone.trim()) {
    errors.push("Phone number is required");
  } else if (!/^\d{10}$/.test(data.phone.trim())) {
    errors.push("Phone number must be exactly 10 digits");
  }

  // Check house name
  if (!data.houseName || !data.houseName.trim()) {
    errors.push("House/Building name is required");
  } else if (data.houseName.trim().length < 2) {
    errors.push("House/Building name must be at least 2 characters");
  }

  // Check landmark
  if (!data.landmark || !data.landmark.trim()) {
    errors.push("Landmark is required");
  } else if (data.landmark.trim().length < 3) {
    errors.push("Landmark must be at least 3 characters");
  }

  // Check alternative phone (optional but validate if provided)
  if (data.altPhone && data.altPhone.trim()) {
    if (!/^\d{10}$/.test(data.altPhone.trim())) {
      errors.push("Alternative phone number must be exactly 10 digits");
    }
  }

  // Check nationality - ONLY LETTERS AND SPACES
  if (!data.nationality || !data.nationality.trim()) {
    errors.push("Nationality is required");
  } else if (data.nationality.trim().length < 2) {
    errors.push("Nationality must be at least 2 characters");
  } else if (!/^[a-zA-Z\s]+$/.test(data.nationality.trim())) {
    errors.push("Nationality can only contain letters and spaces");
  }

  // Check city
  if (!data.city || !data.city.trim()) {
    errors.push("City is required");
  } else if (data.city.trim().length < 2) {
    errors.push("City must be at least 2 characters");
  }

  // Check state - ONLY LETTERS AND SPACES
  if (!data.state || !data.state.trim()) {
    errors.push("State is required");
  } else if (data.state.trim().length < 2) {
    errors.push("State must be at least 2 characters");
  } else if (!/^[a-zA-Z\s]+$/.test(data.state.trim())) {
    errors.push("State can only contain letters and spaces");
  }

  // Check ZIP code - MUST be exactly 6 digits
  if (!data.pincode || !data.pincode.trim()) {
    errors.push("ZIP code is required");
  } else if (!/^\d{6}$/.test(data.pincode.trim())) {
    errors.push("ZIP code must be exactly 6 digits");
  } else {
    const pincodeStr = data.pincode.trim();
    
    // Check if all digits are the same (000000, 111111, etc.)
    if (/^(\d)\1{5}$/.test(pincodeStr)) {
      errors.push("ZIP code cannot contain all same digits");
    }
    
    // Check if it's sequential like 123456, 234567, etc.
    let isSequential = true;
    for (let i = 1; i < 6; i++) {
      if (parseInt(pincodeStr[i]) - parseInt(pincodeStr[i - 1]) !== 1) {
        isSequential = false;
        break;
      }
    }
    if (isSequential) {
      errors.push("ZIP code cannot be sequential digits");
    }
    
    // Check if it's reverse sequential like 654321, 543210, etc.
    let isReverseSequential = true;
    for (let i = 1; i < 6; i++) {
      if (parseInt(pincodeStr[i - 1]) - parseInt(pincodeStr[i]) !== 1) {
        isReverseSequential = false;
        break;
      }
    }
    if (isReverseSequential) {
      errors.push("ZIP code cannot be reverse sequential digits");
    }

    // Check if it's alternating pattern like 121212, 010101, etc.
    if (/^(\d)\d?(?:\1\d?)+$/.test(pincodeStr)) {
      let alternates = true;
      for (let i = 0; i < 5; i++) {
        if (pincodeStr[i] !== pincodeStr[i + 1]) {
          alternates = false;
          break;
        }
      }
      if (!alternates) {
        // Check if it's truly alternating
        const pattern = `${pincodeStr[0]}${pincodeStr[1]}`;
        if (pattern.length === 2 && pincodeStr === (pattern + pattern + pattern).substring(0, 6)) {
          errors.push("ZIP code cannot be a repeating pattern");
        }
      }
    }
  }

  return errors;
};

// Add Address Controller
const addAddress = async (req, res) => {
  try {
    const userId = req.session.user?.id;
    if (!userId) {
      return res.status(401).json({ success: false, message: "Please log in", redirect: '/login' });
    }

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

    // Validate all inputs
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

    let userAddress = await Address.findOne({ userId });
    if (!userAddress) {
      userAddress = new Address({ userId, address: [] });
    }
  
    if (isDefault) {
      userAddress.address.forEach(addr => addr.isDefault = false);
    }

    userAddress.address.push({
      addressType: addressType.trim(),
      name: name.trim(),
      phone: phone.trim(),
      houseName: houseName.trim(),
      buildingNumber: buildingNumber ? buildingNumber.trim() : null,
      landmark: landmark.trim(),
      altPhone: altPhone ? altPhone.trim() : null,
      nationality: nationality.trim(),
      city: city.trim(),
      state: state.trim(),
      pincode: pincode.trim(),
      isDefault: !!isDefault
    });

    if (req.query.from === 'checkout') {
      return res.redirect('/checkout');
    }

    await userAddress.save();
    res.json({ success: true, message: "Address added successfully" });
  } catch (err) {
    console.error("Add Address Error:", err);
    res.status(500).json({ success: false, message: err.message || "Server Error" });
  }
};

// Edit Address Controller
const editAddress = async (req, res) => {
  try {
    const userId = req.session.user?.id;
    const {
      id,
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

    if (req.query.from === 'checkout') {
      return res.redirect('/checkout');
    }

    if (!userId) {
      return res.status(401).json({ success: false, message: "Please log in", redirect: '/login' });
    }

    if (!id) {
      return res.status(400).json({ success: false, message: "Address ID is required" });
    }

    // Validate all inputs
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

    const userAddress = await Address.findOne({ userId });
    if (!userAddress) {
      return res.status(404).json({ success: false, message: "No addresses found" });
    }

    const addr = userAddress.address.id(id);
    if (!addr) {
      return res.status(404).json({ success: false, message: "Address not found" });
    }
   
    if (isDefault) {
      userAddress.address.forEach(a => a.isDefault = false);
    }
  
    addr.addressType = addressType.trim();
    addr.name = name.trim();
    addr.phone = phone.trim();
    addr.houseName = houseName.trim();
    addr.buildingNumber = buildingNumber ? buildingNumber.trim() : null;
    addr.landmark = landmark.trim();
    addr.altPhone = altPhone ? altPhone.trim() : null;
    addr.nationality = nationality.trim();
    addr.city = city.trim();
    addr.state = state.trim();
    addr.pincode = pincode.trim();
    addr.isDefault = !!isDefault;

    await userAddress.save();

    res.json({ success: true, message: "Address updated successfully" });
  } catch (err) {
    console.error("Edit Address Error:", err);
    res.status(500).json({ success: false, message: err.message || "Server Error" });
  }
};


 



module.exports = {
     getAddresses,
     addAddress,
     editAddress, 
     deleteAddress,
     getAddressesJSON,
     getEditAddress,
      validateAddressInput
    };
