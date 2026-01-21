const Address = require("../../models/addressSchema");
const User = require("../../models/userSchema");

const getAddresses = async (req, res) => {
  try {
    const userId = req.userId;
    if (!userId) {
      req.flash("error", "Please log in");
      return res.redirect("/login");
    }

    const user = await User.findById(userId);
    let userAddress = await Address.findOne({ userId });

    if (!userAddress) {
      userAddress = new Address({ userId, address: [] });
      await userAddress.save();
    }

    res.render("address", {
      title: "Manage Addresses",
      addresses: userAddress.address,
      user,
    });
  } catch (err) {
    console.error("Get Addresses Error:", err);
    res.status(500).json({ error: "Internal server error." });
  }
};

const getAddressesJSON = async (req, res) => {
  try {
    const userId = req.userId;
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

const getEditAddress = async (req, res) => {
  try {
    const userId = req.userId;
    const addressId = req.params.id;

    if (!userId) return res.redirect("/login");

    const userAddress = await Address.findOne({ userId });
    if (!userAddress) return res.redirect("/profile/address");

    const address = userAddress.address.id(addressId);
    if (!address) return res.redirect("/profile/address");

    const user = await User.findById(userId);

    res.render("edit-address", { address, user });
  } catch (error) {
    console.error("Get Edit Address Error:", error);
    res.redirect("/pageNotFound");
  }
};

const deleteAddress = async (req, res) => {
  try {
    const userId = req.userId;
    const { id } = req.params;

    if (!userId)
      return res.status(401).json({ success: false, message: "Please log in" });
    if (!id)
      return res
        .status(400)
        .json({ success: false, message: "Address ID is required" });

    const userAddress = await Address.findOne({ userId });
    if (!userAddress)
      return res
        .status(404)
        .json({ success: false, message: "No addresses found" });

    const addr = userAddress.address.id(id);
    if (!addr)
      return res
        .status(404)
        .json({ success: false, message: "Address not found" });

    userAddress.address.pull({ _id: id });

    await userAddress.save();
    res.json({ success: true, message: "Address deleted successfully" });
  } catch (err) {
    console.error("Delete Address Error:", err);
    res
      .status(500)
      .json({ success: false, message: err.message || "Server Error" });
  }
};

const isValidIndianPincode = (pincode) => {
  if (!/^\d{6}$/.test(pincode)) {
    return { valid: false, message: "PIN code must be exactly 6 digits" };
  }

  if (/^(\d)\1{5}$/.test(pincode)) {
    return { valid: false, message: "PIN code cannot have all same digits" };
  }

  let isSequential = true;
  for (let i = 1; i < 6; i++) {
    if (parseInt(pincode[i]) - parseInt(pincode[i - 1]) !== 1) {
      isSequential = false;
      break;
    }
  }
  if (isSequential) {
    return { valid: false, message: "PIN code cannot be sequential" };
  }

  let isReverseSequential = true;
  for (let i = 1; i < 6; i++) {
    if (parseInt(pincode[i - 1]) - parseInt(pincode[i]) !== 1) {
      isReverseSequential = false;
      break;
    }
  }
  if (isReverseSequential) {
    return { valid: false, message: "PIN code cannot be reverse sequential" };
  }

  return { valid: true, message: "Valid PIN code" };
};

const validateAddressInput = (data) => {
  const errors = [];

  if (!data.addressType || !data.addressType.trim()) {
    errors.push("Address type is required");
  } else if (!["Home", "Work", "Other"].includes(data.addressType.trim())) {
    errors.push("Address type must be Home, Work, or Other");
  }

  if (!data.name || !data.name.trim()) {
    errors.push("Full name is required");
  } else {
    const name = data.name.trim();
    if (name.length < 3) {
      errors.push("Full name must be at least 3 characters");
    } else if (name.length > 20) {
      errors.push("Full name cannot exceed 50 characters");
    } else if (!/^[a-zA-Z\s]+$/.test(name)) {
      errors.push("Full name can only contain letters and spaces");
    }
  }

  if (!data.phone || !data.phone.trim()) {
    errors.push("Phone number is required");
  } else {
    const phone = data.phone.trim();
    if (!/^\d{10}$/.test(phone)) {
      errors.push("Phone number must be exactly 10 digits");
    }
  }

  if (!data.houseName || !data.houseName.trim()) {
    errors.push("House/Building name is required");
  } else {
    const house = data.houseName.trim();
    if (house.length < 2) {
      errors.push("House/Building name must be at least 2 characters");
    }
  }

  if (data.buildingNumber && data.buildingNumber.trim()) {
    const building = data.buildingNumber.trim();
    if (building.length < 1) {
      errors.push("Building number cannot be empty if provided");
    }
  }

  if (!data.landmark || !data.landmark.trim()) {
    errors.push("Landmark is required");
  } else {
    const landmark = data.landmark.trim();
    if (landmark.length < 3) {
      errors.push("Landmark must be at least 3 characters");
    }
  }

  if (data.altPhone && data.altPhone.trim()) {
    const altPhone = data.altPhone.trim();
    if (!/^\d{10}$/.test(altPhone)) {
      errors.push("Alternative phone number must be exactly 10 digits");
    }

    if (data.phone && data.phone.trim() === altPhone) {
      errors.push(
        "Alternative phone number cannot be same as main phone number"
      );
    }
  }

  if (!data.nationality || !data.nationality.trim()) {
    errors.push("Nationality is required");
  } else {
    const nationality = data.nationality.trim();
    if (nationality.length < 2) {
      errors.push("Nationality must be at least 2 characters");
    } else if (!/^[a-zA-Z\s]+$/.test(nationality)) {
      errors.push("Nationality can only contain letters and spaces");
    }
  }

  if (!data.city || !data.city.trim()) {
    errors.push("City is required");
  } else {
    const city = data.city.trim();
    if (city.length < 2) {
      errors.push("City must be at least 2 characters");
    } else if (!/^[a-zA-Z\s\-]+$/.test(city)) {
      errors.push("City can only contain letters, spaces, and hyphens");
    }
  }

  if (!data.state || !data.state.trim()) {
    errors.push("State is required");
  } else {
    const validStates = [
      "Andhra Pradesh",
      "Arunachal Pradesh",
      "Assam",
      "Bihar",
      "Chhattisgarh",
      "Goa",
      "Gujarat",
      "Haryana",
      "Himachal Pradesh",
      "Jharkhand",
      "Karnataka",
      "Kerala",
      "Madhya Pradesh",
      "Maharashtra",
      "Manipur",
      "Meghalaya",
      "Mizoram",
      "Nagaland",
      "Odisha",
      "Punjab",
      "Rajasthan",
      "Sikkim",
      "Tamil Nadu",
      "Telangana",
      "Tripura",
      "Uttar Pradesh",
      "Uttarakhand",
      "West Bengal",
    ];
    if (!validStates.includes(data.state.trim())) {
      errors.push("Invalid state selected");
    }
  }

  if (!data.pincode || !data.pincode.trim()) {
    errors.push("PIN code is required");
  } else {
    const pincodeValidation = isValidIndianPincode(data.pincode.trim());
    if (!pincodeValidation.valid) {
      errors.push(pincodeValidation.message);
    }
  }

  return errors;
};

const addAddress = async (req, res) => {
  try {
    const userId = req.userId;
    console.log("AddAddress - UserID:", userId);
    console.log("AddAddress - Request Body:", req.body);

    if (!userId) {
      console.warn("AddAddress - No user ID in session");
      return res
        .status(401)
        .json({ success: false, message: "Please log in", redirect: "/login" });
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
      isDefault,
    } = req.body;

    console.log("AddAddress - Validating input data");
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
      pincode,
    });

    if (validationErrors.length > 0) {
      console.warn("AddAddress - Validation errors:", validationErrors);
      return res.status(400).json({
        success: false,
        message: validationErrors[0],
        errors: validationErrors,
      });
    }

    let userAddress = await Address.findOne({ userId });
    if (!userAddress) {
      console.log("AddAddress - Creating new address document for user");
      userAddress = new Address({ userId, address: [] });
    }

    if (isDefault) {
      console.log(
        "AddAddress - Setting as default, unsetting previous defaults"
      );
      userAddress.address.forEach((addr) => (addr.isDefault = false));
    } else if (userAddress.address.length === 0) {
      console.warn("AddAddress - First address not marked as default");
      return res.status(400).json({
        success: false,
        message: "First address must be set as default",
      });
    }

    const newAddress = {
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
      isDefault: !!isDefault,
    };

    console.log("AddAddress - New address object:", newAddress);
    userAddress.address.push(newAddress);

    console.log("AddAddress - Saving to database");
    await userAddress.save();
    console.log("AddAddress - Successfully saved");

    res.json({ success: true, message: "Address added successfully" });
  } catch (err) {
    console.error("Add Address Error:", err.message);
    console.error("Add Address Error Stack:", err.stack);
    res
      .status(500)
      .json({ success: false, message: err.message || "Server Error" });
  }
};

