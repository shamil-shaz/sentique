const Coupon = require("../../models/couponSchema")

const normalizeDateForComparison = (date) => {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  return d;
};

// EDGE CASE 4: Capitalize words
const capitalizeWords = (str) => {
  return str
    .trim()
    .split(" ")
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
    .join(" ");
};

// Calculate coupon lifecycle status
const calculateCouponStatus = (activeDate, expireDate, isListed) => {
  const today = normalizeDateForComparison(new Date());
  const activeDateObj = normalizeDateForComparison(activeDate);
  const expireDateObj = normalizeDateForComparison(expireDate);

  if (expireDateObj < today) {
    return "expired";
  } else if (activeDateObj > today) {
    return "upcoming";
  } else {
    return "ongoing";
  }
};

// EDGE CASE 3: Validate coupon code format
const validateCouponCodeFormat = (code) => {
  if (code.includes(" ")) {
    return { valid: false, message: "Coupon code cannot contain spaces" };
  }

  const validFormat = /^[A-Z0-9_-]+$/i;
  if (!validFormat.test(code)) {
    return {
      valid: false,
      message:
        "Coupon code can only contain letters, numbers, hyphens (-), and underscores (_)",
    };
  }

  return { valid: true };
};

// EDGE CASE 5: Validate discount
const validateDiscount = (discount, discountType, minimumPrice) => {
  if (discountType === "flat") {
    minimumPrice = Number(minimumPrice);
    if (!isNaN(minimumPrice) && minimumPrice > 0 && discount > minimumPrice) {
      return {
        valid: false,
        message: `Flat discount (₹${discount}) cannot be greater than minimum purchase (₹${minimumPrice})`,
      };
    }
  }

  if (discount < 0) {
    return { valid: false, message: "Discount cannot be negative" };
  }

  if (discountType === "percentage" && discount > 100) {
    return { valid: false, message: "Percentage discount cannot exceed 100%" };
  }

  return { valid: true };
};

// Render coupon management page
const getCoupons = async (req, res) => {
  try {
    res.render("couponsManaging");
  } catch (error) {
    console.error("Error in getCoupons:", error);
    res.redirect("/pageNotFound");
  }
};

// Fetch all coupons
const getAllCoupons = async (req, res) => {
  try {
    const coupons = await Coupon.find()
      .populate("appliedUsers.userId", "email name")
      .populate("appliedUsers.orderId", "_id")
      .sort({ createdAt: -1 })
      .lean();

    const couponsWithStatus = coupons.map((coupon) => {
      const lifecycleStatus = calculateCouponStatus(
        coupon.activeDate,
        coupon.expireDate,
        coupon.isListed
      );

      return {
        ...coupon,
        used: coupon.appliedUsers ? coupon.appliedUsers.length : 0,
        actionStatus: coupon.isListed ? "active" : "inactive",
        status: lifecycleStatus,
        isListed: coupon.isListed !== false,
      };
    });

    console.log("✅ Fetched coupons:", couponsWithStatus.length);
    res.json({ success: true, coupons: couponsWithStatus });
  } catch (error) {
    console.error("Error fetching coupons:", error);
    res.status(500).json({
      success: false,
      message: "Error fetching coupons",
      error: error.message,
    });
  }
};

