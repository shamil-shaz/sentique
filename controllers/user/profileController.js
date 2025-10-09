// const User =require("../../models/userSchema");
// const nodemailer =require("nodemailer")
// const bcrypt=require("bcrypt")
// const env=require("dotenv").config();
// const session=require("express-session")
// const mongoose = require("mongoose");
// const crypto = require("crypto");
// const { sendOtpEmail } = require("../../utils/sendOtpEmail");




// function generateOtp() {
//     const digits = "1234567890";
//     let otp = "";
//     for (let i = 0; i < 4; i++) {
//         otp += digits[Math.floor(Math.random() * digits.length)];
//     }
//     return otp;
// }

// const   sendVerificationEmail= async (email, otp,subject)=>{
//     // try {
//     //     const transporter = nodemailer.createTransport({
//     //         service: "gmail",
//     //         port: 587,
//     //         secure: false,
//     //         requireTLS: true,
//     //         auth: {
//     //             user: process.env.NODEMAILER_EMAIL,
//     //             pass: process.env.NODEMAILER_PASSWORD
//     //         }
//     //     });

//         try {
//       const transporter = nodemailer.createTransport({
//   service: "gmail",
//   auth: {
//     user: process.env.NODEMAILER_EMAIL, // your Gmail
//     pass: process.env.NODEMAILER_PASSWORD, // App Password, NOT Gmail normal password
//   },
// });


//         const mailOptions={
//              from: process.env.NODEMAILER_EMAIL,
//             to: email,
//             subject: "Your OTP for password reset",
//             text: `Your OTP is ${otp}`,
//             html: `<b>Your OTP: ${otp}</b>`,

//         }

//          console.log("OTP email sent:", otp);

//          const info = await transporter.sendMail(mailOptions);

//         console.log("Email sent:", info.messageId);
      

//         return true;
//     } catch (error) {
//         console.error("Error sending email:", error);
//         return false;
//     }
// }

//  const securePassword = async (password) => {
//     try {
//          const passwordHash = await bcrypt.hash(password, 10);
//          return passwordHash;
//     } catch (error) {
//         console.error("Password hash error:", error);
//         return null;
//     }
// };

//  const loadForgotPassword =async(req,res)=>{
//     try {

//         res.render("forgot-Password");
        
//     } catch (error) {
//         res.redirect("/pageNotFound")
//     }
//  }

// const handleForgotPassword = async (req, res) => {
//   try {
//     const { email } = req.body;
//     console.log("Forgot password email:", email);

//     const findUser = await User.findOne({ email });
//     if (!findUser) {
//       return res.json({ success: false, message: "User with this email does not exist" });
//     }

//     const otp = generateOtp();
//       req.session.forgotOtp = otp;
//       req.session.forgotEmail = email;
//       req.session.otpExpiry = Date.now() + 1 * 60 * 1000; 

//     const transporter = nodemailer.createTransport({
//       service: "gmail",
//             port: 587,
//             secure: false,
//             requireTLS: true,
//             auth: {
//                 user: process.env.NODEMAILER_EMAIL,
//                 pass: process.env.NODEMAILER_PASSWORD
//             }

//     });

//     const mailOptions = {
//       from: process.env.NODEMAILER_EMAIL,
//       to: email,
//       subject: "Your OTP Code (Forgot Password)",
//       text: `Your OTP for password reset is: ${otp}`,
//       html: `<p>Your OTP for password reset is: <b>${otp}</b></p>`,
//     };

//    await transporter.sendMail(mailOptions);
//     console.log("OTP email sent:", otp);

//     return res.json({ success: true, message: "OTP sent successfully!" });

//   } catch (err) {
//     console.error("Forgot password error:", err);
//     return res.json({ success: false, message: "Something went wrong. Try again later." });
//   }
// };

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

// // const resendOtp = async (req, res) => {
// //     try{

// //          const otp= generateOtp();
// //          req.session.forgotOtp=otp;
// //          const email=req.session.forgotEmail;
// //          console.log("Resend OTP email:", email);

