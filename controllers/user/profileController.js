
const User = require("../../models/userSchema");
const nodemailer = require("nodemailer");
const bcrypt = require("bcrypt");
const env = require("dotenv").config();
const session = require("express-session");
const mongoose = require("mongoose");
const crypto = require("crypto");
const cloudinary = require("cloudinary").v2;
const path = require("path");
const multer=require('multer')


const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, "public/uploads/");
  },
  filename: function (req, file, cb) {
    cb(null, Date.now() + path.extname(file.originalname));
  },
});

const fileFilter = (req, file, cb) => {
  const allowedTypes = ["image/jpeg", "image/png", "image/jpg"];
  if (allowedTypes.includes(file.mimetype)) cb(null, true);
  else cb(new Error("Only JPG, JPEG, PNG allowed"), false);
};

const upload = multer({ storage, fileFilter });

function generateOtp() {
  const digits = "1234567890";
  let otp = "";
  for (let i = 0; i < 4; i++) {
    otp += digits[Math.floor(Math.random() * digits.length)];
  }
  return otp;
}

const   sendVerificationEmail= async (email, otp)=>{
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

        const mailOptions={
             from: process.env.NODEMAILER_EMAIL,
            to: email,
            subject: "Your OTP for password reset",
            text: `Your OTP is ${otp}`,
            html: `<b>Your OTP: ${otp}</b>`,

        }
          console.log(otp)

         const info = await transporter.sendMail(mailOptions);

        console.log("Email sent:", info.messageId);
      

        return true;
    } catch (error) {
        console.error("Error sending email:", error);
        return false;
    }
}

const securePassword = async (password) => {
  try {
    const passwordHash = await bcrypt.hash(password, 10);
    return passwordHash;
  } catch (error) {
    console.error("Password hash error:", error);
    return null;
  }
};

const loadForgotPassword = async (req, res) => {
  try {
    res.render("forgot-Password");
  } catch (error) {
    res.redirect("/pageNotFound");
  }
};

const handleForgotPassword = async (req, res) => {
  try {
    const { email } = req.body;
    console.log("Forgot password email:", email);

    const findUser = await User.findOne({ email });
    if (!findUser) {
      return res.json({ success: false, message: "User with this email does not exist" });
    }

    const otp = generateOtp();
      req.session.forgotOtp = otp;
      req.session.forgotEmail = email;
      req.session.otpExpiry = Date.now() + 1 * 60 * 1000; 

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

    const mailOptions = {
      from: process.env.NODEMAILER_EMAIL,
      to: email,
      subject: "Your OTP Code (Forgot Password)",
      text: `Your OTP for password reset is: ${otp}`,
      html: `<p>Your OTP for password reset is: <b>${otp}</b></p>`,
    };

   await transporter.sendMail(mailOptions);
    console.log("OTP email sent:", otp);

    return res.json({ success: true, message: "OTP sent successfully!" });

  } catch (err) {
    console.error("Forgot password error:", err);
    return res.json({ success: false, message: "Something went wrong. Try again later." });
  }
};

// const loadForgotPageOtp = async (req, res) => {
//   try {
//     if (!req.session.forgotOtp || !req.session.forgotEmail) {
//       return res.redirect("/forgot-password");
//     }
//     res.render("forgotPassword-otp", { message: "" });
//   } catch (err) {
//     console.error("Error loading forgotPasswor-otp:", err);
//     res.status(500).send("Server Error");
//   }
// };

// const verifyForgotOtp = async (req, res) => {
//   try {
//      const enterdOtp = req.body.otp;
//      if(enterdOtp==req.session.forgotOtp){
//         res.json({success:true,redirectUrl:"/reset-password"})
//      }else{
//         res.json({success:false,message:"Invalid OTP"})
//      }
//   } catch (error) {
//     res.status(500).json({ success: false, message: "An error occurred while verifying OTP." });
//   }
// }

// const resendOtp = async (req, res) => {
//     try{

//          const otp= generateOtp();
//          req.session.forgotOtp=otp;
//          const email=req.session.forgotEmail;
//          console.log("Resend OTP email:", email);

//          const emailSent=await sendVerificationEmail(email,otp);
//          if(emailSent){
//             console.log(" Resend OTP :", otp);
//             res.status(200).json({success:true,message:"OTP resent successfully"})
//          }

