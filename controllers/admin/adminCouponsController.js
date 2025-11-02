
// const Coupon = require("../../models/couponSchema")
// const User = require('../../models/userSchema');

// const normalizeDateForComparison = (date) => {
//   const d = new Date(date);
//   d.setHours(0, 0, 0, 0);
//   return d;
// };

// const capitalizeWords = (str) => {
//   return str
//     .trim()
//     .split(" ")
//     .map((word) => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
//     .join(" ");
// };

// const calculateCouponStatus = (activeDate, expireDate, isListed) => {
//   const today = normalizeDateForComparison(new Date());
//   const activeDateObj = normalizeDateForComparison(activeDate);
//   const expireDateObj = normalizeDateForComparison(expireDate);

//   if (expireDateObj < today) {
//     return "expired";
//   } else if (activeDateObj > today) {
//     return "upcoming";
//   } else {
//     return "ongoing";
//   }
// };

// const validateCouponCodeFormat = (code) => {
//   if (code.includes(" ")) {
//     return { valid: false, message: "Coupon code cannot contain spaces" };
//   }

//   const validFormat = /^[A-Z0-9_-]+$/i;
//   if (!validFormat.test(code)) {
//     return {
//       valid: false,
//       message:
//         "Coupon code can only contain letters, numbers, hyphens (-), and underscores (_)",
//     };
//   }

//   return { valid: true };
// };

// const validateDiscount = (discount, discountType, minimumPrice) => {
//   // ✅ NEW: Check for zero discount (missing in original)
//   if (discount === 0) {
//     return { valid: false, message: "Discount cannot be zero" };
//   }

//   if (discountType === "flat") {
//     minimumPrice = Number(minimumPrice);
//     if (!isNaN(minimumPrice) && minimumPrice > 0 && discount > minimumPrice) {
//       return {
//         valid: false,
//         message: `Flat discount (₹${discount}) cannot be greater than minimum purchase (₹${minimumPrice})`,
//       };
//     }
//   }

//   if (discount < 0) {
//     return { valid: false, message: "Discount cannot be negative" };
//   }

//   if (discountType === "percentage" && discount > 100) {
//     return { valid: false, message: "Percentage discount cannot exceed 100%" };
//   }

//   return { valid: true };
// };

// // Render coupon management page
// const getCoupons = async (req, res) => {
//   try {
//     res.render("couponsManaging");
//   } catch (error) {
//     console.error("Error in getCoupons:", error);
//     res.redirect("/pageNotFound");
//   }
// };

// // Fetch all coupons - NO CHANGES NEEDED (already returns all fields)
// const getAllCoupons = async (req, res) => {
//   try {
//     const coupons = await Coupon.find()
//       .populate("appliedUsers.userId", "email name")
//       .populate("appliedUsers.orderId", "_id")
//       .sort({ createdAt: -1 })
//       .lean();

//     const couponsWithStatus = coupons.map((coupon) => {
//       const lifecycleStatus = calculateCouponStatus(
//         coupon.activeDate,
//         coupon.expireDate,
//         coupon.isListed
//       );

//       return {
//         ...coupon,
//         used: coupon.appliedUsers ? coupon.appliedUsers.length : 0,
//         actionStatus: coupon.isListed ? "active" : "inactive",
//         status: lifecycleStatus,
//         isListed: coupon.isListed !== false,
//       };
//     });

//     console.log("✅ Fetched coupons:", couponsWithStatus.length);
//     res.json({ success: true, coupons: couponsWithStatus });
//   } catch (error) {
//     console.error("Error fetching coupons:", error);
//     res.status(500).json({
//       success: false,
//       message: "Error fetching coupons",
//       error: error.message,
//     });
//   }
// };

// // Create a new coupon - UPDATED with description handling
// const createCoupon = async (req, res) => {
//   try {
//     console.log("=== CREATE COUPON REQUEST ===");
//     console.log("Body:", req.body);

//     let {
//       couponName,
//       couponCode,
//       description = "", // ✅ NEW: Accept description from frontend
//       discountType = "flat",
//       usageType = "once",
//       activeDate,
//       expireDate,
//       limit,
//       discountPrice,
//       minimumPrice,
//       maxDiscountAmount = 0,
//       isListed = true,
//     } = req.body;

//     // EDGE CASE 1: Empty Fields
//     if (
//       !couponName ||
//       !couponCode ||
//       !activeDate ||
//       !expireDate ||
//       discountPrice === undefined ||
//       minimumPrice === undefined ||
//       !limit
//     ) {
//       return res.status(400).json({
//         success: false,
//         message: "All required fields must be filled",
//       });
//     }

//     // Trim and normalize
//     couponName = couponName.trim();
//     couponCode = couponCode.trim().toUpperCase();
//     description = description.trim(); // ✅ NEW: Trim description