// //          const emailSent=await sendVerificationEmail(email,otp);
// //          if(emailSent){
// //             console.log(" Resend OTP :", otp);
// //             res.status(200).json({success:true,message:"OTP resent successfully"})
// //          }

// //     }catch(error){

// //         console.error("Error resending OTP:", error);
// //         res.status(500).json({success:false,message:"Error resending OTP. Please try again later."})

// //     }
// // }



// const loadResetPasswordPage=async(req,res)=>{
//     try {
//         res.render("reset-password")
//     } catch(error){
//         res.redirect("/pageNotFound")

//     }
// }

// const resetPassword = async (req, res) => {
//   try {
//     const { newPassword, confirmPassword } = req.body;
//     const email = req.session.forgotEmail;

//     if (!email) {
//       return res.json({ success: false, message: "Session expired. Please try again." });
//     }

//     if (newPassword !== confirmPassword) {
//       return res.json({ success: false, message: "Passwords do not match" });
//     }

//     const passwrdHash = await bcrypt.hash(newPassword, 10);

//     await User.updateOne(
//       { email: email },
//       { $set: { password: passwrdHash } }
//     );

//     req.session.forgotEmail = null;

//     return res.json({ success: true, message: "Password updated successfully" });
//   } catch (error) {
//     console.error("Reset password error:", error);
//     return res.status(500).json({ success: false, message: "Something went wrong." });
//   }
// };
 


// const userProfile = async (req, res) => {
//   try {
//     const userSession = req.session.user;
//     console.log("userProfile: session user:", userSession);
//     if (!userSession?.id) {
//       req.flash("error", "Please log in to access your profile");
//       return res.redirect("/login");
//     }

//     const userData = await User.findById(userSession.id);
//     if (!userData) {
//       req.flash("error", "User not found");
//       return res.redirect("/pageNotFound");
//     }

//     res.render("profile", { user: userData, message: "" });
//   } catch (err) {
//     console.error("Error loading profile:", err);
//     req.flash("error", "Error loading profile");
//     res.redirect("/pageNotFound");
//   }
// };

// const updateProfile = async (req, res) => {
//   try {
//     const userId = req.session.user?.id;
//     if (!userId) {
//       req.flash("error", "Unauthorized");
//       return res.redirect("/profile");
//     }

//     const { name, phone, gender } = req.body;
//     await User.findByIdAndUpdate(userId, { name, phone, gender });

//     req.flash("success", "Profile updated successfully");
//     res.redirect("/profile");
//   } catch (err) {
//     console.error("Error updating profile:", err);
//     req.flash("error", "Profile update failed");
//     res.redirect("/profile");
//   }
// };

// const uploadImage = async (req, res) => {
//   try {
//     const userId = req.session.user?.id;
//     if (!userId) return res.json({ success: false, message: "Unauthorized" });

//     if (!req.file) return res.json({ success: false, message: "No file uploaded" });

//     const imagePath = `/uploads/${req.file.filename}`;
//     await User.findByIdAndUpdate(userId, { profileImage: imagePath });

//     res.json({ success: true, message: "Profile image updated successfully" });
//   } catch (err) {
//     console.error("Error uploading image:", err);
//     res.json({ success: false, message: "Failed to upload image" });
//   }
// };


// const sendEmailOtp = async (req, res) => {
//   try {
//     const { newEmail } = req.body;
//     const userId = req.session.user?.id;

//     if (!userId) return res.json({ success: false, message: "Unauthorized" });
//     if (!newEmail) return res.json({ success: false, message: "Email required" });

//     const existingUser = await User.findOne({ email: newEmail });
//     if (existingUser) return res.json({ success: false, message: "Email already in use" });

//     const otp = Math.floor(1000 + Math.random() * 9000).toString();

//     req.session.otpData = {
//       otp,
//       type: "change-email",
//       newEmail,
//       token: crypto.randomBytes(32).toString("hex"),
//       expiry: Date.now() + 5 * 60 * 1000, // 5 minutes
//     };

//     await sendOtpEmail(newEmail, otp, "OTP for Email Change");