//     }catch(error){

//         console.error("Error resending OTP:", error);
//         res.status(500).json({success:false,message:"Error resending OTP. Please try again later."})

//     }
// }

// Backend - Updated Controllers

const OTP_EXPIRY_TIME = 60000; 

const loadForgotPageOtp = async (req, res) => {
  try {
    if (!req.session.forgotOtp || !req.session.forgotEmail) {
      return res.redirect("/forgot-password");
    }
    res.render("forgotPassword-otp", { message: "" });
  } catch (err) {
    console.error("Error loading forgotPassword-otp:", err);
    res.status(500).send("Server Error");
  }
};

const verifyForgotOtp = async (req, res) => {
  try {
    const enteredOtp = req.body.otp;

    // Check if OTP exists in session
    if (!req.session.forgotOtp) {
      return res.json({ success: false, message: "OTP not found. Please request a new OTP." });
    }

    // Check if OTP has expired
    const currentTime = Date.now();
    const otpGeneratedTime = req.session.forgotOtpTime;
    const timeDifference = currentTime - otpGeneratedTime;

    if (timeDifference > OTP_EXPIRY_TIME) {
      // OTP has expired
      delete req.session.forgotOtp;
      delete req.session.forgotOtpTime;
      return res.json({ success: false, message: "OTP has expired. Please request a new OTP." });
    }

    // Verify OTP
    if (enteredOtp == req.session.forgotOtp) {
      // Clear OTP from session after successful verification
      delete req.session.forgotOtp;
      delete req.session.forgotOtpTime;
      res.json({ success: true, redirectUrl: "/reset-password" });
    } else {
      res.json({ success: false, message: "Invalid OTP. Please try again." });
    }
  } catch (error) {
    console.error("Error verifying OTP:", error);
    res.status(500).json({ success: false, message: "An error occurred while verifying OTP." });
  }
};

const resendOtp = async (req, res) => {
  try {
    const otp = generateOtp();
    const email = req.session.forgotEmail;
    
    // Store OTP with timestamp
    req.session.forgotOtp = otp;
    req.session.forgotOtpTime = Date.now(); // Store current time
    
    console.log("Resend OTP email:", email);

    const emailSent = await sendVerificationEmail(email, otp);
    
    if (emailSent) {
      console.log("Resend OTP:", otp);
      res.status(200).json({ success: true, message: "OTP resent successfully" });
    } else {
      res.status(500).json({ success: false, message: "Failed to send email. Please try again." });
    }
  } catch (error) {
    console.error("Error resending OTP:", error);
    res.status(500).json({ success: false, message: "Error resending OTP. Please try again later." });
  }
};

const sendForgotPasswordOtp = async (req, res) => {
  try {
    const { email } = req.body;
    
    // Verify email exists in database
    const user = await User.findOne({ email });
    if (!user) {
      return res.json({ success: false, message: "Email not found" });
    }

    const otp = generateOtp();
    
    // Store OTP and timestamp in session
    req.session.forgotEmail = email;
    req.session.forgotOtp = otp;
    req.session.forgotOtpTime = Date.now(); // Store timestamp when OTP is generated
    
    console.log("Generated OTP:", otp);

    const emailSent = await sendVerificationEmail(email, otp);
    
    if (emailSent) {
      res.json({ success: true, message: "OTP sent to email", redirectUrl: "/forgot-password-otp" });
    } else {
      res.status(500).json({ success: false, message: "Failed to send OTP email" });
    }
  } catch (error) {
    console.error("Error sending forgot password OTP:", error);
    res.status(500).json({ success: false, message: "Error sending OTP. Please try again later." });
  }
};

const loadResetPasswordPage=async(req,res)=>{
    try {
        res.render("reset-password")
    } catch(error){
        res.redirect("/pageNotFound")

    }
}

