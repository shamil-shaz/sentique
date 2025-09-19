// const mongoose = require("mongoose");
// const { Schema } = mongoose;

// const productSchema = new Schema({
//   productName: {
//     type: String,
//     required: true,
//   },
//   description: {
//     type: String,
//     required: true
//   },
//   brand: { 
//     type: Schema.Types.ObjectId,
//     ref: "Brand", 
//     required: true
//   },     
//   category: {
//     type: Schema.Types.ObjectId,
//     ref: "Category",
//     required: true
//   },
//   regularPrice: {
//     type: Number,
//     required: true
//   },
//   salePrice: {
//     type: Number,
//     required: true
//   },
//   productOffer: {
//     type: Number,
//     default: 0
//   },
//   quantity: {
//     type: Number,
//     default: 0 // fixed default value
//   },
//   variant: {
//     type: Number,
//     default: 0 // add this if you use variant
//   },
//   images: { // renamed from productImage
//     type: [String],
//     required: true
//   },
//   isBlocked: {
//     type: Boolean,
//     default: false
//   },
//   status: {
//     type: String,
//     enum: ["Available", "Out of stock", "Discontinue"], // fixed capitalization
//     required: true,
//     default: "Available"
//   }
// }, { timestamps: true });

// const Product = mongoose.model("Product", productSchema);

// module.exports = Product;


const mongoose = require("mongoose");
const { Schema } = mongoose;

const productSchema = new Schema({
  productName: {
    type: String,
    required: true,
    trim: true,
    minlength: [2, 'Product name must be at least 2 characters'],
    maxlength: [100, 'Product name cannot exceed 100 characters']
  },
  description: {
    type: String,
    required: true,
    trim: true,
    minlength: [10, 'Description must be at least 10 characters']
  },
  brand: {
    type: Schema.Types.ObjectId,
    ref: "Brand",
    required: true
  },
  category: {
    type: Schema.Types.ObjectId,
    ref: "Category",
    required: true
  },
  regularPrice: {
    type: Number,
    required: true,
    min: [0.01, 'Regular price must be greater than 0']
  },
  salePrice: {
    type: Number,
    required: true,
    min: [0, 'Sale price cannot be negative'],
    validate: {
      validator: function(value) {
        return value <= this.regularPrice;
      },
      message: 'Sale price cannot be greater than regular price'
    }
  },
  productOffer: {
    type: Number,
    default: 0,
    min: [0, 'Product offer cannot be negative'],
    max: [100, 'Product offer cannot exceed 100%']
  },
  // FIXED: Your controllers use different field names
  quantity: {
    type: Number,
    default: 0,
    min: [0, 'Quantity cannot be negative']
  },
  // Alternative field name used in your controllers
  stock: {
    type: Number,
    default: 0,
    min: [0, 'Stock cannot be negative']
  },
  variant: {
    type: [Number],
    required: true, 
    
  },
  images: {
    type: [String],
    required: true,
    validate: {
      validator: function(arr) {
        return arr.length > 0;
      },
      message: 'At least one image is required'
    }
  },
  isBlocked: {
    type: Boolean,
    default: false
  },
  status: {
    type: String,
    enum: ["Available", "Out of stock", "Discontinue"],
    required: true,
    default: "Available"
  }
}, { 
  timestamps: true // This adds createdAt and updatedAt automatically
});

// Add indexes for better performance
productSchema.index({ brand: 1 });
productSchema.index({ category: 1 });
productSchema.index({ status: 1 });
productSchema.index({ isBlocked: 1 });
productSchema.index({ productName: 'text', description: 'text' }); // For text search

// Pre-save middleware to sync quantity and stock
productSchema.pre('save', function(next) {
  // If stock is provided but quantity is not, sync them
  if (this.stock !== undefined && this.quantity === 0) {
    this.quantity = this.stock;
  }
  // If quantity is provided but stock is not, sync them
  if (this.quantity !== undefined && this.stock === 0) {
    this.stock = this.quantity;
  }
  next();
});

const Product = mongoose.model("Product", productSchema);
module.exports = Product;