//     console.log("📧 Email Change OTP:", otp);
//     res.json({
//       success: true,
//       message: "OTP sent successfully",
//       redirectUrl: `/verify-otp?type=change-email`,
//     });
//   } catch (error) {
//     console.error("OTP Send Error:", error);
//     res.json({ success: false, message: "Failed to send OTP. Please try again." });
//   }
// };




// const initChangePassword = async (req, res) => {
//   try {
//     const userId = req.session.user?.id;
//     if (!userId) return res.json({ success: false, message: "Unauthorized" });

//     const { currentPassword, newPassword, confirmPassword } = req.body;

//     if (newPassword !== confirmPassword) 
//       return res.json({ success: false, message: "Passwords do not match" });
//     if (newPassword.length < 6) 
//       return res.json({ success: false, message: "Password must be at least 6 characters" });

//     const user = await User.findById(userId);
//     if (!user) return res.json({ success: false, message: "User not found" });

//     const match = await bcrypt.compare(currentPassword, user.password);
//     if (!match) return res.json({ success: false, message: "Incorrect current password" });

//     const otp = generateOtp();
//     const token = crypto.randomBytes(32).toString("hex");

//     // Standardized session
//     req.session.otpData = {
//       otp,
//       token,
//       type: "change-password",
//       email: user.email,   // recipient email
//       newPassword,
//       expiry: Date.now() + 60*1000
//     };

//     const emailSent = await sendVerificationEmail(user.email, otp, "OTP for Password Change");
//     if (!emailSent) return res.json({ success: false, message: "Failed to send OTP" });

//     res.json({ success: true, message: "OTP sent successfully", token, type: "change-password" });

//   } catch (err) {
//     console.error("initChangePassword error:", err);
//     res.json({ success: false, message: "Error sending OTP" });
//   }
// };


// const initOtp = async (req, res) => {
//   try {
//     const user = await User.findById(req.session.user?.id);
//     if (!user) return res.json({ success: false, message: "User not found" });

//     const { type, newEmail, currentPassword, newPassword, confirmPassword } = req.body;

//     if (!["change-password", "change-email"].includes(type))
//       return res.json({ success: false, message: "Invalid type" });

//     // Password change
//     if (type === "change-password") {
//       if (newPassword !== confirmPassword)
//         return res.json({ success: false, message: "Passwords do not match" });

//       const match = await bcrypt.compare(currentPassword, user.password);
//       if (!match) return res.json({ success: false, message: "Incorrect current password" });

//       const otp = generateOtp();
//       const token = crypto.randomBytes(32).toString("hex");

//       req.session.otpData = {
//         otp,
//         token,
//         type,
//         email: user.email,
//         newPassword,
//         expiry: Date.now() + 60 * 1000,
//       };

//       await sendVerificationEmail(user.email, otp, "OTP for Password Change");
//       return res.json({ success: true, message: "OTP sent successfully", token, type });
//     }

//     // Email change
//     if (type === "change-email") {
//       if (!newEmail) return res.json({ success: false, message: "New email required" });
//       if (newEmail === user.email) return res.json({ success: false, message: "New email cannot be same" });

//       const match = await bcrypt.compare(currentPassword, user.password);
//       if (!match) return res.json({ success: false, message: "Incorrect password" });

//       const otp = generateOtp();
//       const token = crypto.randomBytes(32).toString("hex");

//       req.session.otpData = {
//         otp,
//         token,
//         type,
//         newEmail,
//         expiry: Date.now() + 60 * 1000,
//       };

//       await sendVerificationEmail(newEmail, otp, "OTP for Email Change");
//       return res.json({ success: true, message: "OTP sent successfully", token, type });
//     }
//   } catch (err) {
//     console.error(err);
//     res.json({ success: false, message: "Error initiating OTP" });
//   }
// };

// const loadOtpVerifyPage = (req, res) => {
//   const { type } = req.query;
//   const otpData = req.session.otpData;

//   if (!otpData || otpData.type !== type || Date.now() > otpData.expiry) {
//     req.flash("error", "Invalid or expired OTP session");
//     return res.redirect("/profile");
//   }