// Create a new coupon
const createCoupon = async (req, res) => {
  try {
    console.log("=== CREATE COUPON REQUEST ===");
    console.log("Body:", req.body);

    let {
      couponName,
      couponCode,
      description,
      discountType = "flat",
      usageType = "once",
      activeDate,
      expireDate,
      limit,
      discountPrice,
      minimumPrice,
      maxDiscountAmount = 0,
      isListed = true,
    } = req.body;

    // EDGE CASE 1: Empty Fields
    if (
      !couponName ||
      !couponCode ||
      !activeDate ||
      !expireDate ||
      discountPrice === undefined ||
      minimumPrice === undefined ||
      !limit
    ) {
      return res.status(400).json({
        success: false,
        message: "All required fields must be filled",
      });
    }

    // Trim and normalize
    couponName = couponName.trim();
    couponCode = couponCode.trim().toUpperCase();

    // EDGE CASE 4: Capitalize coupon name
    couponName = capitalizeWords(couponName);

    // EDGE CASE 1: Validate empty name
    if (!couponName || couponName.length < 2 || couponName.length > 50) {
      return res.status(400).json({
        success: false,
        message: "Coupon name must be between 2 and 50 characters",
      });
    }

    // EDGE CASE 3: Validate coupon code format
    const codeFormatValidation = validateCouponCodeFormat(couponCode);
    if (!codeFormatValidation.valid) {
      return res.status(400).json({
        success: false,
        message: codeFormatValidation.message,
      });
    }

    // EDGE CASE 3: Validate code length
    if (couponCode.length < 3 || couponCode.length > 20) {
      return res.status(400).json({
        success: false,
        message: "Coupon code must be between 3 and 20 characters",
      });
    }

    // Convert to numbers
    const discount = Number(discountPrice);
    const minimum = Number(minimumPrice);
    const limitNum = Number(limit);
    const maxDiscount = Number(maxDiscountAmount);

    // EDGE CASE 6: Validate minimum purchase
    if (isNaN(minimum)) {
      return res.status(400).json({
        success: false,
        message: "Minimum purchase must be a valid number",
      });
    }

    if (minimum < 0) {
      return res.status(400).json({
        success: false,
        message: "Minimum purchase cannot be negative",
      });
    }

    // EDGE CASE 5: Validate discount
    const discountValidation = validateDiscount(discount, discountType, minimum);
    if (!discountValidation.valid) {
      return res.status(400).json({
        success: false,
        message: discountValidation.message,
      });
    }

    // EDGE CASE 7: Validate usage limit
    if (isNaN(limitNum) || limitNum <= 0 || !Number.isInteger(limitNum)) {
      return res.status(400).json({
        success: false,
        message: "Usage limit must be a positive whole number",
      });
    }

    // EDGE CASE 8: Validate and normalize dates
    let activeDateObj = new Date(activeDate);
    let expireDateObj = new Date(expireDate);
    const today = normalizeDateForComparison(new Date());

    if (isNaN(activeDateObj.getTime()) || isNaN(expireDateObj.getTime())) {
      return res.status(400).json({
        success: false,
        message: "Invalid date format. Please use YYYY-MM-DD",
      });
    }

    activeDateObj = normalizeDateForComparison(activeDateObj);
    expireDateObj = normalizeDateForComparison(expireDateObj);

    if (activeDateObj < today) {
      return res.status(400).json({
        success: false,
        message: "Start date cannot be in the past",
      });
    }

    if (activeDateObj.getTime() === expireDateObj.getTime()) {
      return res.status(400).json({
        success: false,
        message: "Start date and expiry date cannot be the same",
      });
    }

    if (activeDateObj > expireDateObj) {
      return res.status(400).json({
        success: false,
        message: "Start date must be before expiry date",
      });
    }

    // EDGE CASE 2: Check duplicates
    const existingCode = await Coupon.findOne({
      couponCode: couponCode,
    });

    if (existingCode) {
      return res.status(400).json({
        success: false,
        message: "Coupon code already exists",
      });
    }

    const existingName = await Coupon.findOne({
      couponName: { $regex: `^${couponName}$`, $options: "i" },
    });

    if (existingName) {
      return res.status(400).json({
        success: false,
        message: "Coupon name already exists",
      });
    }

    const newCoupon = new Coupon({
      couponName,
      couponCode,
      description: description ? description.trim() : "",
      discountType,
      usageType,
      activeDate: activeDateObj,
      expireDate: expireDateObj,
      limit: limitNum,
      discountPrice: discount,
      minimumPrice: minimum,
      maxDiscountAmount: maxDiscount,
      isListed,
      appliedUsers: [],
    });

    const savedCoupon = await newCoupon.save();
    const populatedCoupon = await Coupon.populate(savedCoupon, [
      { path: "appliedUsers.userId", select: "email name" },
      { path: "appliedUsers.orderId", select: "_id" },
    ]);

    const lifecycleStatus = calculateCouponStatus(
      populatedCoupon.activeDate,
      populatedCoupon.expireDate,
      populatedCoupon.isListed
    );

    const savedWithStatus = {
      ...populatedCoupon.toObject(),
      used: populatedCoupon.appliedUsers.length,
      actionStatus: populatedCoupon.isListed ? "active" : "inactive",
      status: lifecycleStatus,
      isListed: populatedCoupon.isListed !== false,
    };

    res.json({
      success: true,
      message: "Coupon created successfully",
      coupon: savedWithStatus,
    });
  } catch (error) {
    console.error("❌ Error creating coupon:", error);

    if (error.code === 11000) {
      const field = Object.keys(error.keyPattern)[0];
      const fieldName =
        field === "couponCode"
          ? "Coupon code"
          : field === "couponName"
          ? "Coupon name"
          : field;
      return res.status(400).json({
        success: false,
        message: `${fieldName} already exists. Please use a different value.`,
      });
    }

    if (error.name === "ValidationError") {
      const messages = Object.values(error.errors).map((err) => err.message);
      return res.status(400).json({
        success: false,
        message: "Validation error: " + messages.join(", "),
      });
    }

    res.status(500).json({
      success: false,
      message: "Error creating coupon",
      error: error.message,
    });
  }
};

