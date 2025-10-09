// const Address = require("../../models/addressSchema");
// const User = require("../../models/userSchema");

// const getAddresses = async (req, res) => {
//   try {
//     console.log('Session:', req.session);
//     const userId = req.session.user?.id;
//     if (!userId) {
//       console.log('No user found in req.session.user');
//       req.flash('error', 'Please log in');
//       return res.redirect('/login');
//     }
//     const user = await User.findById(userId);
//     let userAddress = await Address.findOne({ userId });
//     console.log('Found address document:', userAddress);
//     if (!userAddress) {
//       userAddress = new Address({ userId, address: [] });
//       await userAddress.save();
//       console.log('Created new address document:', userAddress);
//     }
//    res.render('address', {
//   title: 'Manage Addresses',
//   addresses: userAddress.address, // <-- this is the array you want
//   user
// });

//   } catch (err) {
//     console.error('Get Addresses Error:', err);
//     res.status(500).json({ error: "Internal server error." });
//   }
// };

// // Rest of the functions (addAddress, editAddress, deleteAddress) remain as above
// const addAddress = async (req, res) => {
//   try {
//     const userId = req.session.user?.id;
//     if (!userId) {
//       return res.status(401).json({ success: false, message: "Please log in", redirect: '/login' });
//     }
//     const { addressType, name, phone, landmark, city, state, pincode, isDefault } = req.body;
//     let userAddress = await Address.findOne({ userId });
//     if (!userAddress) {
//       userAddress = new Address({ userId, address: [] });
//     }
//     if (isDefault) {
//       userAddress.address.forEach(addr => (addr.isDefault = false));
//     }
//     userAddress.address.push({
//       addressType,
//       name,
//       phone,
//       landmark,
//       city,
//       state,
//       pincode,
//       isDefault: !!isDefault
//     });
//     await userAddress.save();
//     res.json({ success: true, message: "Address added successfully" });
//   } catch (err) {
//     console.error("Add Address Error:", err);
//     res.status(500).json({ success: false, message: err.message || "Server Error" });
//   }
// };

// const editAddress = async (req, res) => {
//   try {
//     const userId = req.session.user?.id;
//     const { id, addressType, name, phone, landmark, city, state, pincode, isDefault } = req.body;
//     console.log('Edit address request:', { userId, id, payload: req.body }); // Debug
//     if (!userId) {
//       return res.status(401).json({ success: false, message: "Please log in", redirect: '/login' });
//     }
//     if (!id) {
//       return res.status(400).json({ success: false, message: "Address ID is required" });
//     }

//     // Validate required fields
//     if (!addressType || !name || !phone || !landmark || !city || !state || !pincode) {
//       return res.status(400).json({ success: false, message: "All fields are required" });
//     }

//     // Validate addressType
//     const validAddressTypes = ['Home', 'Work', 'Other'];
//     if (!validAddressTypes.includes(addressType)) {
//       return res.status(400).json({ success: false, message: `Address type must be one of: ${validAddressTypes.join(', ')}` });
//     }

//     // Validate phone
//     if (!/^\d{10}$/.test(phone)) {
//       return res.status(400).json({ success: false, message: "Phone number must be 10 digits" });
//     }

//     const userAddress = await Address.findOne({ userId });
//     if (!userAddress) {
//       console.log('No address document found for userId:', userId);
//       return res.status(404).json({ success: false, message: "No addresses found" });
//     }
//     const addr = userAddress.address.id(id);
//     if (!addr) {
//       console.log('Address not found for ID:', id);
//       return res.status(404).json({ success: false, message: "Address not found" });
//     }
//     if (isDefault) {
//       userAddress.address.forEach(a => (a.isDefault = false));
//     }
//     addr.addressType = addressType;
//     addr.name = name;
//     addr.phone = phone;
//     addr.landmark = landmark;
//     addr.city = city;
//     addr.state = state;
//     addr.pincode = pincode;
//     addr.isDefault = !!isDefault;
//     await userAddress.save();
//     console.log('Address updated:', userAddress); // Debug
//     res.json({ success: true, message: "Address updated successfully" });
//   } catch (err) {
//     console.error("Edit Address Error:", err);
//     res.status(500).json({ success: false, message: err.message || "Server Error" });
//   }
// };

// const deleteAddress = async (req, res) => {
//   try {
//     const userId = req.session.user?.id;
//     const { id } = req.params;
//     console.log('Delete address request:', { userId, id }); // Debug
//     if (!userId) {
//       return res.status(401).json({ success: false, message: "Please log in", redirect: '/login' });
//     }
//     if (!id) {
//       return res.status(400).json({ success: false, message: "Address ID is required" });
//     }
//     const userAddress = await Address.findOne({ userId });
//     if (!userAddress) {
//       console.log('No address document found for userId:', userId);
//       return res.status(404).json({ success: false, message: "No addresses found" });
//     }
//     const addr = userAddress.address.id(id);
//     if (!addr) {
//       console.log('Address not found for ID:', id);
//       return res.status(404).json({ success: false, message: "Address not found" });
//     }
//     addr.remove();
//     await userAddress.save();
//     console.log('Address deleted:', userAddress); // Debug
//     res.json({ success: true, message: "Address deleted successfully" });
//   } catch (err) {
//     console.error("Delete Address Error:", err);
//     res.status(500).json({ success: false, message: err.message || "Server Error" });
//   }
// };
// module.exports = { getAddresses, addAddress, editAddress, deleteAddress };




