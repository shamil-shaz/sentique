const User =require("../../models/userSchema");
const nodemailer =require("nodemailer")
const bcrypt=require("bcrypt")
const env=require("dotenv").config();
const session=require("express-session")

function generateOtp() {
    const digits = "1234567890";
    let otp = "";
    for (let i = 0; i < 4; i++) {
        otp += digits[Math.floor(Math.random() * digits.length)];
    }
    return otp;
}



// function generateOtp() {
//     return Math.floor(1000 + Math.random() * 9000).toString();
// }

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









 const loadForgotPassword =async(req,res)=>{
    try {

        res.render("forgot-Password");
        
    } catch (error) {
        res.redirect("/pageNotFound")
    }
 }


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
req.session.otpExpiry = Date.now() + 1 * 60 * 1000; // 2 min expiry


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
   // res.redirect("/forgotPassword-otp");

    return res.json({ success: true, message: "OTP sent successfully!" });

  } catch (err) {
    console.error("Forgot password error:", err);
    return res.json({ success: false, message: "Something went wrong. Try again later." });
  }
};



// Load OTP page
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

// Verify OTP
// const verifyForgotOtp = async (req, res) => {
//   try {
//     const { otp } = req.body;

//     if (!req.session.forgotOtp || !req.session.forgotEmail) {
//       return res.status(400).json({ success: false, message: "Session expired. Please try again." });
//     }

//     // Check OTP expiry
//     if (req.session.otpExpiry && Date.now() > req.session.otpExpiry) {
//       req.session.forgotOtp = null;
//       req.session.forgotEmail = null;
//       return res.status(400).json({ success: false, message: "OTP expired. Please resend OTP." });
//     }

//     if (otp.toString() === req.session.forgotOtp.toString()) {
//       // Clear OTP after success
//       req.session.forgotOtp = null;

//       return res.status(200).json({ success: true, redirect: "/reset-password" });
//     } else {
//       return res.status(400).json({ success: false, message: "Invalid OTP. Please try again." });
//     }
//   } catch (error) {
//     console.error("Error verifying forgot OTP:", error);
//     return res.status(500).json({ success: false, message: "An error occurred while verifying OTP." });
//   }
// };


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



 module.exports={
    loadForgotPassword,
    handleForgotPassword,
    loadForgotPageOtp,
    verifyForgotOtp,
    sendVerificationEmail,
    generateOtp,
    loadResetPasswordPage,
    resendOtp,
    resetPassword,

 }

