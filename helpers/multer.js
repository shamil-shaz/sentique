// const multer = require("multer");
// const path = require("path");

// const storage = multer.diskStorage({
//   destination: (req, file, cb) => {
//     cb(null, path.join(__dirname, "../public/photos/product-image")); // better sub-folder
//   },
//   filename: (req, file, cb) => {
//     cb(null, Date.now() + "-" + file.originalname);
//   }
// });

// // Export a ready-to-use multer instance
// const upload = multer({ storage });

// module.exports = upload;


const multer = require("multer");
const path = require("path");
const fs = require("fs");

const uploadPath = path.join(__dirname, "../public/uploads");
if (!fs.existsSync(uploadPath)) fs.mkdirSync(uploadPath, { recursive: true });

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, uploadPath);
  },
  filename: (req, file, cb) => {
    cb(null, Date.now() + "-" + file.originalname);
  },
});

// File type filter
const fileFilter = (req, file, cb) => {
  const allowedTypes = /jpeg|jpg|png/;
  const ext = path.extname(file.originalname).toLowerCase();
  const mime = file.mimetype;

  if (!allowedTypes.test(ext) || !allowedTypes.test(mime)) {
    return cb(new Error("Only JPG, JPEG, PNG files are allowed"));
  }
  cb(null, true);
};

// Multer configuration
const upload = multer({
  storage,
  limits: { fileSize: 20 * 1024 * 1024 }, // 10 MB
  fileFilter: fileFilter
});

module.exports = upload;