//     // EDGE CASE 4: Capitalize coupon name
//     couponName = capitalizeWords(couponName);

//     // EDGE CASE 1: Validate empty name
//     if (!couponName || couponName.length < 2 || couponName.length > 50) {
//       return res.status(400).json({
//         success: false,
//         message: "Coupon name must be between 2 and 50 characters",
//       });
//     }

//     // EDGE CASE 3: Validate coupon code format
//     const codeFormatValidation = validateCouponCodeFormat(couponCode);
//     if (!codeFormatValidation.valid) {
//       return res.status(400).json({
//         success: false,
//         message: codeFormatValidation.message,
//       });
//     }

//     // EDGE CASE 3: Validate code length
//     if (couponCode.length < 3 || couponCode.length > 20) {
//       return res.status(400).json({
//         success: false,
//         message: "Coupon code must be between 3 and 20 characters",
//       });
//     }

//     // Convert to numbers
//     const discount = Number(discountPrice);
//     const minimum = Number(minimumPrice);
//     const limitNum = Number(limit);
//     const maxDiscount = Number(maxDiscountAmount);

//     // EDGE CASE 6: Validate minimum purchase
//     if (isNaN(minimum)) {
//       return res.status(400).json({
//         success: false,
//         message: "Minimum purchase must be a valid number",
//       });
//     }

//     if (minimum < 0) {
//       return res.status(400).json({
//         success: false,
//         message: "Minimum purchase cannot be negative",
//       });
//     }

//     // EDGE CASE 5: Validate discount
//     const discountValidation = validateDiscount(discount, discountType, minimum);
//     if (!discountValidation.valid) {
//       return res.status(400).json({
//         success: false,
//         message: discountValidation.message,
//       });
//     }

//     // EDGE CASE 7: Validate usage limit
//     if (isNaN(limitNum) || limitNum <= 0 || !Number.isInteger(limitNum)) {
//       return res.status(400).json({
//         success: false,
//         message: "Usage limit must be a positive whole number",
//       });
//     }

//     // EDGE CASE 8: Validate and normalize dates
//     let activeDateObj = new Date(activeDate);
//     let expireDateObj = new Date(expireDate);
//     const today = normalizeDateForComparison(new Date());

//     if (isNaN(activeDateObj.getTime()) || isNaN(expireDateObj.getTime())) {
//       return res.status(400).json({
//         success: false,
//         message: "Invalid date format. Please use YYYY-MM-DD",
//       });
//     }

//     activeDateObj = normalizeDateForComparison(activeDateObj);
//     expireDateObj = normalizeDateForComparison(expireDateObj);

//     if (activeDateObj < today) {
//       return res.status(400).json({
//         success: false,
//         message: "Start date cannot be in the past",
//       });
//     }

//     if (activeDateObj.getTime() === expireDateObj.getTime()) {
//       return res.status(400).json({
//         success: false,
//         message: "Start date and expiry date cannot be the same",
//       });
//     }

//     if (activeDateObj > expireDateObj) {
//       return res.status(400).json({
//         success: false,
//         message: "Start date must be before expiry date",
//       });
//     }

//     // EDGE CASE 2: Check duplicates
//     const existingCode = await Coupon.findOne({
//       couponCode: couponCode,
//     });

//     if (existingCode) {
//       return res.status(400).json({
//         success: false,
//         message: "Coupon code already exists",
//       });
//     }

//     const existingName = await Coupon.findOne({
//       couponName: { $regex: `^${couponName}$`, $options: "i" },
//     });

//     if (existingName) {
//       return res.status(400).json({
//         success: false,
//         message: "Coupon name already exists",
//       });
//     }

//     const newCoupon = new Coupon({
//       couponName,
//       couponCode,
//       description: description, // ✅ NEW: Save description
//       discountType,
//       usageType,
//       activeDate: activeDateObj,
//       expireDate: expireDateObj,
//       limit: limitNum,
//       discountPrice: discount,
//       minimumPrice: minimum,
//       maxDiscountAmount: maxDiscount,
//       isListed,
//       appliedUsers: [],
//     });

//     const savedCoupon = await newCoupon.save();
//     const populatedCoupon = await Coupon.populate(savedCoupon, [
//       { path: "appliedUsers.userId", select: "email name" },
//       { path: "appliedUsers.orderId", select: "_id" },
//     ]);

//     const lifecycleStatus = calculateCouponStatus(
//       populatedCoupon.activeDate,
//       populatedCoupon.expireDate,
//       populatedCoupon.isListed
//     );

//     const savedWithStatus = {
//       ...populatedCoupon.toObject(),
//       used: populatedCoupon.appliedUsers.length,
//       actionStatus: populatedCoupon.isListed ? "active" : "inactive",
//       status: lifecycleStatus,
//       isListed: populatedCoupon.isListed !== false,
//     };