//   res.render("verify-otp", { type, message: "" });
// };


// // const verifyOtp = async (req, res) => {
// //   try {
// //     const { otp, type } = req.body;
// //     const sessionOtp = req.session.emailOtp;

// //     if (!sessionOtp || otp !== sessionOtp) {
// //       return res.json({ success: false, message: "Invalid or expired OTP" });
// //     }

// //     if (type === "change-email") {
// //       const userId = req.session.user.id;
// //       await User.findByIdAndUpdate(userId, { email: req.session.tempEmail });
// //     }

// //     req.session.emailOtp = null;
// //     req.session.tempEmail = null;

// //     res.json({ success: true, redirectUrl: "/profile", message: "Email updated successfully" });
// //   } catch (error) {
// //     console.error("OTP Verify Error:", error);
// //     res.json({ success: false, message: "Verification failed. Try again." });
// //   }
// // };

// const verifyOtp = async (req, res) => {
//   try {
//     const { otp, type } = req.body;
//     const otpData = req.session.otpData;

//     if (!otpData || otpData.type !== type) 
//       return res.json({ success: false, message: "Invalid OTP session" });

//     if (Date.now() > otpData.expiry)
//       return res.json({ success: false, message: "OTP expired" });

//     if (otp !== otpData.otp)
//       return res.json({ success: false, message: "Incorrect OTP" });

//     if (type === "change-email") {
//       await User.findByIdAndUpdate(req.session.user.id, { email: otpData.newEmail });
//     } else if (type === "change-password") {
//       const hashed = await bcrypt.hash(otpData.newPassword, 10);
//       await User.findByIdAndUpdate(req.session.user.id, { password: hashed });
//     }

//     req.session.otpData = null;
//     res.json({ success: true, redirectUrl: "/profile", message: "Update successful" });
//   } catch (err) {
//     console.error("OTP Verification Error:", err);
//     res.json({ success: false, message: "Error verifying OTP" });
//   }
// };

// const resendOtp = async (req, res) => {
//   try {
//     const otpData = req.session.otpData;
//     const { type } = req.body;
//     if (!otpData) return res.json({ success: false, message: "No OTP session found" });

//     const newOtp = generateOtp();
//     otpData.otp = newOtp;
//     otpData.expiry = Date.now() + 60 * 1000;

//     const email = otpData.email || otpData.newEmail;
//     if (!email) return res.json({ success: false, message: "Recipient email not found" });

//     await sendVerificationEmail(email, newOtp, `OTP for ${otpData.type.replace("-", " ")}`);
//     res.json({ success: true, message: "OTP resent successfully" });
//   } catch (err) {
//     console.error(err);
//     res.json({ success: false, message: "Error resending OTP" });
//   }
// };





//  module.exports={
//     loadForgotPassword,
//     handleForgotPassword,
//     loadForgotPageOtp,
//     verifyForgotOtp,
//     sendVerificationEmail,
//     generateOtp,
//     loadResetPasswordPage,
//     resendOtp,
//     resetPassword,
//     securePassword,
//     userProfile,
//     sendEmailOtp,
//     initChangePassword,
//     updateProfile,
//     loadOtpVerifyPage,
//     verifyOtp,
//     uploadImage,
//     initOtp,

//  }




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

const loadForgotPageOtp = async (req, res) => {
  try {
    if (!req.session.forgotOtp || !req.session.forgotEmail) {
      return res.redirect("/forgot-password");
    }
    res.render("forgotPassword-otp", { message: "" });
  } catch (err) {
    console.error("Error loading forgotPasswor-otp:", err);
    res.status(500).send("Server Error");
  }
};

const verifyForgotOtp = async (req, res) => {
  try {
     const enterdOtp = req.body.otp;
     if(enterdOtp==req.session.forgotOtp){
        res.json({success:true,redirectUrl:"/reset-password"})
     }else{
        res.json({success:false,message:"Invalid OTP"})
     }
  } catch (error) {
    res.status(500).json({ success: false, message: "An error occurred while verifying OTP." });
  }
}

