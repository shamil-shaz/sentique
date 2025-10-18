
const mongoose = require("mongoose");

const cartItemSchema = new mongoose.Schema({
  productId: { type: mongoose.Schema.Types.ObjectId, ref: "Product", required: true },
  variantSize: { type: Number, required: true }, 
  quantity: { type: Number, required: true, min: 1 },
  price: { type: Number, required: true }, 
});

const cartSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
  items: [cartItemSchema],
});

module.exports = mongoose.model("Cart", cartSchema);