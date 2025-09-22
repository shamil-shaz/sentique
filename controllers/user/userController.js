
const User = require("../../models/userSchema");
const Category=require("../../models/categorySchema");
const Product=require("../../models/productSchema");
const nodemailer = require("nodemailer");
const dotenv = require('dotenv').config();
const bcrypt = require("bcrypt");
const Brand = require("../../models/brandSchema");
const mongoose = require("mongoose");


const transporter = nodemailer.createTransport({
  service: "gmail",
  auth: {
    user: "shamilmuhammed689@gmail.com",  
    pass: "pkmqvoomanpruiav",            
  }
});

const pageNotFound = async (req, res) => {
    try {
        res.render("page-404");
    } catch (error) {
        res.redirect("/pageNotFound");
    }
};

const loadLandingPage = async (req, res) => {
  try {
    res.render("landingPage");  
  } catch (error) {
    console.error("Landing page error:", error);
    return res.status(500).send("Server error");
  }
};  


// const loadHomepage = async (req, res) => {
//   try {
//     const sessionUser = req.session.user;  
//     const categories = await Category.find({ isListed: true });

//     // 🔹 Flash Sales (latest products)
//     let productData = await Product.find({
//       isBlocked: false,
//       category: { $in: categories.map(category => category._id) },
//       quantity: { $gt: 0 },
//     })
//     .sort({ createdAt: -1 })
//     .limit(4)
    
//     .lean();

//     // 🔹 New Arrivals (latest 4 products)
//     const newArrivals = await Product.find({
//       isBlocked: false,
//       category: { $in: categories.map(category => category._id) },
//       quantity: { $gt: 0 },
//     })
//     .sort({ createdAt: -1 })
//     .limit(4)
//     .lean();

//     // 🔹 Best Selling (for now just pick top 4 randomly, 
//     // later you can add salesCount field in Product schema)
//     const bestSelling = await Product.find({
//       isBlocked: false,
//       category: { $in: categories.map(category => category._id) },
//       quantity: { $gt: 0 },
//     })
//     .sort({ soldCount: -1 }) // needs soldCount field
//     .limit(4)
//     .lean();

//     // 🔹 Popular Brands (distinct brands from product collection)
//     const brands = await Brand.find({ isBlocked: false })
//       .sort({ createdAt: -1 })
//       .limit(10)
//       .lean();

//     // 🔹 User data
//     let userData = null;
//     if (sessionUser) {
//       const user = await User.findById(sessionUser);
//       if (user) {
//         userData = {
//           _id: user._id,
//           name: user.name,
//           email: user.email,
//           phone: user.phone,
//         };
//       }
//     }


//     return res.render("home", {
//       user: userData,
//       products: productData,   // Flash Sales
//       newArrivals,             // New Arrival
//       bestSelling,             // Best Selling
//       categories,              // Categories
//       brands                   // Brands
//     });

//   } catch (error) {
//     console.error("Home page error:", error);
//     return res.status(500).send("Server error");
//   }
// };



const loadHomepage = async (req, res) => {
  try {
    const sessionUser = req.session.user;  
    const categories = await Category.find({ isListed: true }).lean();

    // 🔹 Flash Sales (latest 4 products)
    const products = await Product.find({
      isBlocked: false,
      category: { $in: categories.map(c => c._id) },
      "variants.0": { $exists: true }, // ensure at least 1 variant
    })
    .sort({ createdAt: -1 })
    .limit(4)
    .populate("brand")       // populate brand info
    .populate("category")    // populate category info
    .lean();

    // 🔹 New Arrivals
    const newArrivals = await Product.find({
      isBlocked: false,
      category: { $in: categories.map(c => c._id) },
      "variants.0": { $exists: true },
    })
    .sort({ createdAt: -1 })
    .limit(4)
    .populate("brand")
    .lean();

    // 🔹 Best Selling (top soldCount)
    const bestSelling = await Product.find({
      isBlocked: false,
      category: { $in: categories.map(c => c._id) },
      "variants.0": { $exists: true },
    })
    .sort({ soldCount: -1 }) // make sure you have soldCount field
    .limit(4)
    .populate("brand")
    .lean();

    // 🔹 Popular Brands
    const brands = await Brand.find({ isBlocked: false })
      .sort({ createdAt: -1 })
      .limit(10)
      .lean();

    // 🔹 User data
    let userData = null;
    if (sessionUser) {
      const user = await User.findById(sessionUser).lean();
      if (user) {
        userData = {
          _id: user._id,
          name: user.name,
          email: user.email,
          phone: user.phone,
        };
      }
    }

    return res.render("home", {
      user: userData,
      products,       // Flash Sales
      newArrivals,
      bestSelling,
      categories,
      brands
    });

  } catch (error) {
    console.error("Home page error:", error);
    return res.status(500).send("Server error");
  }
};



