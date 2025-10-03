
const { cloudinary } = require("../config/cloudinary");
const { CloudinaryStorage } = require("multer-storage-cloudinary");
const multer = require("multer");


const categoryStorage = new CloudinaryStorage({
  cloudinary: cloudinary,
  params: {
    folder: "sentique/categories",
    allowed_formats: ["jpg", "jpeg", "png", "webp"],
  },
});
const uploadCategoryImage = multer({ storage: categoryStorage });



const productStorage = new CloudinaryStorage({
  cloudinary: cloudinary,
  params: {
    folder: "sentique/products",
    allowed_formats: ["jpg", "jpeg", "png", "webp"],
  },
});
const uploadProductImage = multer({ storage: productStorage });


module.exports = { uploadCategoryImage, uploadProductImage };