const Address = require("../../models/addressSchema");
const User = require("../../models/userSchema");

// Get all addresses for the logged-in user
const getAddresses = async (req, res) => {
  try {
    const userId = req.session.user?.id;
    if (!userId) {
      req.flash('error', 'Please log in');
      return res.redirect('/login');
    }

    const user = await User.findById(userId);
    let userAddress = await Address.findOne({ userId });

    // If no address document exists, create one
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




// Add a new address
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

    // Validation
    if (!addressType || !name || !phone || !landmark || !city || !state || !pincode) {
      return res.status(400).json({ success: false, message: "All required fields must be filled" });
    }

    const validAddressTypes = ['Home', 'Work', 'Other'];
    if (!validAddressTypes.includes(addressType)) {
      return res.status(400).json({ success: false, message: `Address type must be one of: ${validAddressTypes.join(', ')}` });
    }

    if (!/^\d{10}$/.test(phone)) {
      return res.status(400).json({ success: false, message: "Phone number must be 10 digits" });
    }

    if (altPhone && !/^\d{10}$/.test(altPhone)) {
      return res.status(400).json({ success: false, message: "Alternate phone number must be 10 digits" });
    }

    let userAddress = await Address.findOne({ userId });
    if (!userAddress) {
      userAddress = new Address({ userId, address: [] });
    }

    // Reset default if needed
    if (isDefault) {
      userAddress.address.forEach(addr => addr.isDefault = false);
    }

    userAddress.address.push({
      addressType,
      name,
      phone,
      houseName: houseName || "Unknown",
      buildingNumber,
      landmark,
      altPhone,
      nationality: nationality || "Unknown",
      city,
      state,
      pincode,
      isDefault: !!isDefault
    });

    await userAddress.save();
    res.json({ success: true, message: "Address added successfully" });
  } catch (err) {
    console.error("Add Address Error:", err);
    res.status(500).json({ success: false, message: err.message || "Server Error" });
  }
};


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

// POST Edit Address
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

        if (!userId) return res.status(401).json({ success: false, message: "Please log in", redirect: '/login' });
        if (!id) return res.status(400).json({ success: false, message: "Address ID is required" });

        const userAddress = await Address.findOne({ userId });
        if (!userAddress) return res.status(404).json({ success: false, message: "No addresses found" });

        const addr = userAddress.address.id(id);
        if (!addr) return res.status(404).json({ success: false, message: "Address not found" });

        // Reset default if needed
        if (isDefault) {
            userAddress.address.forEach(a => a.isDefault = false);
        }

        // Update fields
        addr.addressType = addressType;
        addr.name = name;
        addr.phone = phone;
        addr.houseName = houseName || "Unknown";
        addr.buildingNumber = buildingNumber;
        addr.landmark = landmark;
        addr.altPhone = altPhone;
        addr.nationality = nationality || "Unknown";
        addr.city = city;
        addr.state = state;
        addr.pincode = pincode;
        addr.isDefault = !!isDefault;

        await userAddress.save();

        res.json({ success: true, message: "Address updated successfully" });
    } catch (err) {
        console.error("Edit Address Error:", err);
        res.status(500).json({ success: false, message: err.message || "Server Error" });
    }
};


// Delete an address
const deleteAddress = async (req, res) => {
  try {
    const userId = req.session.user?.id;
    const { id } = req.params;

    if (!userId) return res.status(401).json({ success: false, message: "Please log in" });
    if (!id) return res.status(400).json({ success: false, message: "Address ID is required" });

    const userAddress = await Address.findOne({ userId });
    if (!userAddress) return res.status(404).json({ success: false, message: "No addresses found" });

    // Use pull to remove subdocument by _id
    const addr = userAddress.address.id(id);
    if (!addr) return res.status(404).json({ success: false, message: "Address not found" });

    // Instead of addr.remove()
    userAddress.address.pull({ _id: id });

    await userAddress.save();
    res.json({ success: true, message: "Address deleted successfully" });

  } catch (err) {
    console.error("Delete Address Error:", err);
    res.status(500).json({ success: false, message: err.message || "Server Error" });
  }
};


module.exports = {
     getAddresses,
     addAddress,
     editAddress, 
     deleteAddress,
     getAddressesJSON,
     getEditAddress
    };