const resetPassword = async (req, res) => {
  try {
    const { newPassword, confirmPassword } = req.body;
    const email = req.session.forgotEmail;

    if (!email) {
      return res.json({ success: false, message: "Session expired. Please try again." });
    }

    if (newPassword !== confirmPassword) {
      return res.json({ success: false, message: "Passwords do not match" });
    }

    const passwrdHash = await bcrypt.hash(newPassword, 10);

    await User.updateOne(
      { email: email },
      { $set: { password: passwrdHash } }
    );

    req.session.forgotEmail = null;

    return res.json({ success: true, message: "Password updated successfully" });
  } catch (error) {
    console.error("Reset password error:", error);
    return res.status(500).json({ success: false, message: "Something went wrong." });
  }
};

const userProfile = async (req, res) => {
  try {
    const userSession = req.session.user;
    if (!userSession?.id) return res.redirect("/login");

    const userData = await User.findById(userSession.id);
    res.render("profile", { user: userData });
  } catch (err) {
    console.error(err);
    res.redirect("/pageNotFound");
  }
};

const sendEmailOtp = async (req, res) => {
  try {
    const { newEmail, password } = req.body;
    const userId = req.session.user?.id;

    if (!userId) return res.json({ success: false, message: "Unauthorized" });
    if (!newEmail || !password) return res.json({ success: false, message: "Email and password required" });

    const user = await User.findById(userId);
    if (!user) return res.json({ success: false, message: "User not found" });

    const match = await bcrypt.compare(password, user.password);
    if (!match) return res.json({ success: false, message: "Incorrect password" });

    const existingUser = await User.findOne({ email: newEmail });
    if (existingUser) return res.json({ success: false, message: "Email already in use" });

    const otp = generateOtp();
    const token = crypto.randomBytes(32).toString("hex");

    req.session.otpData = {
      otp,
      token,
      type: "change-email",
      newEmail,
      expiry: Date.now() + 3 * 60 * 1000 
    };

    console.log(`Email Change OTP: ${otp} sent to ${newEmail}`);

    const emailSent = await sendVerificationEmail(newEmail, otp, "OTP for Email Change");
    if (!emailSent) return res.json({ success: false, message: "Failed to send OTP" });

    res.json({ success: true, message: "OTP sent successfully", token, type: "change-email" });
  } catch (err) {
    console.error("sendEmailOtp error:", err);
    res.json({ success: false, message: "Error sending OTP" });
  }
};

const initChangePassword = async (req, res) => {
  try {
    const userId = req.session.user?.id;
    if (!userId) return res.json({ success: false, message: "Unauthorized" });

    const { currentPassword, newPassword, confirmPassword } = req.body;

    if (newPassword !== confirmPassword)
      return res.json({ success: false, message: "Passwords do not match" });
    if (newPassword.length < 6)
      return res.json({ success: false, message: "Password must be at least 6 characters" });

    const user = await User.findById(userId);
    if (!user) return res.json({ success: false, message: "User not found" });

    const match = await bcrypt.compare(currentPassword, user.password);
    if (!match) return res.json({ success: false, message: "Incorrect current password" });

    const otp = generateOtp();
    const token = crypto.randomBytes(32).toString("hex");

    req.session.otpData = {
      otp,
      token,
      type: "change-password",
      email: user.email,
      newPassword,
      expiry: Date.now() + 3 * 60 * 1000 
    };

    console.log(`Password Change OTP: ${otp} sent to ${user.email}`);

    const emailSent = await sendVerificationEmail(user.email, otp, "OTP for Password Change");
    if (!emailSent) return res.json({ success: false, message: "Failed to send OTP" });

    res.json({ success: true, message: "OTP sent successfully", token, type: "change-password" });
  } catch (err) {
    console.error("initChangePassword error:", err);
    res.json({ success: false, message: "Error sending OTP" });
  }
};

// const loadOtpVerifyPage = (req, res) => {
//   const { type } = req.query;
//   const otpData = req.session.otpData;
//    console.log(type)

//   if (!otpData || otpData.type !== type || Date.now() > otpData.expiry) {
//     req.flash("error", "Invalid or expired OTP session");
//     return res.redirect("/profile");
//   }

//   res.render("change-email-otp", { type, token: otpData.token, message: "" });
// };

// const verifyOtp = async (req, res) => {
//   try {
//     const { otp, type, token } = req.body;
//     const otpData = req.session.otpData;

//     if (!otpData || otpData.type !== type || otpData.token !== token) {
//       return res.json({ success: false, message: "Invalid OTP session or token" });
//     }

