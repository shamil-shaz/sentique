const Brand = require("../../models/brandSchema");
const Product = require('../../models/productSchema');




const getBrandPage = async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = 5;
    const skip = (page - 1) * limit;

    const brands = await Brand.find().sort({ createdAt: -1 }).skip(skip).limit(limit);
    const totalBrands = await Brand.countDocuments();
    const totalPages = Math.ceil(totalBrands / limit);

    const { success, error } = req.query;

    res.render("brands", {
      data: brands,
      currentPage: page,
      totalPages,
      totalBrands,
      success,
      error
    });
  } catch (err) {
    console.error("Error loading brands:", err.message);
    res.redirect("/pageerror");
  }
};

const getAddBrand = async (req, res) => {
  try {
    const error = req.query.error || null;
    const brandName = req.query.brandName || "";
    res.render("add-brand", { error, brandName });
  } catch (err) {
    console.error("Error loading add-brand page:", err);
    res.redirect("/pageerror");
  }
};

const getBrandList = async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;       
    const limit = 5;                                   
    const skip = (page - 1) * limit;

    const totalBrands = await Brand.countDocuments();
    const totalPages = Math.ceil(totalBrands / limit);

    const brands = await Brand.find()
      .sort({ createdAt: -1 })  
      .skip(skip)
      .limit(limit);

    
    const error = req.query.error || null;

    res.render("admin/brand-list", {
      data: brands,
      currentPage: page,
      totalPages: totalPages,
      error, 
    });
  } catch (error) {
    console.error("Error in getBrandList:", error.message);
    res.redirect("/pageerror");
  }
};

const addBrand = async (req, res) => {
  try {
    const { brandName } = req.body;
    const imageFile = req.file;

    if (!brandName || !brandName.trim()) {
      return res.status(400).json({ error: " Brand name is required" });
    }

    if (!imageFile) {
      return res.status(400).json({ error: "Brand logo is required" });
    }

    const existingBrand = await Brand.findOne({
      brandName: { $regex: new RegExp("^" + brandName.trim() + "$", "i") }
    });

    if (existingBrand) {
      return res.status(400).json({ error: " Brand already exists" });
    }

    const newBrand = new Brand({
      brandName: brandName.trim(),
      brandImage: [imageFile.filename],
      isActive: true,
    });

    await newBrand.save();

    res.status(200).json({ message: " Brand added successfully" });

  } catch (err) {
    console.error("Error adding brand:", err.message);
    res.status(500).json({ error: "Internal Server Error" });
  }
};


const blockBrand =async(req,res)=>{
    try {
        const id=req.query.id;
        await Brand.updateOne({_id:id},{$set:{isBlocked:true}})
        res.redirect("/admin/brands")

    } catch (error) {
        res.redirect("/pageerror")
    }
}

const unBlockBrand = async (req, res) => {
  try {
    const id = req.query.id;
    console.log("Unblock Brand ID:", id);

    const result = await Brand.updateOne(
      { _id: id },
      { $set: { isBlocked: false } }
    );

    console.log("Update result:", result);

    res.redirect("/admin/brands");
  } catch (error) {
    console.error("Unblock Brand Error:", error);
    res.redirect("/pageerror");
  }
};

const deleteBrand=async(req,res)=>{
    try {
        const {id}=req.query;
        if(!id){
            return res.status(400).redirect("/pageerror")
        }
        await Brand.deleteOne({_id:id});
        res.redirect("/admin/brands")
    } catch (error) {
        console.error("error deleting brand")
        res.status(500).redirect("/pageerror")
    }
}

module.exports = {
  getBrandPage,
  getAddBrand,
  addBrand,
  getBrandList,
  blockBrand,
  unBlockBrand,
  deleteBrand,
};
