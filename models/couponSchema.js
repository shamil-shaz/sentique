const mongoose = require("mongoose")
const { Schema } = mongoose

const couponSchema = new Schema(
  {
    couponName: {
      type: String,
      required: true,
      unique: true,
      trim: true,
      minlength: 2,
      maxlength: 50,
      set: (v) => {
        if (!v) return v
        return v
          .trim()
          .toLowerCase()
          .replace(/(^|\s)\w/g, (letter) => letter.toUpperCase())
      },
    },
    couponCode: {
      type: String,
      required: true,
      unique: true,
      trim: true,
      minlength: 3,
      maxlength: 20,
    },
    description: {
      type: String,
      trim: true,
      default: "",
      maxlength: 200,
    },
    discountType: {
      type: String,
      enum: ["flat", "percentage"],
      default: "flat",
    },
    usageType: {
      type: String,
      enum: ["once", "multiple"],
      default: "once",
    },
    activeDate: {
      type: Date,
      required: true,
    },
    expireDate: {
      type: Date,
      required: true,
    },
    limit: {
      type: Number,
      required: true,
      min: 1,
    },
    appliedUsers: [
      {
        userId: {
          type: mongoose.Schema.Types.ObjectId,
          ref: "User",
        },
        orderId: {
          type: mongoose.Schema.Types.ObjectId,
          ref: "Order",
        },
        appliedDate: {
          type: Date,
          default: Date.now,
        },
      },
    ],
    discountPrice: {
      type: Number,
      required: true,
      min: [0.01, "Discount must be greater than 0"],  // ✅ FIX: Prevent 0 discounts
    },
    minimumPrice: {
      type: Number,
      required: true,
      min: 0,
    },
    maxDiscountAmount: {
      type: Number,
      default: 0,
      min: 0,
    },
    isListed: {
      type: Boolean,
      default: true,
    },
    status: {
      type: String,
      enum: ["active", "inactive", "upcoming", "expired"],  // ✅ FIX: Add "expired" for consistency
      default: "active",
    },
  },
  { timestamps: true },
)

// Setter for automatic uppercase on couponCode
couponSchema.path("couponCode").set((v) => (v ? v.trim().toUpperCase() : v))

// Virtual for computed 'used' count
couponSchema.virtual("used").get(function () {
  return this.appliedUsers ? this.appliedUsers.length : 0
})

// Ensure virtuals are included
couponSchema.set("toJSON", { virtuals: true })
couponSchema.set("toObject", { virtuals: true })

// Pre-save middleware to validate dates
couponSchema.pre("save", function (next) {
  if (this.isModified("activeDate") || this.isModified("expireDate")) {
    if (this.activeDate >= this.expireDate) {
      const err = new Error("Expire date must be strictly after active date")
      return next(err)
    }
  }
  next()
})

// Indexes
couponSchema.index({ status: 1, activeDate: 1, expireDate: 1 })
couponSchema.index({ couponCode: 1 }, { unique: true, sparse: true })
couponSchema.index({ couponName: 1 }, { unique: true, sparse: true, collation: { locale: "en", strength: 2 } })
couponSchema.index({ "appliedUsers.appliedDate": -1 })
couponSchema.index({ isListed: 1, activeDate: 1 })

const Coupon = mongoose.model("Coupon", couponSchema)

module.exports = Coupon