//     if (Date.now() > otpData.expiry) {
//       return res.json({ success: false, message: "OTP expired" });
//     }

//     if (String(otp) !== String(otpData.otp)) {
//       return res.json({ success: false, message: "Incorrect OTP" });
//     }

  
//     if (type === "change-email") {
//       await User.findByIdAndUpdate(req.session.user.id, { email: otpData.newEmail });
//     } else if (type === "change-password") {
//       const hashed = await bcrypt.hash(otpData.newPassword, 10);
//       await User.findByIdAndUpdate(req.session.user.id, { password: hashed });
//     }
    
//     delete req.session.otpData;

//     res.json({ success: true, redirectUrl: "/profile", message: "Update successful" });
//   } catch (err) {
//     console.error("verifyOtp error:", err);
//     res.json({ success: false, message: "Error verifying OTP" });
//   }
// };

// const resendProfileOtp = async (req, res) => {
//   try {
//     const otpData = req.session.otpData;
//     if (!otpData) return res.json({ success: false, message: "No OTP session found" });

//     const otp = generateOtp();
//     otpData.otp = otp;
//     otpData.expiry = Date.now() + 3 * 60 * 1000; 

//     const emailSent = await sendVerificationEmail(
//       otpData.type === "change-password" ? otpData.email : otpData.newEmail,
//       otp,
//       `OTP for ${otpData.type === "change-password" ? "Password Change" : "Email Change"}`
//     );

//     if (!emailSent) return res.json({ success: false, message: "Failed to resend OTP" });

//     res.json({ success: true, message: "OTP resent successfully", token: otpData.token, type: otpData.type });
//   } catch (err) {
//     console.error("resendOtp error:", err);
//     res.json({ success: false, message: "Error resending OTP" });
//   }
// };



const loadOtpVerifyPage = (req, res) => {
  const { type } = req.query;
  const otpData = req.session.otpData;
  
  console.log("Loading OTP page for type:", type);

  // Check if OTP session exists and matches the type
  if (!otpData || otpData.type !== type) {
    req.flash("error", "Invalid OTP session");
    return res.redirect("/profile");
  }

  // Check if OTP is already expired
  if (Date.now() > otpData.expiry) {
    delete req.session.otpData;
    req.flash("error", "OTP has expired. Please request a new one.");
    return res.redirect("/profile");
  }

  // PASS expiryTime to template
  res.render("change-email-otp", {
    type,
    token: otpData.token,
    message: "",
    expiryTime: otpData.expiry  // ADD THIS LINE
  });
};

const verifyOtp = async (req, res) => {
  try {
    const { otp, type, token } = req.body;
    const otpData = req.session.otpData;

    console.log("Verifying OTP - Type:", type);

    // Check if session exists
    if (!otpData || otpData.type !== type || otpData.token !== token) {
      return res.json({
        success: false,
        message: "Invalid OTP session or token"
      });
    }

    // CHECK IF OTP IS EXPIRED
    const currentTime = Date.now();
    if (currentTime > otpData.expiry) {
      console.warn("OTP expired");
      delete req.session.otpData;
      return res.json({
        success: false,
        message: "OTP has expired. Please request a new OTP."
      });
    }

    // Check if OTP matches
    if (String(otp) !== String(otpData.otp)) {
      console.warn("OTP mismatch");
      return res.json({
        success: false,
        message: "Incorrect OTP. Please try again."
      });
    }

    // OTP is valid - proceed with update
    console.log("OTP verified successfully");

    try {
      if (type === "change-email") {
        await User.findByIdAndUpdate(req.session.user.id, {
          email: otpData.newEmail
        });
        console.log("Email updated successfully");
      } else if (type === "change-password") {
        const hashed = await bcrypt.hash(otpData.newPassword, 10);
        await User.findByIdAndUpdate(req.session.user.id, {
          password: hashed
        });
        console.log("Password updated successfully");
      }

      // Clear OTP data
      delete req.session.otpData;

      return res.json({
        success: true,
        redirectUrl: "/profile",
        message: "Update successful"
      });
    } catch (updateError) {
      console.error("Error updating user:", updateError);
      return res.json({
        success: false,
        message: "Error updating profile. Please try again."
      });
    }
  } catch (err) {
    console.error("verifyOtp error:", err);
    return res.json({
      success: false,
      message: "Error verifying OTP"
    });
  }
};