//     res.json({
//       success: true,
//       message: "Coupon created successfully",
//       coupon: savedWithStatus,
//     });
//   } catch (error) {
//     console.error("❌ Error creating coupon:", error);

//     if (error.code === 11000) {
//       const field = Object.keys(error.keyPattern)[0];
//       const fieldName =
//         field === "couponCode"
//           ? "Coupon code"
//           : field === "couponName"
//           ? "Coupon name"
//           : field;
//       return res.status(400).json({
//         success: false,
//         message: `${fieldName} already exists. Please use a different value.`,
//       });
//     }

//     if (error.name === "ValidationError") {
//       const messages = Object.values(error.errors).map((err) => err.message);
//       return res.status(400).json({
//         success: false,
//         message: "Validation error: " + messages.join(", "),
//       });
//     }

//     res.status(500).json({
//       success: false,
//       message: "Error creating coupon",
//       error: error.message,
//     });
//   }
// };

// // Update an existing coupon - UPDATED with description handling
// const updateCoupon = async (req, res) => {
//   try {
//     const { id } = req.params;
//     let {
//       couponName,
//       couponCode,
//       description = "", // ✅ NEW: Accept description from frontend
//       discountType = "flat",
//       usageType = "once",
//       activeDate,
//       expireDate,
//       limit,
//       discountPrice,
//       minimumPrice,
//       maxDiscountAmount = 0,
//       isListed = true,
//     } = req.body;

//     console.log("=== UPDATE COUPON REQUEST ===");
//     console.log("Coupon ID:", id);
//     console.log("Request body:", req.body);  // ✅ NEW: Log full body for debugging

//     // EDGE CASE 1: Empty Fields
//     if (
//       !couponName ||
//       !couponCode ||
//       !activeDate ||
//       !expireDate ||
//       discountPrice === undefined ||
//       minimumPrice === undefined ||
//       !limit
//     ) {
//       return res.status(400).json({
//         success: false,
//         message: "All required fields must be filled",
//       });
//     }

//     couponName = couponName.trim();
//     couponCode = couponCode.trim().toUpperCase();
//     description = description.trim(); // ✅ NEW: Trim description

//     // EDGE CASE 4: Capitalize coupon name
//     couponName = capitalizeWords(couponName);

//     // EDGE CASE 4: Validate name length
//     if (!couponName || couponName.length < 2 || couponName.length > 50) {
//       return res.status(400).json({
//         success: false,
//         message: "Coupon name must be between 2 and 50 characters",
//       });
//     }

//     // EDGE CASE 3: Validate coupon code format
//     const codeFormatValidation = validateCouponCodeFormat(couponCode);
//     if (!codeFormatValidation.valid) {
//       return res.status(400).json({
//         success: false,
//         message: codeFormatValidation.message,
//       });
//     }

//     // EDGE CASE 3: Validate code length
//     if (couponCode.length < 3 || couponCode.length > 20) {
//       return res.status(400).json({
//         success: false,
//         message: "Coupon code must be between 3 and 20 characters",
//       });
//     }

//     // Convert to numbers
//     const discount = Number(discountPrice);
//     const minimum = Number(minimumPrice);
//     const limitNum = Number(limit);
//     const maxDiscount = Number(maxDiscountAmount);

//     console.log("Parsed values:", { discount, minimum, limitNum, maxDiscount });  // ✅ NEW: Log parsed nums

//     // EDGE CASE 6: Validate minimum purchase
//     if (isNaN(minimum)) {
//       return res.status(400).json({
//         success: false,
//         message: "Minimum purchase must be a valid number",
//       });
//     }

//     if (minimum < 0) {
//       return res.status(400).json({
//         success: false,
//         message: "Minimum purchase cannot be negative",
//       });
//     }

//     // EDGE CASE 5: Validate discount
//     const discountValidation = validateDiscount(discount, discountType, minimum);
//     if (!discountValidation.valid) {
//       return res.status(400).json({
//         success: false,
//         message: discountValidation.message,
//       });
//     }

//     // EDGE CASE 7: Validate usage limit
//     if (isNaN(limitNum)) {
//       return res.status(400).json({
//         success: false,
//         message: "Usage limit must be a valid number",
//       });
//     }

//     if (limitNum <= 0) {
//       return res.status(400).json({
//         success: false,
//         message: "Usage limit must be greater than 0",
//       });
//     }

//     if (!Number.isInteger(limitNum)) {
//       return res.status(400).json({
//         success: false,
//         message: "Usage limit must be a whole number (no decimals)",
//       });
//     }

//     // EDGE CASE 9: Check if coupon exists (deleted)
//     const coupon = await Coupon.findById(id);
//     if (!coupon) {
//       return res.status(404).json({
//         success: false,
//         message: "Coupon not found or has been deleted",
//       });
//     }

//     console.log("Existing coupon expireDate:", coupon.expireDate);  // ✅ NEW: Log for date debug

