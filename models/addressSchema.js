const mongoose = require("mongoose");

const addressSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
  address: [
    {
      addressType: {
        type: String,
        enum: ["Home", "Work", "Other"],
        required: true,
      },
      name: { type: String, required: true, minlength: 3 },
      phone: { type: String, required: true, match: /^\d{10}$/ },
      houseName: { type: String, default: "Unknown" },
      buildingNumber: { type: String },
      landmark: { type: String, required: true, minlength: 3 },
      altPhone: { type: String, match: /^\d{10}$/ },
      nationality: { type: String, default: "Unknown" },
      city: { type: String, required: true },
      state: { type: String, required: true },
      pincode: { type: String, required: true },
      isDefault: { type: Boolean, default: false },
    },
  ],
});

module.exports = mongoose.model("Address", addressSchema);