const resendProfileOtp = async (req, res) => {
  try {
    const { type } = req.body;
    const otpData = req.session.otpData;

    if (!otpData || otpData.type !== type) {
      return res.json({
        success: false,
        message: "No OTP session found"
      });
    }

    // Generate new OTP
    const otp = generateOtp();
    const newExpiry = Date.now() + 1 * 60 * 1000; // 3 minutes

    otpData.otp = otp;
    otpData.expiry = newExpiry;

    console.log("New OTP generated for type:", type);

    // Determine email and subject
    let emailAddress, emailSubject;

    if (type === "change-email") {
      emailAddress = otpData.newEmail;
      emailSubject = "OTP for Email Change";
    } else if (type === "change-password") {
      emailAddress = otpData.email;
      emailSubject = "OTP for Password Change";
    }

    const emailSent = await sendVerificationEmail(emailAddress, otp, emailSubject);

    if (!emailSent) {
      return res.json({
        success: false,
        message: "Failed to resend OTP. Please try again."
      });
    }

    console.log("OTP resent successfully");

    return res.json({
      success: true,
      message: "OTP resent successfully",
      token: otpData.token,
      type: otpData.type,
      expiryTime: newExpiry  // SEND NEW EXPIRY TIME TO FRONTEND
    });
  } catch (err) {
    console.error("resendOtp error:", err);
    return res.json({
      success: false,
      message: "Error resending OTP"
    });
  }
};

const loadEditProfile = async (req, res) => {
  try {
    const userId = req.session.user?.id;
    const user = await User.findById(userId);
    if (!user) return res.redirect("/pageNotFound");

    res.render("profile-Edit", { user });
  } catch (error) {
    console.error(error);
    res.redirect("/pageNotFound");
  }
};

const updateProfile = async (req, res) => {
  try {
    const userId = req.session.user?.id;
    if (!userId) {
      return res.status(401).json({ success: false, message: "User not logged in" });
    }

    let { name, phone } = req.body;
   
    name = name?.trim();
    phone = phone?.trim();

    if (!name || name.length < 3) {
      return res.status(400).json({ success: false, message: "Name must be at least 3 characters long." });
    }

    if (phone) {
      const phoneRegex = /^[0-9]{10}$/;
      if (!phoneRegex.test(phone)) {
        return res.status(400).json({ success: false, message: "Phone number must be exactly 10 digits." });
      }
    }

    let updateData = { name, phone };

    
    if (req.file) {
      const uploadResult = await cloudinary.uploader.upload(req.file.path, {
        folder: "sentique/profile",
      });

      updateData.image = uploadResult.secure_url; 
    }


    const updatedUser = await User.findByIdAndUpdate(userId, updateData, { new: true });

    if (!updatedUser) {
      return res.status(404).json({ success: false, message: "User not found" });
    }

    res.json({ success: true, message: "Profile updated successfully", user: updatedUser });
  } catch (error) {
    console.error("Error updating profile:", error);
    res.status(500).json({ success: false, message: "Server error while updating profile" });
  }
};

const getSecurityPage = async (req, res) => {
  try {
    const userId = req.session.user?.id || req.session.user?._id;
    
    if (!userId) {
      return res.redirect('/login');
    }

    // Fetch user from database to get latest data
    const user = await User.findById(userId);
    
    if (!user) {
      return res.redirect('/pageNotFound');
    }

    res.render('security', {
      user: user,
      activePage: 'security'
    });
  } catch (error) {
    console.error('Security page error:', error);
    res.redirect('/pageNotFound');
  }
};


module.exports = {
  loadForgotPassword,
  handleForgotPassword,
  loadForgotPageOtp,
  verifyForgotOtp,
  sendVerificationEmail,
  generateOtp,
  loadResetPasswordPage,
  resendOtp,
  resetPassword,
  securePassword,
  userProfile,
  sendEmailOtp,
  initChangePassword,
  loadOtpVerifyPage,
  verifyOtp,
  resendProfileOtp,
  loadEditProfile,
  updateProfile,
  getSecurityPage,
  sendForgotPasswordOtp
};