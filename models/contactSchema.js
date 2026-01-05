const mongoose = require("mongoose");

const contactMessageSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true
    },

    sender: {
      type: String,
      enum: ["user", "admin"],
      required: true
    },

    message: {
      type: String,
      required: true,
      trim: true
    },

    issueType: {
      type: String,
      enum: ["order", "wallet", "general"],
      default: "general"
    },

    orderId: {
      type: String, 
      default: null
    },

    isRead: {
      type: Boolean,
      default: false
    }
  },
  {
    timestamps: true
  }
);

module.exports = mongoose.model("ContactMessage", contactMessageSchema);
