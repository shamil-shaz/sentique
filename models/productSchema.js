
// const mongoose = require("mongoose");
// const { Schema } = mongoose;

// const variantSchema = new Schema({
//   size: {
//     type: Number,
//     required: [true, 'Variant size is required'],
//     min: [1, 'Size must be greater than 0']
//   },
//   regularPrice: {
//     type: Number,
//     required: [true, 'Regular price is required'],
//     min: [0.01, 'Regular price must be greater than 0']
//   },
//   salePrice: {
//     type: Number,
//     required: [true, 'Sale price is required'],
//     min: [0, 'Sale price cannot be negative'],
//     validate: {
//       validator: function(value) {
//            return value === 0 || value < this.regularPrice;
//       },
//       message: 'Sale price must be less than regular price'
//     }
//   },
//   stock: {
//     type: Number,
//     default: 0,
//     min: [0, 'Stock cannot be negative']
//   }
// }, { _id: false });


// const productSchema = new Schema({
//   productName: {
//     type: String,
//     required: [true, 'Product name is required'],
//     trim: true,
//     minlength: [2, 'Product name must be at least 2 characters'],
//     maxlength: [100, 'Product name cannot exceed 100 characters']
  
//   },
//   description: {
//     type: String,
//     required: [true, 'Description is required'],
//     trim: true,
//     minlength: [5, 'Description must be at least 5 characters'],
//     maxlength: [100, 'Description cannot exceed 100 characters']
//   },
//    Longdescription: {
//     type: String,
//     required: [true, 'LongDescription is required'],
//     trim: true,
//     minlength: [10, 'Description must be at least 10 characters'],
//     maxlength: [1000, 'Description cannot exceed 1000 characters']
//   },
//   brand: {
//     type: Schema.Types.ObjectId,
//     ref: "Brand",
//     required: [true, 'Brand is required']
//   },
//   category: {
//     type: Schema.Types.ObjectId,
//     ref: "Category",
//     required: [true, 'Category is required']
//   },
//   productOffer: {
//     type: Number,
//     default: 0,
//     min: [0, 'Product offer cannot be negative'],
//     max: [100, 'Product offer cannot exceed 100%']
//   },
//   images: {
//     type: [String],
//     required: [true, 'At least one image is required'],
//     validate: {
//       validator: arr => arr && arr.length > 0 && arr.length <= 4,
//       message: 'You must upload between 1 to 4 images'
//     }
//   },
//   variants: {
//     type: [variantSchema],
//     required: [true, 'Variants are required'],
//     validate: [
//       {
//         validator: arr => arr && arr.length > 0,
//         message: 'At least one variant is required'
//       },
//       {
//         validator: arr => {
//           if (!arr || arr.length === 0) return true;
//           const sizes = arr.map(v => v.size);
//           return new Set(sizes).size === sizes.length;
//         },
//         message: 'Duplicate variant sizes are not allowed'
//       }
//     ]
//   },
//   isBlocked: { type: Boolean, default: false },
//   status: {
//     type: String,
//     enum: ["Available", "Out of stock", "Discontinue"],
//     required: [true, 'Status is required'],
//     default: "Available"
//   },
//   slug: {
//     type: String,
   
//   },
//   tags: { type: [String], default: [] }
// }, { 
//   timestamps: true,
//   versionKey: '__v'
// });


// productSchema.index({ brand: 1 });
// productSchema.index({ category: 1 });
// productSchema.index({ status: 1 });
// productSchema.index({ isBlocked: 1 });
// productSchema.index({ productName: 1 }, { unique: true, collation: { locale: 'en', strength: 2 } });
// productSchema.index({ slug: 1 }, { unique: true, sparse: true });
// productSchema.index({ createdAt: -1 });
// productSchema.index({ updatedAt: -1 });


// productSchema.virtual('totalStock').get(function() {
//   return this.variants?.reduce((sum, v) => sum + v.stock, 0) || 0;
// });