//     // EDGE CASE 9/10: Check if coupon is expired (⚠️ NOTE: With date Oct 29, 2025, old coupons block updates)
//     const today = normalizeDateForComparison(new Date());
//     const currentExpireDate = normalizeDateForComparison(coupon.expireDate);

//     console.log("Today for comparison:", today);  // ✅ NEW: Log today
//     console.log("Current expire normalized:", currentExpireDate);  // ✅ NEW: Log normalized expire
//     console.log("Is expired?", currentExpireDate < today);  // ✅ NEW: Log comparison

//     if (currentExpireDate < today) {
//       return res.status(400).json({
//         success: false,
//         message: "Cannot modify an expired coupon",
//       });
//     }

//     // EDGE CASE 8: Validate and normalize dates
//     let activeDateObj = new Date(activeDate);
//     let expireDateObj = new Date(expireDate);

//     if (isNaN(activeDateObj.getTime()) || isNaN(expireDateObj.getTime())) {
//       return res.status(400).json({
//         success: false,
//         message: "Invalid date format. Please use YYYY-MM-DD",
//       });
//     }

//     activeDateObj = normalizeDateForComparison(activeDateObj);
//     expireDateObj = normalizeDateForComparison(expireDateObj);

//     if (activeDateObj < today) {
//       return res.status(400).json({
//         success: false,
//         message: "Start date cannot be in the past",
//       });
//     }

//     if (activeDateObj.getTime() === expireDateObj.getTime()) {
//       return res.status(400).json({
//         success: false,
//         message: "Start date and expiry date cannot be the same",
//       });
//     }

//     if (activeDateObj > expireDateObj) {
//       return res.status(400).json({
//         success: false,
//         message: "Start date must be before expiry date",
//       });
//     }

//     // EDGE CASE 10: Check for duplicate code (excluding current)
//     const existingCode = await Coupon.findOne({
//       _id: { $ne: id },
//       couponCode: couponCode.trim().toUpperCase(),
//     });

//     if (existingCode) {
//       return res.status(400).json({
//         success: false,
//         message: "This coupon code is already in use",
//       });
//     }

//     // EDGE CASE 10: Check for duplicate name (excluding current)
//     const existingName = await Coupon.findOne({
//       _id: { $ne: id },
//       couponName: { $regex: `^${couponName}$`, $options: "i" },
//     });

//     if (existingName) {
//       return res.status(400).json({
//         success: false,
//         message: "This coupon name is already in use",
//       });
//     }

//     const updatedCoupon = await Coupon.findByIdAndUpdate(
//       id,
//       {
//         couponName: couponName,
//         couponCode: couponCode.trim().toUpperCase(),
//         description: description, // ✅ NEW: Update description
//         discountType,
//         usageType,
//         activeDate: activeDateObj,
//         expireDate: expireDateObj,
//         limit: limitNum,
//         discountPrice: discount,
//         minimumPrice: minimum,
//         maxDiscountAmount: maxDiscount,
//         isListed: isListed,
//       },
//       { new: true, runValidators: true }
//     )
//       .populate("appliedUsers.userId", "email name")
//       .populate("appliedUsers.orderId", "_id");

//     const lifecycleStatus = calculateCouponStatus(
//       updatedCoupon.activeDate,
//       updatedCoupon.expireDate,
//       updatedCoupon.isListed
//     );

//     const updatedWithStatus = {
//       ...updatedCoupon.toObject(),
//       used: updatedCoupon.appliedUsers ? updatedCoupon.appliedUsers.length : 0,
//       actionStatus: updatedCoupon.isListed ? "active" : "inactive",
//       status: lifecycleStatus,
//       isListed: updatedCoupon.isListed !== false,
//     };

//     console.log("✅ Coupon updated:", updatedCoupon._id);

//     res.json({
//       success: true,
//       message: "Coupon updated successfully",
//       coupon: updatedWithStatus,
//     });
//   } catch (error) {
//     console.error("❌ Error updating coupon:", error);
//     console.error("Full error stack:", error.stack);  // ✅ NEW: Log stack for better debug

//     if (error.code === 11000) {
//       const field = Object.keys(error.keyPattern)[0];
//       const fieldName =
//         field === "couponCode"
//           ? "Coupon code"
//           : field === "couponName"
//           ? "Coupon name"
//           : field;
//       return res.status(400).json({
//         success: false,
//         message: `${fieldName} already exists. Please use a different value.`,
//       });
//     }

//     res.status(500).json({
//       success: false,
//       message: "Error updating coupon",
//       error: error.message,
//     });
//   }
// };

// // Delete a coupon - NO CHANGES NEEDED
// const deleteCoupon = async (req, res) => {
//   try {
//     const { id } = req.params;
//     console.log("🗑️ Deleting coupon:", id);