// Update an existing coupon
const updateCoupon = async (req, res) => {
  try {
    const { id } = req.params
    let {
      couponName,
      couponCode,
      description,
      discountType = "flat",
      usageType = "once",
      activeDate,
      expireDate,
      limit,
      discountPrice,
      minimumPrice,
      maxDiscountAmount = 0,
      isListed = true,
    } = req.body

    console.log("=== UPDATE COUPON REQUEST ===")
    console.log("Coupon ID:", id)

    // EDGE CASE 1: Empty Fields
    if (
      !couponName ||
      !couponCode ||
      !activeDate ||
      !expireDate ||
      discountPrice === undefined ||
      minimumPrice === undefined ||
      !limit
    ) {
      return res.status(400).json({
        success: false,
        message: "All required fields must be filled",
      })
    }

    couponName = couponName.trim()
    couponCode = couponCode.trim().toUpperCase()

    // EDGE CASE 4: Capitalize coupon name
    couponName = capitalizeWords(couponName)

    // EDGE CASE 4: Validate name length
    if (!couponName || couponName.length < 2 || couponName.length > 50) {
      return res.status(400).json({
        success: false,
        message: "Coupon name must be between 2 and 50 characters",
      })
    }

    // EDGE CASE 3: Validate coupon code format
    const codeFormatValidation = validateCouponCodeFormat(couponCode)
    if (!codeFormatValidation.valid) {
      return res.status(400).json({
        success: false,
        message: codeFormatValidation.message,
      })
    }

    // EDGE CASE 3: Validate code length
    if (couponCode.length < 3 || couponCode.length > 20) {
      return res.status(400).json({
        success: false,
        message: "Coupon code must be between 3 and 20 characters",
      })
    }

    // Convert to numbers
    const discount = Number(discountPrice)
    const minimum = Number(minimumPrice)
    const limitNum = Number(limit)
    const maxDiscount = Number(maxDiscountAmount)

    // EDGE CASE 6: Validate minimum purchase
    if (isNaN(minimum)) {
      return res.status(400).json({
        success: false,
        message: "Minimum purchase must be a valid number",
      })
    }

    if (minimum < 0) {
      return res.status(400).json({
        success: false,
        message: "Minimum purchase cannot be negative",
      })
    }

    // EDGE CASE 5: Validate discount
    const discountValidation = validateDiscount(discount, discountType, minimum)
    if (!discountValidation.valid) {
      return res.status(400).json({
        success: false,
        message: discountValidation.message,
      })
    }

    // EDGE CASE 7: Validate usage limit
    if (isNaN(limitNum)) {
      return res.status(400).json({
        success: false,
        message: "Usage limit must be a valid number",
      })
    }

    if (limitNum <= 0) {
      return res.status(400).json({
        success: false,
        message: "Usage limit must be greater than 0",
      })
    }

    if (!Number.isInteger(limitNum)) {
      return res.status(400).json({
        success: false,
        message: "Usage limit must be a whole number (no decimals)",
      })
    }

    // EDGE CASE 9: Check if coupon exists (deleted)
    const coupon = await Coupon.findById(id)
    if (!coupon) {
      return res.status(404).json({
        success: false,
        message: "Coupon not found or has been deleted",
      })
    }

    // EDGE CASE 9/10: Check if coupon is expired
    const today = normalizeDateForComparison(new Date())
    const currentExpireDate = normalizeDateForComparison(coupon.expireDate)

    if (currentExpireDate < today) {
      return res.status(400).json({
        success: false,
        message: "Cannot modify an expired coupon",
      })
    }

    // EDGE CASE 8: Validate and normalize dates
    let activeDateObj = new Date(activeDate)
    let expireDateObj = new Date(expireDate)

    // Check for invalid date format
    if (isNaN(activeDateObj.getTime()) || isNaN(expireDateObj.getTime())) {
      return res.status(400).json({
        success: false,
        message: "Invalid date format. Please use YYYY-MM-DD",
      })
    }

    // Normalize dates
    activeDateObj = normalizeDateForComparison(activeDateObj)
    expireDateObj = normalizeDateForComparison(expireDateObj)

    // EDGE CASE 8: Check past dates
    if (activeDateObj < today) {
      return res.status(400).json({
        success: false,
        message: "Start date cannot be in the past",
      })
    }

    // EDGE CASE 8: Check if dates are equal
    if (activeDateObj.getTime() === expireDateObj.getTime()) {
      return res.status(400).json({
        success: false,
        message: "Start date and expiry date cannot be the same",
      })
    }

    // EDGE CASE 8: Check if start > expire
    if (activeDateObj > expireDateObj) {
      return res.status(400).json({
        success: false,
        message: "Start date must be before expiry date",
      })
    }

    // EDGE CASE 10: Check for duplicate code (excluding current)
    const existingCode = await Coupon.findOne({
      _id: { $ne: id },
      couponCode: couponCode.trim().toUpperCase(),
    })

    if (existingCode) {
      return res.status(400).json({
        success: false,
        message: "This coupon code is already in use",
      })
    }

    // EDGE CASE 10: Check for duplicate name (excluding current)
    const existingName = await Coupon.findOne({
      _id: { $ne: id },
      couponName: { $regex: `^${couponName}$`, $options: "i" },
    })

    if (existingName) {
      return res.status(400).json({
        success: false,
        message: "This coupon name is already in use",
      })
    }

    const updatedCoupon = await Coupon.findByIdAndUpdate(
      id,
      {
        couponName: couponName,
        couponCode: couponCode.trim().toUpperCase(),
        description: description ? description.trim() : "",
        discountType,
        usageType,
        activeDate: activeDateObj,
        expireDate: expireDateObj,
        limit: limitNum,
        discountPrice: discount,
        minimumPrice: minimum,
        maxDiscountAmount: maxDiscount,
        isListed: isListed,
      },
      { new: true, runValidators: true },
    )
      .populate("appliedUsers.userId", "email name")
      .populate("appliedUsers.orderId", "_id")

    const lifecycleStatus = calculateCouponStatus(
      updatedCoupon.activeDate,
      updatedCoupon.expireDate,
      updatedCoupon.isListed,
    )
    const updatedWithStatus = {
      ...updatedCoupon.toObject(),
      used: updatedCoupon.appliedUsers ? updatedCoupon.appliedUsers.length : 0,
      actionStatus: updatedCoupon.isListed ? "active" : "inactive",
      status: lifecycleStatus,
      isListed: updatedCoupon.isListed !== false,
    }

    console.log("✅ Coupon updated:", updatedCoupon._id)

    res.json({
      success: true,
      message: "Coupon updated successfully",
      coupon: updatedWithStatus,
    })
  } catch (error) {
    console.error("❌ Error updating coupon:", error)

    // EDGE CASE 15: Handle duplicate key error
    if (error.code === 11000) {
      const field = Object.keys(error.keyPattern)[0]
      const fieldName = field === "couponCode" ? "Coupon code" : field === "couponName" ? "Coupon name" : field
      return res.status(400).json({
        success: false,
        message: `${fieldName} already exists. Please use a different value.`,
      })
    }

    res.status(500).json({
      success: false,
      message: "Error updating coupon",
      error: error.message,
    })
  }
}

