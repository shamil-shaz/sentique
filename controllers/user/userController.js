
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
    const user = req.session.user || null; 
    res.render("landingPage", { user });   
  } catch (error) {
    console.error("Landing page error:", error);
    return res.status(500).send("Server error");
  }
};




const loadHomepage = async (req, res) => {
  try {
    const sessionUser = req.session.user;

    
    const categories = await Category.find({ isListed: true }).lean();
    const listedCategoryIds = categories.map(c => c._id);

    const brands = await Brand.find({ isBlocked: false }).lean();
    const unblockedBrandIds = brands.map(b => b._id);


    const fetchProducts = async (filter = {}, sortOption = {}, limit = 4) => {
      const products = await Product.find({
        isBlocked: false,
        category: { $in: listedCategoryIds },
        brand: { $in: unblockedBrandIds },
        "variants.0": { $exists: true },
        ...filter
      })
        .populate("brand", "brandName brandImage")
        .populate("category", "name categoryImage")
        .sort(sortOption)
        .limit(limit)
        .lean();

      
      products.forEach(p => {
        if (p.variants && p.variants.length > 0) {
          p.salePrice = Math.min(...p.variants.map(v => v.salePrice || v.regularPrice));
          p.regularPrice = Math.max(...p.variants.map(v => v.regularPrice || v.salePrice));
        } else {
          p.salePrice = p.salePrice || 0;
          p.regularPrice = p.regularPrice || 0;
        }
      });

      return products;
    };

  
    const [products, newArrivals, bestSelling] = await Promise.all([
      fetchProducts({}, { createdAt: -1 }, 4),
      fetchProducts({}, { createdAt: -1 }, 4),
      fetchProducts({}, { soldCount: -1 }, 4)
    ]);

    
    let userData = null;
    if (sessionUser?.id) {
      userData = await User.findById(sessionUser.id)
        .select("name email phone")
        .lean();
    }

   
    return res.render("home", {
      user: userData,
      products,
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
    if (!req.session.user) {
            return res.render('signup', { message: "" });
        } else {
            res.redirect('/');
        }
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
      return res.status(400).json({ success: false, message: "All fields are required" });
    }

    const findUser = await User.findOne({ email: email, isAdmin: false });
    if (!findUser) {
      return res.status(401).json({ success: false, message: "Invalid credentials" });
    }

    if (findUser.isBlocked) {
      return res.status(403).json({ success: false, message: "Your account is blocked. Contact support." });
    }

    if (!findUser.password) {
      return res.status(400).json({ success: false, message: "This account uses Google login only" });
    }

    const passwordMatch = await bcrypt.compare(password, findUser.password);
    if (!passwordMatch) {
      return res.status(401).json({ success: false, message: "Invalid credentials" });
    }

    req.session.user = {
      id: findUser._id.toString(),
      name: findUser.name,
      email: findUser.email,
      role: "user"
    };

    findUser.lastLogin = new Date();
    await findUser.save();

    return res.json({
      success: true,
      message: "Login successful",
      redirectUrl: "/home"
    });
  } catch (error) {
    console.error("Login error:", error);
    return res.status(500).json({ success: false, message: "Something went wrong. Please try again later." });
  }
};


const logout = async (req, res) => {
  try {
   
    if (req.session.user) {
      delete req.session.user;
    }

    return res.redirect('/login');
    
  } catch (error) {
    console.log("Logout error:", error);
    return res.redirect('/pageNotFound');
  }
};



const loadShopingPage = async (req, res) => {
  try {
    const categories = await Category.find({ isListed: true }).lean();
    const listedCategoryIds = categories.map(cat => cat._id.toString());

    const brands = await Brand.find({ isBlocked: false }).lean();
    const unblockedBrandIds = brands.map(b => b._id.toString());

    const selectedCategories = Array.isArray(req.query.categorys)
      ? req.query.categorys.filter(catId => listedCategoryIds.includes(catId))
      : req.query.categorys && listedCategoryIds.includes(req.query.categorys)
      ? [req.query.categorys]
      : [];

    const selectedBrands = Array.isArray(req.query.brands)
      ? req.query.brands.filter(id => unblockedBrandIds.includes(id))
      : req.query.brands && unblockedBrandIds.includes(req.query.brands)
      ? [req.query.brands]
      : [];

    const sort = req.query.sort || "newest";
    const priceRange = req.query.priceRange || "";
    const page = parseInt(req.query.page) || 1;
    const limit = 9;
    const skip = (page - 1) * limit;

    const filterQuery = {
      isBlocked: false,
      "variants.stock": { $gt: 0 }
    };

    const search = req.query.search ? req.query.search.trim() : "";
    if (search) filterQuery.productName = { $regex: search, $options: "i" };

    filterQuery.category = {
      $in:
        selectedCategories.length > 0
          ? selectedCategories.map(id => new mongoose.Types.ObjectId(id))
          : listedCategoryIds.map(id => new mongoose.Types.ObjectId(id))
    };

    if (selectedBrands.length > 0) {
      filterQuery.brand = {
        $in: selectedBrands.map(id => new mongoose.Types.ObjectId(id))
      };
    } else {
      filterQuery.brand = {
        $in: unblockedBrandIds.map(id => new mongoose.Types.ObjectId(id))
      };
    }

    if (priceRange) {
      switch (priceRange) {
        case "below1000":
          filterQuery["variants.salePrice"] = { $lt: 1000 };
          break;
        case "1000-2000":
          filterQuery["variants.salePrice"] = { $gte: 1000, $lte: 2000 };
          break;
        case "2000-3000":
          filterQuery["variants.salePrice"] = { $gte: 2000, $lte: 3000 };
          break;
        case "above5000":
          filterQuery["variants.salePrice"] = { $gt: 5000 };
          break;
      }
    }

  
    let sortOption = {};
    if (sort === "priceLow") {
      sortOption = { "variants.salePrice": 1 };
    } else if (sort === "priceHigh") {
      sortOption = { "variants.salePrice": -1 };
    } else if (sort === "nameAZ") {
      sortOption = { productName: 1 }; 
    } else if (sort === "nameZA") {
      sortOption = { productName: -1 };
    } else {
      sortOption = { createdAt: -1 }; 
    }

    
    let products = await Product.find(filterQuery)
      .populate("brand")
      .populate("category")
      .sort(sortOption)
      .skip(skip)
      .limit(limit)
      .lean();

    products = products.filter(
      p => p.category && p.category.isListed && p.brand && !p.brand.isBlocked
    );

    products.forEach(p => {
      if (p.variants && p.variants.length > 0) {
        p.salePrice = Math.min(...p.variants.map(v => v.salePrice || v.regularPrice));
        p.regularPrice = Math.max(...p.variants.map(v => v.regularPrice || v.salePrice));
      } else {
        p.salePrice = p.salePrice || 0;
        p.regularPrice = p.regularPrice || 0;
      }
    });

    const totalProducts = await Product.countDocuments(filterQuery);
    const totalPages = Math.ceil(totalProducts / limit);

    res.render("shopPage", {
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
      priceRange,
    });
  } catch (error) {
    console.error("Error in loadShopingPage:", error);
    res.redirect("/pageNotFound");
  }
};




const loadProductDetails = async (req, res) => {
  try {
    const productId = req.params.id || req.query.id;

    if (!productId) {
      return res.redirect("/shopPage");
    }

  
    const product = await Product.findOne({
      _id: productId,
      isBlocked: false,
    })
      .populate("brand", "brandName brandImage")
      .populate("category", "categoryName categoryImage")
      .lean();

    if (!product) {
      return res.redirect("/shopPage");
    }

   
const relatedProducts = await Product.find({
  category: product.category,
  _id: { $ne: product._id },
  isBlocked: false
})
.populate("brand", "brandName")
.populate("category", "name")

.limit(3)
.lean();


    res.render("productDetails", {
      product,
      relatedProducts,
    });

     console.log("Related Products:", relatedProducts.map(p => ({
  name: p.productName,
  category: p.category,
  brand: p.brand
})));
  } catch (error) {
    console.error("Error loading product details:", error);
    res.redirect("/shopPage");
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
    generateOtp,
    
   
};