//     const deletedCoupon = await Coupon.findByIdAndDelete(id);

//     if (!deletedCoupon) {
//       return res.status(404).json({
//         success: false,
//         message: "Coupon not found",
//       });
//     }

//     console.log("✅ Coupon deleted:", id);

//     res.json({
//       success: true,
//       message: "Coupon deleted successfully",
//     });
//   } catch (error) {
//     console.error("❌ Error deleting coupon:", error);
//     res.status(500).json({
//       success: false,
//       message: "Error deleting coupon",
//       error: error.message,
//     });
//   }
// };

// // Toggle coupon listing status - NO CHANGES NEEDED
// const toggleCouponListing = async (req, res) => {
//   try {
//     const { id } = req.params;
//     console.log("🔄 Toggling coupon listing for ID:", id);

//     const coupon = await Coupon.findById(id)
//       .populate("appliedUsers.userId", "email name")
//       .populate("appliedUsers.orderId", "_id");

//     if (!coupon) {
//       console.log("❌ Coupon not found:", id);
//       return res.status(404).json({
//         success: false,
//         message: "Coupon not found",
//       });
//     }

//     coupon.isListed = !coupon.isListed;
//     await coupon.save();

//     const lifecycleStatus = calculateCouponStatus(
//       coupon.activeDate,
//       coupon.expireDate,
//       coupon.isListed
//     );

//     const toggledWithStatus = {
//       _id: coupon._id,
//       couponCode: coupon.couponCode,
//       couponName: coupon.couponName,
//       discountPrice: coupon.discountPrice,
//       discountType: coupon.discountType,
//       minimumPrice: coupon.minimumPrice,
//       limit: coupon.limit,
//       expireDate: coupon.expireDate,
//       activeDate: coupon.activeDate,
//       description: coupon.description || "",
//       isListed: coupon.isListed,
//       usageType: coupon.usageType || "once",
//       used: coupon.appliedUsers ? coupon.appliedUsers.length : 0,
//       actionStatus: coupon.isListed ? "active" : "inactive",
//       status: lifecycleStatus,
//     };

//     console.log("✅ Coupon", coupon.isListed ? "listed" : "unlisted", ":", id);

//     res.json({
//       success: true,
//       message: `Coupon ${coupon.isListed ? "listed" : "unlisted"} successfully`,
//       coupon: toggledWithStatus,
//     });
//   } catch (error) {
//     console.error("❌ Error toggling coupon listing:", error);
//     res.status(500).json({
//       success: false,
//       message: "Error toggling coupon listing",
//       error: error.message,
//     });
//   }
// };

// // Deprecated: Toggle coupon status - NO CHANGES NEEDED
// const toggleCouponStatus = async (req, res) => {
//   try {
//     const { id } = req.params;

//     const coupon = await Coupon.findById(id)
//       .populate("appliedUsers.userId", "email name")
//       .populate("appliedUsers.orderId", "_id");

//     if (!coupon) {
//       return res.status(404).json({
//         success: false,
//         message: "Coupon not found",
//       });
//     }

//     coupon.isListed = !coupon.isListed;
//     await coupon.save();

//     const lifecycleStatus = calculateCouponStatus(
//       coupon.activeDate,
//       coupon.expireDate,
//       coupon.isListed
//     );

//     const toggledWithStatus = {
//       ...coupon.toObject(),
//       used: coupon.appliedUsers ? coupon.appliedUsers.length : 0,
//       actionStatus: coupon.isListed ? "active" : "inactive",
//       status: lifecycleStatus,
//       isListed: coupon.isListed,
//     };

//     res.json({
//       success: true,
//       message: `Coupon ${coupon.isListed ? "listed" : "unlisted"} successfully`,
//       coupon: toggledWithStatus,
//     });
//   } catch (error) {
//     console.error("Error toggling coupon status:", error);
//     res.status(500).json({
//       success: false,
//       message: "Error toggling coupon status",
//       error: error.message,
//     });
//   }
// };

// module.exports = {
//   getCoupons,
//   getAllCoupons,
//   createCoupon,
//   updateCoupon,
//   deleteCoupon,
//   toggleCouponListing,
//   toggleCouponStatus,
// };





const Coupon = require("../../models/couponSchema");
const User = require('../../models/userSchema');

const normalizeDateForComparison = (date) => {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  return d;
};

const capitalizeWords = (str) => {
  return str
    .trim()
    .split(" ")
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
    .join(" ");
};

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