// Delete a coupon
const deleteCoupon = async (req, res) => {
  try {
    const { id } = req.params
    console.log("🗑️ Deleting coupon:", id)

    const deletedCoupon = await Coupon.findByIdAndDelete(id)

    if (!deletedCoupon) {
      return res.status(404).json({
        success: false,
        message: "Coupon not found",
      })
    }

    console.log("✅ Coupon deleted:", id)

    res.json({
      success: true,
      message: "Coupon deleted successfully",
    })
  } catch (error) {
    console.error("❌ Error deleting coupon:", error)
    res.status(500).json({
      success: false,
      message: "Error deleting coupon",
      error: error.message,
    })
  }
}

// Toggle coupon listing status
const toggleCouponListing = async (req, res) => {
  try {
    const { id } = req.params
    console.log("🔄 Toggling coupon listing for ID:", id)

    const coupon = await Coupon.findById(id)
      .populate("appliedUsers.userId", "email name")
      .populate("appliedUsers.orderId", "_id")

    if (!coupon) {
      console.log("❌ Coupon not found:", id)
      return res.status(404).json({
        success: false,
        message: "Coupon not found",
      })
    }

    coupon.isListed = !coupon.isListed
    await coupon.save()

    const lifecycleStatus = calculateCouponStatus(coupon.activeDate, coupon.expireDate, coupon.isListed)

    const toggledWithStatus = {
      _id: coupon._id,
      couponCode: coupon.couponCode,
      couponName: coupon.couponName,
      discountPrice: coupon.discountPrice,
      discountType: coupon.discountType,
      minimumPrice: coupon.minimumPrice,
      limit: coupon.limit,
      expireDate: coupon.expireDate,
      activeDate: coupon.activeDate,
      description: coupon.description || "",
      isListed: coupon.isListed,
      usageType: coupon.usageType || "once",
      used: coupon.appliedUsers ? coupon.appliedUsers.length : 0,
      actionStatus: coupon.isListed ? "active" : "inactive",
      status: lifecycleStatus,
    }

    console.log("✅ Coupon", coupon.isListed ? "listed" : "unlisted", ":", id)

    res.json({
      success: true,
      message: `Coupon ${coupon.isListed ? "listed" : "unlisted"} successfully`,
      coupon: toggledWithStatus,
    })
  } catch (error) {
    console.error("❌ Error toggling coupon listing:", error)
    res.status(500).json({
      success: false,
      message: "Error toggling coupon listing",
      error: error.message,
    })
  }
}