// productSchema.virtual('lowestPrice').get(function() {
//   return this.variants?.length ? Math.min(...this.variants.map(v => v.salePrice)) : 0;
// });

// productSchema.virtual('highestPrice').get(function() {
//   return this.variants?.length ? Math.max(...this.variants.map(v => v.regularPrice)) : 0;
// });


// productSchema.pre('save', function(next) {
//   try {
    
//     if (!this.slug && this.productName) {
//       this.slug = this.productName.toLowerCase()
//         .trim()
//         .replace(/[^\w\s-]/g, '')
//         .replace(/[\s_-]+/g, '-')
//         .replace(/^-+|-+$/g, '');
//     }
    
//     const totalStock = this.variants?.reduce((sum, v) => sum + v.stock, 0) || 0;
//     if (totalStock === 0 && this.status !== 'Discontinue') this.status = 'Out of stock';
//     else if (totalStock > 0 && this.status === 'Out of stock') this.status = 'Available';


//     if (this.variants?.length > 1) this.variants.sort((a, b) => a.size - b.size);

//     next();
//   } catch (err) { next(err); }
// });


// productSchema.pre('validate', function(next) {
//   this.productName = this.productName?.trim();
//   this.description = this.description?.trim();
//    this.Longdescription = this.Longdescription?.trim();
//   this.images = this.images?.filter(img => img?.trim() !== '');
//   next();
// });


// productSchema.methods.getAvailableVariants = function() {
//   return this.variants.filter(v => v.stock > 0);
// };
// productSchema.methods.hasStock = function() {
//   return this.variants.some(v => v.stock > 0);
// };
// productSchema.methods.getVariantBySize = function(size) {
//   return this.variants.find(v => v.size === size);
// };


// productSchema.statics.findAvailable = function() {
//   return this.find({ status: 'Available', isBlocked: false }).populate('brand category');
// };
// productSchema.statics.findByBrand = function(brandId) {
//   return this.find({ brand: brandId, isBlocked: false });
// };
// productSchema.statics.findByCategory = function(categoryId) {
//   return this.find({ category: categoryId, isBlocked: false });
// };


// productSchema.set('toJSON', { virtuals: true });
// productSchema.set('toObject', { virtuals: true });


// module.exports = mongoose.model("Product", productSchema);



const mongoose = require("mongoose");
const { Schema } = mongoose;

const variantSchema = new Schema({
  size: {
    type: Number,
    required: [true, 'Variant size is required'],
    min: [1, 'Size must be greater than 0']
  },
  regularPrice: {
    type: Number,
    required: [true, 'Regular price is required'],
    min: [0.01, 'Regular price must be greater than 0']
  },
  salePrice: {
    type: Number,
    required: [true, 'Sale price is required'],
    min: [0, 'Sale price cannot be negative'],
    validate: {
      validator: function(value) {
        return value === 0 || value <= this.regularPrice;
      },
      message: 'Sale price must be less than or equal to regular price'
    }
  },
  stock: {
    type: Number,
    default: 0,
    min: [0, 'Stock cannot be negative']
  }
}, { _id: false });