const editAddress = async (req, res) => {
  try {
    const userId = req.userId;
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
      isDefault,
    } = req.body;

    if (!userId) {
      return res
        .status(401)
        .json({ success: false, message: "Please log in", redirect: "/login" });
    }

    if (!id) {
      return res
        .status(400)
        .json({ success: false, message: "Address ID is required" });
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
      pincode,
    });

    if (validationErrors.length > 0) {
      return res.status(400).json({
        success: false,
        message: validationErrors[0],
        errors: validationErrors,
      });
    }

    const userAddress = await Address.findOne({ userId });
    if (!userAddress) {
      return res
        .status(404)
        .json({ success: false, message: "No addresses found" });
    }

    const addr = userAddress.address.id(id);
    if (!addr) {
      return res
        .status(404)
        .json({ success: false, message: "Address not found" });
    }

    if (isDefault) {
      userAddress.address.forEach((a) => (a.isDefault = false));
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
    res
      .status(500)
      .json({ success: false, message: err.message || "Server Error" });
  }
};

const getLocationByPincode = async (req, res) => {
  try {
    const { pincode } = req.params;

    console.log("Fetching location for pincode:", pincode);

    if (!/^\d{6}$/.test(pincode)) {
      return res.json({ success: false, message: "Invalid PIN code format" });
    }

    const validation = isValidIndianPincode(pincode);
    if (!validation.valid) {
      return res.json({ success: false, message: validation.message });
    }

    try {
      const apiUrl = `https://api.postalpincode.in/pincode/${pincode}`;
      console.log("API URL:", apiUrl);

      const response = await fetch(apiUrl, {
        method: "GET",
        headers: {
          Accept: "application/json",
        },
      });

      console.log("API Response Status:", response.status);

      if (!response.ok) {
        throw new Error(`API responded with status: ${response.status}`);
      }

      const data = await response.json();
      console.log("API Data:", data);

      if (!data || data.length === 0) {
        return res.json({
          success: false,
          message: "Invalid response from location service",
        });
      }

      const result = data[0];

      if (
        result.Status === "Success" &&
        result.PostOffice &&
        result.PostOffice.length > 0
      ) {
        const office = result.PostOffice[0];

        const response_data = {
          success: true,
          city: office.District || office.Name || "",
          state: office.State || "",
          postOffice: office.Name || "",
          branch: office.Branch || "",
        };

        console.log("Returning location data:", response_data);
        return res.json(response_data);
      } else {
        console.log("No postal office found in API response");
        return res.json({
          success: false,
          message:
            "No postal office found for this PIN code. Please enter a valid PIN code.",
        });
      }
    } catch (apiErr) {
      console.error("API Error:", apiErr.message);
      console.error("API Error Stack:", apiErr.stack);
      return res.json({
        success: false,
        message:
          "Unable to fetch location. Please verify PIN code is correct and try again.",
      });
    }
  } catch (err) {
    console.error("PIN Code Error:", err.message);
    console.error("PIN Code Error Stack:", err.stack);
    res.json({
      success: false,
      message: "Server error while processing PIN code",
    });
  }
};

module.exports = {
  getAddresses,
  addAddress,
  editAddress,
  deleteAddress,
  getAddressesJSON,
  getEditAddress,
  validateAddressInput,
  isValidIndianPincode,
  getLocationByPincode,
};