const loadSignup = async (req, res) => {
  try {
    res.render("signup", { message: "" }); 
  } catch (err) {
    res.render("signup", { message: "Something went wrong." });
  }
};

function generateOtp() {
    return Math.floor(1000 + Math.random() * 9000).toString();
}

async function sendVerificationEmail(email, otp) {
    try {
        const transporter = nodemailer.createTransport({
            service: "gmail",
            port: 587,
            secure: false,
            requireTLS: true,
            auth: {
                user: process.env.NODEMAILER_EMAIL,
                pass: process.env.NODEMAILER_PASSWORD
            }
        });

        const info = await transporter.sendMail({
            from: process.env.NODEMAILER_EMAIL,
            to: email,
            subject: "Verify your account",
            text: `Your OTP is ${otp}`,
            html: `<b>Your OTP: ${otp}</b>`,
        });

        console.log("Email sent:", info.response);
        return info.accepted.length > 0;
    } catch (error) {
        console.error("Error sending email:", error);
        return false;
    }
}

const securePassword = async (password) => {
    try {
        return await bcrypt.hash(password, 10);
    } catch (error) {
        console.error("Password hash error:", error);
        return null;
    }
};

const signup = async (req, res) => {
  try {
    const { fullName, phone, email, referral, password, confirmPassword } = req.body;

    if (!fullName || !email || !phone || !password || !confirmPassword) {
      return res.status(400).json({ success: false, message: "All fields are required" });
    }

    if (password !== confirmPassword) {
      return res.status(400).json({ success: false, message: "Passwords do not match" });
    }

    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.status(400).json({ success: false, message: "Email already registered" });
    }
    const securePass = await securePassword(password);
    const otp = Math.floor(1000 + Math.random() * 9000);
    console.log("Generated OTP:", otp);
    console.log("OTP for user", email, "is", otp);

    req.session.userData = {
      fullName,
      phone,
      email,
      referral,
      password,
    };
    req.session.userOtp = otp;

    await transporter.sendMail({
      from: process.env.EMAIL_USER,
      to: email,
      subject: "Sentique Email Verification",
      text: `Your OTP is ${otp}`
    });
    return res.status(200).json({
      success: true,
      redirectUrl: "/verify-otp"
    });
  } catch (error) {
    console.log("Signup error:", error);
    return res.status(500).json({ success: false, message: "Server error" });
  }
};

const loadVerifyOtpPage = async (req, res) => {
    try {
        if (!req.session.userOtp || !req.session.userData) {
            return res.redirect('/signup');
        }
        return res.render('verify-otp');
    } catch (err) {
        return res.status(500).send("Server Error");
    }
};

const verifyOtp = async (req, res) => {
  try {
    const { otp } = req.body;
    if (!req.session.userOtp || !req.session.userData) {
      return res.status(400).json({
        success: false,
        message: "Session expired. Please sign up again.",
      });
    }
    if (otp.toString() === req.session.userOtp.toString()) {
      const user = req.session.userData;
      if (!user.password) {
        return res.status(400).json({
          success: false,
          message: "Password missing. Please sign up again.",
        });
      }
      const hashedPassword = await securePassword(user.password);
      const newUser = new User({
        name: user.fullName,
        email: user.email,
        phone: user.phone,
        password: hashedPassword,
      });

      await newUser.save();
  
      req.session.userOtp = null;
      req.session.userData = null;
       console.log(" OTP verified - sending redirect to /login");

       return res.status(200).json({
         success: true,
         redirect: "/login",
     });

    } else {
      return res.status(400).json({
        success: false,
        message: "Invalid OTP. Please try again.",
      });
    }   
  } catch (error) {
    console.error("Error verifying OTP:", error);
    return res.status(500).json({
      success: false,
      message: "An error occurred while verifying OTP.",
    });
  }
};

