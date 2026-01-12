const mongoose = require("mongoose");
const { Schema } = mongoose;

const brandSchema = new Schema(
  {
    brandName: {
      type: String,
      required: true,
      trim: true,
      minlength: [2, "Brand name must be at least 2 characters long"],
      maxlength: [50, "Brand name cannot exceed 50 characters"],
    },
    brandImage: {
      type: [String],
      required: true,
      validate: {
        validator: function (arr) {
          return arr.length > 0;
        },
        message: "At least one brand image is required",
      },
    },
    isBlocked: {
      type: Boolean,
      default: false,
    },
  },
  {
    timestamps: true,
  }
);

brandSchema.index({ brandName: 1 }, { unique: true });
brandSchema.index({ isBlocked: 1 });

const Brand = mongoose.model("Brand", brandSchema);
module.exports = Brand;