const resendOtp = async (req, res) => {
    try{

         const otp= generateOtp();
         req.session.forgotOtp=otp;
         const email=req.session.forgotEmail;
         console.log("Resend OTP email:", email);

         const emailSent=await sendVerificationEmail(email,otp);
         if(emailSent){
            console.log(" Resend OTP :", otp);
            res.status(200).json({success:true,message:"OTP resent successfully"})
         }

    }catch(error){

        console.error("Error resending OTP:", error);
        res.status(500).json({success:false,message:"Error resending OTP. Please try again later."})

    }
}

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





// const userProfile = async (req, res) => {
//   try {
//     const userSession = req.session.user;
//     if (!userSession?.id) {
//       req.flash("error", "Please log in to access your profile");
//       return res.redirect("/login");
//     }

//     const userData = await User.findById(userSession.id);
//     if (!userData) {
//       req.flash("error", "User not found");
//       return res.redirect("/pageNotFound");
//     }

//     res.render("profile", {
//       user: userData,
//       success_msg: req.flash("success"),
//       error_msg: req.flash("error"),
//     });
//   } catch (err) {
//     console.error("Error loading profile:", err);
//     req.flash("error", "Error loading profile");
//     res.redirect("/pageNotFound");
//   }
// };

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
      expiry: Date.now() + 3 * 60 * 1000 // 3 minutes
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


const loadOtpVerifyPage = (req, res) => {
  const { type } = req.query;
  const otpData = req.session.otpData;
   console.log(type)

  if (!otpData || otpData.type !== type || Date.now() > otpData.expiry) {
    req.flash("error", "Invalid or expired OTP session");
    return res.redirect("/profile");
  }

  res.render("change-email-otp", { type, token: otpData.token, message: "" });
};



const verifyOtp = async (req, res) => {
  try {
    const { otp, type, token } = req.body;
    const otpData = req.session.otpData;

    if (!otpData || otpData.type !== type || otpData.token !== token) {
      return res.json({ success: false, message: "Invalid OTP session or token" });
    }

    if (Date.now() > otpData.expiry) {
      return res.json({ success: false, message: "OTP expired" });
    }

    if (String(otp) !== String(otpData.otp)) {
      return res.json({ success: false, message: "Incorrect OTP" });
    }

    // Perform the update
    if (type === "change-email") {
      await User.findByIdAndUpdate(req.session.user.id, { email: otpData.newEmail });
    } else if (type === "change-password") {
      const hashed = await bcrypt.hash(otpData.newPassword, 10);
      await User.findByIdAndUpdate(req.session.user.id, { password: hashed });
    }

    // Clear OTP session
    delete req.session.otpData;

    res.json({ success: true, redirectUrl: "/profile", message: "Update successful" });
  } catch (err) {
    console.error("verifyOtp error:", err);
    res.json({ success: false, message: "Error verifying OTP" });
  }
};

const resendProfileOtp = async (req, res) => {
  try {
    const otpData = req.session.otpData;
    if (!otpData) return res.json({ success: false, message: "No OTP session found" });

    const otp = generateOtp();
    otpData.otp = otp;
    otpData.expiry = Date.now() + 3 * 60 * 1000; // reset expiry

    const emailSent = await sendVerificationEmail(
      otpData.type === "change-password" ? otpData.email : otpData.newEmail,
      otp,
      `OTP for ${otpData.type === "change-password" ? "Password Change" : "Email Change"}`
    );

    if (!emailSent) return res.json({ success: false, message: "Failed to resend OTP" });

    res.json({ success: true, message: "OTP resent successfully", token: otpData.token, type: otpData.type });
  } catch (err) {
    console.error("resendOtp error:", err);
    res.json({ success: false, message: "Error resending OTP" });
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

    // ===== VALIDATION =====
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

    // ✅ Upload new image to Cloudinary if provided
    if (req.file) {
      const uploadResult = await cloudinary.uploader.upload(req.file.path, {
        folder: "sentique/profile",
      });

      updateData.image = uploadResult.secure_url; // store the image URL in DB
    }

    // ✅ Update user in MongoDB
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
  updateProfile
};