// Deprecated: Toggle coupon status (for backward compatibility)
const toggleCouponStatus = async (req, res) => {
  try {
    const { id } = req.params

    const coupon = await Coupon.findById(id)
      .populate("appliedUsers.userId", "email name")
      .populate("appliedUsers.orderId", "_id")

    if (!coupon) {
      return res.status(404).json({
        success: false,
        message: "Coupon not found",
      })
    }

    coupon.isListed = !coupon.isListed
    await coupon.save()

    const lifecycleStatus = calculateCouponStatus(coupon.activeDate, coupon.expireDate, coupon.isListed)

    const toggledWithStatus = {
      ...coupon.toObject(),
      used: coupon.appliedUsers ? coupon.appliedUsers.length : 0,
      actionStatus: coupon.isListed ? "active" : "inactive",
      status: lifecycleStatus,
      isListed: coupon.isListed,
    }

    res.json({
      success: true,
      message: `Coupon ${coupon.isListed ? "listed" : "unlisted"} successfully`,
      coupon: toggledWithStatus,
    })
  } catch (error) {
    console.error("Error toggling coupon status:", error)
    res.status(500).json({
      success: false,
      message: "Error toggling coupon status",
      error: error.message,
    })
  }
}

module.exports = {
  getCoupons,
  getAllCoupons,
  createCoupon,
  updateCoupon,
  deleteCoupon,
  toggleCouponListing,
  toggleCouponStatus,
}