const resendOtp = async (req, res) => {
    try {
        const userData = req.session.userData;
        if (!userData || !userData.email) {
            return res.status(400).json({
                success: false,
                message: "Session expired. Please sign up again.",
            });
        }
        const otp = generateOtp();
        req.session.userOtp = otp;
        const emailSent = await sendVerificationEmail(userData.email, otp);

        if (emailSent) {
            console.log("Resent OTP:", otp);
            return res.status(200).json({  
                success: true,
                message: "OTP resent successfully.",
            });
        } else {
            return res.status(500).json({ 
                success: false,
                message: "Failed to resend OTP. Please try again.",
            });
        }
    } catch (error) {
        console.error("Error Resending OTP:", error);
        return res.status(500).json({ 
            success: false,
            message: "Internal server error. Please try again.",
        });
    }
};

const loadLogin = async (req, res) => {
    try {
        if (!req.session.user) {
            return res.render('login', { message: "" });
        } else {
            res.redirect('/');
        }
    } catch (error) {
        res.redirect('/pageNotFound');
    }
};


const login = async (req, res) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) {
      return res.render("login", { message: "All fields are required" });
    }
    const findUser = await User.findOne({ isAdmin: 0, email: email });
 
    if (!findUser) {
      return res.render("login", { message: "User not Found" });
    }

    if (findUser.isBlocked) {
      return res.render("login", { message: "User is blocked by admin" });
    }

    if (!findUser.password) {
      return res.render("login", { message: "This account uses Google login only" });
    }
    const passwordMatch = await bcrypt.compare(password, findUser.password);

    if (!passwordMatch) {
      return res.render("login", { message: "Incorrect Password" });
    }
     req.session.user = {
       _id: findUser._id,
        name: findUser.name,
       email: findUser.email,

      };
    res.redirect("/home");
  } catch (error) {
    console.error("login error", error);
    res.render("login", { message: "Login failed. Please try again later" });
  }
};

const logout= async(req,res)=>{
    try{
        req.session.destroy((err)=>{
            if(err){
                console.log("Session destruction error",err.message)
                return res.redirect('/pageNotFound');
            }
            return res.redirect('/login')
        })
    }catch(error){
        console.log("logout error",error)
         res.redirect('/pageNotFound')
    }
}


// const loadShopingPage = async (req, res) => {
//   try {
//     const user = req.session.user;
//     const userData = await User.findOne({ _id: user });
    

//     const categories = await Category.find({ isListed: true });
//     const categoryIds = categories.map((category) => category._id.toString());
  
//     const selectedCategories = Array.isArray(req.query.categorys)
//       ? req.query.categorys
//       : req.query.categorys
//       ? [req.query.categorys]
//       : [];

//     const selectedBrands = Array.isArray(req.query.brands)
//       ? req.query.brands
//       : req.query.brands
//       ? [req.query.brands]
//       : [];

//     const sort = req.query.sort || "newest";
//     const page = parseInt(req.query.page) || 1;
//     const limit = 9;
//     const skip = (page - 1) * limit;
    
//     const filterQuery = {
//       isBlocked: false,
//       stock: { $gt: 0 },
//     };
    
//     const search = req.query.search ? req.query.search.trim() : "";

// if (search) {
//   filterQuery.productName = { $regex: search, $options: "i" };
// }

// if (selectedCategories.length > 0) {
//   filterQuery.category = { $in: selectedCategories };
// }

// if (selectedBrands.length > 0) {
//   filterQuery.brand = { $in: selectedBrands.map(id => new mongoose.Types.ObjectId(id)) };
// }   
//     let sortOption = { createdOn: -1 }; 
//     if (sort === "priceLow") sortOption = { salePrice: 1 };
//     if (sort === "priceHigh") sortOption = { salePrice: -1 };

//     console.log("Filter Query:", filterQuery);
    
//     const Products = await Product.find(filterQuery)
//       .populate("brand")
//       .populate("category")
//       .sort(sortOption)
//       .skip(skip)
//       .limit(limit)
//       .lean();

//       console.log("Products Found:", Products.length);

//     const totalProducts = await Product.countDocuments(filterQuery);
//     const totalPages = Math.ceil(totalProducts / limit);
//     const brands = await Brand.find({ isBlocked: false });
//     const categoriesWithIds = categories.map((category) => ({
//       _id: category._id,
//       name: category.name,
//     }));

//     res.render("shopPage", {
//       user: userData,
//       products: Products,
//       categories: categoriesWithIds,
//       brands,
//       totalProducts,
//       currentPage: page,
//       totalPages,
//       selectedCategories,
//       selectedBrands,
//       sort,
//       search
//     });