const validateDiscount = (discount, discountType, minimumPrice) => {
  if (discount === 0) {
    return { valid: false, message: "Discount cannot be zero" };
  }

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

// ✅ UPDATED: Helper to format with virtual 'used' and consistent field names
const formatCouponWithUsage = (coupon, lifecycleStatus) => {
  // Use virtual 'used' (computed from appliedUsers.length)
  const usedCount = coupon.used || 0;
  const limitNum = Number(coupon.limit) || 0;
  const usagePercentage = limitNum > 0 ? Math.round((usedCount / limitNum) * 100) : 0;
  const remainingUses = Math.max(0, limitNum - usedCount);

  return {
    ...coupon.toObject(),  // Convert to plain object to include virtuals
    used: usedCount,
    usagePercentage: usagePercentage,
    remainingUses: remainingUses,
    actionStatus: coupon.isListed ? "active" : "inactive",
    status: lifecycleStatus,
    isListed: coupon.isListed !== false,
  };
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

const getAllCoupons = async (req, res) => {
  try {
    console.log("🔄 Fetching all coupons with fresh data...");

    // ✅ UPDATED: Use .lean(false) implicitly by not using lean() to enable virtuals
    const coupons = await Coupon.find()
      .populate("appliedUsers.userId", "email name")  // Populate for virtual 'used'
      .populate("appliedUsers.orderId", "_id");

    console.log(`📊 Found ${coupons.length} coupons`);

    const couponsWithStatus = coupons.map((coupon) => {
      const lifecycleStatus = calculateCouponStatus(
        coupon.activeDate,
        coupon.expireDate,
        coupon.isListed
      );

      // ✅ UPDATED: Use virtual 'used' instead of manual count
      const usedCount = coupon.used || 0;
      const limitNum = Number(coupon.limit) || 0;
      const usagePercentage = limitNum > 0 ? Math.round((usedCount / limitNum) * 100) : 0;
      const remainingUses = Math.max(0, limitNum - usedCount);

      console.log(`Coupon ${coupon.couponCode}: used=${usedCount}, limit=${limitNum}`);

      return {
        _id: coupon._id,
        couponCode: coupon.couponCode,
        couponName: coupon.couponName,
        description: coupon.description || "",
        discountType: coupon.discountType,
        discountPrice: coupon.discountPrice,
        minimumPrice: coupon.minimumPrice,
        maxDiscountAmount: coupon.maxDiscountAmount,
        activeDate: coupon.activeDate,
        expireDate: coupon.expireDate,
        limit: limitNum,
        usageType: coupon.usageType,
        isListed: coupon.isListed,
        // ✅ THESE FIELDS NOW LEVERAGE VIRTUAL 'used'
        used: usedCount,
        usagePercentage: usagePercentage,
        remainingUses: remainingUses,
        actionStatus: coupon.isListed ? "active" : "inactive",
        status: lifecycleStatus,
      };
    });

    console.log("✅ Response being sent to frontend");

    res.json({
      success: true,
      coupons: couponsWithStatus,
      totalCoupons: couponsWithStatus.length,
    });
  } catch (error) {
    console.error("❌ Error fetching coupons:", error);
    res.status(500).json({
      success: false,
      message: "Error fetching coupons",
      error: error.message,
    });
  }
};

const getCouponUsageDetails = async (req, res) => {
  try {
    const { id } = req.params;

    const coupon = await Coupon.findById(id)
      .populate("appliedUsers.userId", "email name")
      .populate("appliedUsers.orderId", "_id");

    if (!coupon) {
      return res.status(404).json({
        success: false,
        message: "Coupon not found",
      });
    }

    const appliedUsers = coupon.appliedUsers || [];
    // ✅ UPDATED: Use virtual 'used' for consistency
    const usedCount = coupon.used || 0;
    const usageDetails = {
      couponId: coupon._id,
      couponCode: coupon.couponCode,
      couponName: coupon.couponName,
      totalLimit: coupon.limit,
      usedCount: usedCount,
      remainingUses: Math.max(0, coupon.limit - usedCount),
      usagePercentage: Math.round((usedCount / coupon.limit) * 100),
      users: appliedUsers.map((user) => ({
        userId: user.userId._id,
        userEmail: user.userId.email,
        userName: user.userId.name,
        orderId: user.orderId._id,
        usedAt: user.appliedDate || new Date(),  // ✅ UPDATED: Use 'appliedDate' from schema
      })),
    };

    res.json({
      success: true,
      usageDetails: usageDetails,
    });
  } catch (error) {
    console.error("❌ Error fetching coupon usage details:", error);
    res.status(500).json({
      success: false,
      message: "Error fetching coupon usage details",
      error: error.message,
    });
  }
};

const createCoupon = async (req, res) => {
  try {
    console.log("=== CREATE COUPON REQUEST ===");
    console.log("Body:", req.body);

    let {
      couponName,
      couponCode,
      description = "",
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

    couponName = couponName.trim();
    couponCode = couponCode.trim().toUpperCase();
    description = description.trim();

    couponName = capitalizeWords(couponName);

    if (!couponName || couponName.length < 2 || couponName.length > 50) {
      return res.status(400).json({
        success: false,
        message: "Coupon name must be between 2 and 50 characters",
      });
    }

    const codeFormatValidation = validateCouponCodeFormat(couponCode);
    if (!codeFormatValidation.valid) {
      return res.status(400).json({
        success: false,
        message: codeFormatValidation.message,
      });
    }

    if (couponCode.length < 3 || couponCode.length > 20) {
      return res.status(400).json({
        success: false,
        message: "Coupon code must be between 3 and 20 characters",
      });
    }

    const discount = Number(discountPrice);
    const minimum = Number(minimumPrice);
    const limitNum = Number(limit);
    const maxDiscount = Number(maxDiscountAmount);

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

    const discountValidation = validateDiscount(discount, discountType, minimum);
    if (!discountValidation.valid) {
      return res.status(400).json({
        success: false,
        message: discountValidation.message,
      });
    }

    if (isNaN(limitNum) || limitNum <= 0 || !Number.isInteger(limitNum)) {
      return res.status(400).json({
        success: false,
        message: "Usage limit must be a positive whole number",
      });
    }

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
      description,
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

    const savedWithStatus = formatCouponWithUsage(populatedCoupon, lifecycleStatus);

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

const updateCoupon = async (req, res) => {
  try {
    const { id } = req.params;
    let {
      couponName,
      couponCode,
      description = "",
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

    console.log("=== UPDATE COUPON REQUEST ===");
    console.log("Coupon ID:", id);
    console.log("Request body:", req.body);

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

    couponName = couponName.trim();
    couponCode = couponCode.trim().toUpperCase();
    description = description.trim();

    couponName = capitalizeWords(couponName);

    if (!couponName || couponName.length < 2 || couponName.length > 50) {
      return res.status(400).json({
        success: false,
        message: "Coupon name must be between 2 and 50 characters",
      });
    }

    const codeFormatValidation = validateCouponCodeFormat(couponCode);
    if (!codeFormatValidation.valid) {
      return res.status(400).json({
        success: false,
        message: codeFormatValidation.message,
      });
    }

    if (couponCode.length < 3 || couponCode.length > 20) {
      return res.status(400).json({
        success: false,
        message: "Coupon code must be between 3 and 20 characters",
      });
    }

    const discount = Number(discountPrice);
    const minimum = Number(minimumPrice);
    const limitNum = Number(limit);
    const maxDiscount = Number(maxDiscountAmount);

    console.log("Parsed values:", { discount, minimum, limitNum, maxDiscount });

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

    const discountValidation = validateDiscount(discount, discountType, minimum);
    if (!discountValidation.valid) {
      return res.status(400).json({
        success: false,
        message: discountValidation.message,
      });
    }

    if (isNaN(limitNum)) {
      return res.status(400).json({
        success: false,
        message: "Usage limit must be a valid number",
      });
    }

    if (limitNum <= 0) {
      return res.status(400).json({
        success: false,
        message: "Usage limit must be greater than 0",
      });
    }

    if (!Number.isInteger(limitNum)) {
      return res.status(400).json({
        success: false,
        message: "Usage limit must be a whole number (no decimals)",
      });
    }

    const coupon = await Coupon.findById(id);
    if (!coupon) {
      return res.status(404).json({
        success: false,
        message: "Coupon not found or has been deleted",
      });
    }

    console.log("Existing coupon expireDate:", coupon.expireDate);

    const today = normalizeDateForComparison(new Date());
    const currentExpireDate = normalizeDateForComparison(coupon.expireDate);

    console.log("Today for comparison:", today);
    console.log("Current expire normalized:", currentExpireDate);
    console.log("Is expired?", currentExpireDate < today);

    if (currentExpireDate < today) {
      return res.status(400).json({
        success: false,
        message: "Cannot modify an expired coupon",
      });
    }

    let activeDateObj = new Date(activeDate);
    let expireDateObj = new Date(expireDate);

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

    const existingCode = await Coupon.findOne({
      _id: { $ne: id },
      couponCode: couponCode.trim().toUpperCase(),
    });

    if (existingCode) {
      return res.status(400).json({
        success: false,
        message: "This coupon code is already in use",
      });
    }

    const existingName = await Coupon.findOne({
      _id: { $ne: id },
      couponName: { $regex: `^${couponName}$`, $options: "i" },
    });

    if (existingName) {
      return res.status(400).json({
        success: false,
        message: "This coupon name is already in use",
      });
    }

    const updatedCoupon = await Coupon.findByIdAndUpdate(
      id,
      {
        couponName: couponName,
        couponCode: couponCode.trim().toUpperCase(),
        description: description,
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
      { new: true, runValidators: true }
    )
      .populate("appliedUsers.userId", "email name")
      .populate("appliedUsers.orderId", "_id");

    const lifecycleStatus = calculateCouponStatus(
      updatedCoupon.activeDate,
      updatedCoupon.expireDate,
      updatedCoupon.isListed
    );

    const updatedWithStatus = formatCouponWithUsage(updatedCoupon, lifecycleStatus);

    console.log("✅ Coupon updated:", updatedCoupon._id);

    res.json({
      success: true,
      message: "Coupon updated successfully",
      coupon: updatedWithStatus,
    });
  } catch (error) {
    console.error("❌ Error updating coupon:", error);
    console.error("Full error stack:", error.stack);

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

    res.status(500).json({
      success: false,
      message: "Error updating coupon",
      error: error.message,
    });
  }
};

const deleteCoupon = async (req, res) => {
  try {
    const { id } = req.params;
    console.log("🗑️ Deleting coupon:", id);

    const deletedCoupon = await Coupon.findByIdAndDelete(id);

    if (!deletedCoupon) {
      return res.status(404).json({
        success: false,
        message: "Coupon not found",
      });
    }

    console.log("✅ Coupon deleted:", id);

    res.json({
      success: true,
      message: "Coupon deleted successfully",
    });
  } catch (error) {
    console.error("❌ Error deleting coupon:", error);
    res.status(500).json({
      success: false,
      message: "Error deleting coupon",
      error: error.message,
    });
  }
};

const toggleCouponListing = async (req, res) => {
  try {
    const { id } = req.params;
    console.log("🔄 Toggling coupon listing for ID:", id);

    const coupon = await Coupon.findById(id)
      .populate("appliedUsers.userId", "email name")
      .populate("appliedUsers.orderId", "_id");

    if (!coupon) {
      console.log("❌ Coupon not found:", id);
      return res.status(404).json({
        success: false,
        message: "Coupon not found",
      });
    }

    coupon.isListed = !coupon.isListed;
    await coupon.save();

    const lifecycleStatus = calculateCouponStatus(
      coupon.activeDate,
      coupon.expireDate,
      coupon.isListed
    );

    const toggledWithStatus = formatCouponWithUsage(coupon, lifecycleStatus);

    console.log("✅ Coupon", coupon.isListed ? "listed" : "unlisted", ":", id);

    res.json({
      success: true,
      message: `Coupon ${coupon.isListed ? "listed" : "unlisted"} successfully`,
      coupon: toggledWithStatus,
    });
  } catch (error) {
    console.error("❌ Error toggling coupon listing:", error);
    res.status(500).json({
      success: false,
      message: "Error toggling coupon listing",
      error: error.message,
    });
  }
};

// Deprecated: Toggle coupon status - NO CHANGES NEEDED
const toggleCouponStatus = async (req, res) => {
  try {
    const { id } = req.params;

    const coupon = await Coupon.findById(id)
      .populate("appliedUsers.userId", "email name")
      .populate("appliedUsers.orderId", "_id");

    if (!coupon) {
      return res.status(404).json({
        success: false,
        message: "Coupon not found",
      });
    }

    coupon.isListed = !coupon.isListed;
    await coupon.save();

    const lifecycleStatus = calculateCouponStatus(
      coupon.activeDate,
      coupon.expireDate,
      coupon.isListed
    );

    const toggledWithStatus = formatCouponWithUsage(coupon, lifecycleStatus);

    res.json({
      success: true,
      message: `Coupon ${coupon.isListed ? "listed" : "unlisted"} successfully`,
      coupon: toggledWithStatus,
    });
  } catch (error) {
    console.error("Error toggling coupon status:", error);
    res.status(500).json({
      success: false,
      message: "Error toggling coupon status",
      error: error.message,
    });
  }
};

// ✅ NEW: Get coupon statistics
const getCouponStats = async (req, res) => {
  try {
    const coupons = await Coupon.find().select("limit appliedUsers");

    let totalCoupons = coupons.length;
    let totalUsages = 0;
    let totalCapacity = 0;

    coupons.forEach((coupon) => {
      // ✅ UPDATED: Use virtual 'used'
      const usedCount = coupon.used || 0;
      totalUsages += usedCount;
      totalCapacity += coupon.limit || 0;
    });

    const utilizationPercentage = totalCapacity > 0
      ? Math.round((totalUsages / totalCapacity) * 100)
      : 0;

    res.json({
      success: true,
      stats: {
        totalCoupons,
        totalUsages,
        totalCapacity,
        utilizationPercentage,
        averageUsagePerCoupon: totalCoupons > 0 ? Math.round(totalUsages / totalCoupons) : 0,
      },
    });
  } catch (error) {
    console.error("❌ Error fetching coupon stats:", error);
    res.status(500).json({
      success: false,
      message: "Error fetching coupon statistics",
    });
  }
};

module.exports = {
  getCoupons,
  getAllCoupons,
  getCouponUsageDetails,
  createCoupon,
  updateCoupon,
  deleteCoupon,
  toggleCouponListing,
  toggleCouponStatus,
  getCouponStats 
};