const productSchema = new Schema({
  productName: {
    type: String,
    required: [true, 'Product name is required'],
    trim: true,
    minlength: [3, 'Product name must be at least 3 characters'],
    maxlength: [100, 'Product name cannot exceed 100 characters'],
    unique: true,
    collation: { locale: 'en', strength: 2 } 
  },
  description: {
    type: String,
    required: [true, 'Short description is required'],
    trim: true,
    minlength: [3, 'Short description must be at least 3 characters'],
    maxlength: [100, 'Short description cannot exceed 100 characters']
  },
  longDescription: {
    type: String,
    required: [true, 'Long description is required'],
    trim: true,
    minlength: [10, 'Long description must be at least 10 characters'],
    maxlength: [1000, 'Long description cannot exceed 1000 characters']
  },
  brand: {
    type: Schema.Types.ObjectId,
    ref: "Brand",
    required: [true, 'Brand is required']
  },
  category: {
    type: Schema.Types.ObjectId,
    ref: "Category",
    required: [true, 'Category is required']
  },
  productOffer: {
    type: Number,
    default: 0,
    min: [0, 'Product offer cannot be negative'],
    max: [100, 'Product offer cannot exceed 100%']
  },
  images: {
    type: [String],
    required: [true, 'At least 2 images are required'],
    validate: {
      validator: arr => arr && arr.length >= 2 && arr.length <= 4,
      message: 'You must upload between 2 and 4 images'
    }
  },
  variants: {
    type: [variantSchema],
    required: [true, 'At least one variant is required'],
    validate: [
      {
        validator: arr => arr && arr.length > 0,
        message: 'At least one variant is required'
      },
      {
        validator: arr => {
          if (!arr || arr.length === 0) return true;
          const sizes = arr.map(v => v.size);
          return new Set(sizes).size === sizes.length;
        },
        message: 'Duplicate variant sizes are not allowed'
      }
    ]
  },
  isBlocked: { type: Boolean, default: false },
  status: {
    type: String,
    enum: ["Available", "Out of stock", "Discontinue"],
    required: [true, 'Status is required'],
    default: "Available"
  },
  slug: {
    type: String,
    required: true,
    unique: true,
    sparse: true
  },
  tags: { type: [String], default: [] }
}, { 
  timestamps: true,
  versionKey: '__v'
});


productSchema.index({ brand: 1 });
productSchema.index({ category: 1 });
productSchema.index({ status: 1 });
productSchema.index({ isBlocked: 1 });
productSchema.index({ createdAt: -1 });
productSchema.index({ updatedAt: -1 });



productSchema.virtual('totalStock').get(function() {
  return this.variants?.reduce((sum, v) => sum + v.stock, 0) || 0;
});

productSchema.virtual('lowestPrice').get(function() {
  return this.variants?.length ? Math.min(...this.variants.map(v => v.salePrice)) : 0;
});

productSchema.virtual('highestPrice').get(function() {
  return this.variants?.length ? Math.max(...this.variants.map(v => v.regularPrice)) : 0;
});

// Pre-save hook
productSchema.pre('save', function(next) {
  try {
    if (!this.slug && this.productName) {
      this.slug = this.productName.toLowerCase()
        .trim()
        .replace(/[^\w\s-]/g, '')
        .replace(/[\s_-]+/g, '-')
        .replace(/^-+|-+$/g, '');
    }
    
    const totalStock = this.variants?.reduce((sum, v) => sum + v.stock, 0) || 0;
    if (totalStock === 0 && this.status !== 'Discontinue') this.status = 'Out of stock';
    else if (totalStock > 0 && this.status === 'Out of stock') this.status = 'Available';

    if (this.variants?.length > 1) this.variants.sort((a, b) => a.size - b.size);

    next();
  } catch (err) { next(err); }
});


productSchema.pre('validate', function(next) {
  this.productName = this.productName?.trim();
  this.description = this.description?.trim();
  this.longDescription = this.longDescription?.trim();
  this.images = this.images?.filter(img => img?.trim() !== '');
  next();
});


productSchema.methods.getAvailableVariants = function() {
  return this.variants.filter(v => v.stock > 0);
};

productSchema.methods.hasStock = function() {
  return this.variants.some(v => v.stock > 0);
};

productSchema.methods.getVariantBySize = function(size) {
  return this.variants.find(v => v.size === size);
};


productSchema.statics.findAvailable = function() {
  return this.find({ status: 'Available', isBlocked: false }).populate('brand category');
};

productSchema.statics.findByBrand = function(brandId) {
  return this.find({ brand: brandId, isBlocked: false });
};

productSchema.statics.findByCategory = function(categoryId) {
  return this.find({ category: categoryId, isBlocked: false });
};

productSchema.set('toJSON', { virtuals: true });
productSchema.set('toObject', { virtuals: true });

module.exports = mongoose.model("Product", productSchema);