//   } catch (error) {
//     console.error("Error in loadShopingPage:", error);
//     res.redirect("/pageNotFound");
//   }
// };


const loadShopingPage = async (req, res) => {
  try {
    const user = req.session.user;
    const userData = await User.findById(user).lean();

    const categories = await Category.find({ isListed: true }).lean();
    const selectedCategories = Array.isArray(req.query.categorys)
      ? req.query.categorys
      : req.query.categorys
      ? [req.query.categorys]
      : [];
    const selectedBrands = Array.isArray(req.query.brands)
      ? req.query.brands
      : req.query.brands
      ? [req.query.brands]
      : [];

    const sort = req.query.sort || "newest";
    const page = parseInt(req.query.page) || 1;
    const limit = 9;
    const skip = (page - 1) * limit;

   const filterQuery = { isBlocked: false, "variants.stock": { $gt: 0 } };

//    // Filtering
// const filterQuery = { isBlocked: false };

// // Only include products with at least one variant in stock
// filterQuery["variants.stock"] = { $gt: 0 };



    const search = req.query.search ? req.query.search.trim() : "";
    if (search) filterQuery.productName = { $regex: search, $options: "i" };
    if (selectedCategories.length > 0) filterQuery.category = { $in: selectedCategories };
   if (selectedBrands.length > 0) {
  filterQuery.brand = { $in: selectedBrands.map((id) => new mongoose.Types.ObjectId(id)) };
}


    // Sorting
    let sortOption = { createdAt: -1 }; // newest first
    if (sort === "priceLow") sortOption = { "variants.salePrice": 1 };
    if (sort === "priceHigh") sortOption = { "variants.salePrice": -1 };

    const products = await Product.find(filterQuery)
      .populate("brand")
      .populate("category")
      .sort(sortOption)
      .skip(skip)
      .limit(limit)
      .lean();

    // Compute lowest salePrice and highest regularPrice for each product
    products.forEach((p) => {
      if (p.variants && p.variants.length > 0) {
        p.salePrice = Math.min(...p.variants.map((v) => v.salePrice || v.regularPrice));
        p.regularPrice = Math.max(...p.variants.map((v) => v.regularPrice || v.salePrice));
      } else {
        p.salePrice = p.salePrice || 0;
        p.regularPrice = p.regularPrice || 0;
      }
    });

    const totalProducts = await Product.countDocuments(filterQuery);
    const totalPages = Math.ceil(totalProducts / limit);

    const brands = await Brand.find({ isBlocked: false }).lean();

    res.render("shopPage", {
      user: userData,
      products,
      categories,
      brands,
      totalProducts,
      currentPage: page,
      totalPages,
      selectedCategories,
      selectedBrands,
      sort,
      search,
    });
  } catch (error) {
    console.error("Error in loadShopingPage:", error);
    res.redirect("/pageNotFound");
  }
};



const loadProductDetails = async (req, res) => {
  try {
    const userId = req.session.user ? req.session.user._id : null;
    const userData = userId ? await User.findById(userId).lean() : null;

    // Get productId (support both query & params)
    const productId = req.params.id || req.query.id;

    if (!productId) {
      return res.redirect('/shopPage');
    }

    // Fetch product with brand & category
    const product = await Product.findOne({
      _id: productId,
      isBlocked: false
    })
      .populate('brand', 'brandName brandImage')
      .populate('category', 'categoryName')
      .lean();

    if (!product) {
      return res.redirect('/shopPage');
    }

    let relatedProducts = await Product.find({
  category: product.category._id,
  _id: { $ne: product._id },
  isBlocked: false
})
  .limit(3)
  .lean();

if (relatedProducts.length < 3) {
  const needed = 3 - relatedProducts.length;
  const extraProducts = await Product.find({
    _id: { $nin: [product._id, ...relatedProducts.map(p => p._id)] },
    isBlocked: false
  })
    .limit(needed)
    .lean();
  relatedProducts = [...relatedProducts, ...extraProducts];
}

    res.render('productDetails', {
      user: userData,
      product,
      relatedProducts
    });

  } catch (error) {
    console.error("Error loading product details:", error);
    res.redirect('/pageNotFound');
  }
};


module.exports = {
    loadLandingPage,
    loadHomepage,
    pageNotFound,
    loadSignup,
    signup,
    verifyOtp,
    loadVerifyOtpPage,
    resendOtp,
    loadLogin,
    login,
    logout,    
    loadShopingPage, 
    loadProductDetails,
};




