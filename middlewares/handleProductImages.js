const fs = require('fs');
const path = require('path');
const Product = require("../models/productSchema");

module.exports = async function handleProductImages(req, res, next) {
  try {
    const productId = req.params.id;
    const product = await Product.findById(productId);
    if (!product) return res.status(404).send('Product not found');

    // ✅ Ensure req.body exists
    req.body = req.body || {};
    req.body.deletedImages = req.body.deletedImages || '';
    req.body.productImagesBase64 = req.body.productImagesBase64 || [];

    const deletedImages = req.body.deletedImages.split(',').filter(Boolean);
    const base64Images = Array.isArray(req.body.productImagesBase64)
      ? req.body.productImagesBase64
      : [req.body.productImagesBase64];

    // ✅ DELETE images from filesystem + DB
    for (const img of deletedImages) {
      const index = product.images.indexOf(img);
      if (index > -1) product.images.splice(index, 1);

      const filePath = path.join(__dirname, '../uploads/', img);
      if (fs.existsSync(filePath)) fs.unlinkSync(filePath);
    }

    // ✅ ADD new images from base64
    for (const dataUrl of base64Images) {
      if (!dataUrl || !dataUrl.startsWith("data:image")) continue;

      const filename = Date.now() + '-' + Math.floor(Math.random() * 1000) + '.jpg';
      const base64Data = dataUrl.replace(/^data:image\/\w+;base64,/, '');
      fs.writeFileSync(
        path.join(__dirname, '../uploads/', filename),
        Buffer.from(base64Data, 'base64')
      );
      product.images.push(filename);
    }

    // Attach product to req for route handler
    req.product = product;
    next();
  } catch (err) {
    console.error(err);
    return res.status(500).send('Server error while handling images');
  }
};
