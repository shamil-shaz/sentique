const User = require("../../models/userSchema");

const nodemailer = require("nodemailer");
const dotenv = require("dotenv").config();
const bcrypt = require("bcrypt");

const Wallet = require("../../models/walletSchema");
const mongoose = require("mongoose");
const Review = require("../../models/reviewSchema");


const transporter = nodemailer.createTransport({
  service: "gmail",
  auth: {
    user: process.env.NODEMAILER_EMAIL, 
    pass: process.env.NODEMAILER_PASSWORD,
  },
});

const pageNotFound = async (req, res) => {
  try {
    res.render("page-404");
  } catch (error) {
    res.redirect("/pageNotFound");
  }
};

const loadSignup = async (req, res) => {
  try {
    if (!req.userId)
{
      return res.render("signup", { message: "" });
    } else {
      res.redirect("/");
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
        pass: process.env.NODEMAILER_PASSWORD,
      },
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
    const { fullName, phone, email, referral, password, confirmPassword } =
      req.body;

    if (!fullName || !email || !phone || !password || !confirmPassword) {
      return res
        .status(400)
        .json({ success: false, message: "All fields are required" });
    }

    if (password !== confirmPassword) {
      return res
        .status(400)
        .json({ success: false, message: "Passwords do not match" });
    }

    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res
        .status(400)
        .json({ success: false, message: "Email already registered" });
    }

    const securePass = await securePassword(password);
    const otp = generateOtp();

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

    req.session.otpExpirationTime = Date.now() + 60000;

    await transporter.sendMail({
      from: process.env.EMAIL_USER,
      to: email,
      subject: "Sentique Email Verification",
      text: `Your OTP is ${otp}`,
    });

    console.log(
      "OTP sent:",
      otp,
      "Expires at:",
      new Date(req.session.otpExpirationTime)
    );

    return res.status(200).json({
      success: true,
      redirectUrl: "/verify-otp",
    });
  } catch (error) {
    console.log("Signup error:", error);
    return res.status(500).json({ success: false, message: "Server error" });
  }
};

async function generateUniqueReferralCode(userName) {
  try {
    const namePrefix = userName.substring(0, 5).toUpperCase();
    let referralCode;
    let codeExists = true;
    let attempts = 0;
    const maxAttempts = 10;

    while (codeExists && attempts < maxAttempts) {
      const randomNum = Math.floor(Math.random() * 900) + 100;
      referralCode = `${namePrefix}${randomNum}`;
      const existing = await User.findOne({ refferalCode: referralCode });
      codeExists = !!existing;
      attempts++;
    }

    if (attempts >= maxAttempts) {
      throw new Error("Could not generate unique referral code");
    }

    console.log(" Generated unique referral code:", referralCode);
    return referralCode;
  } catch (err) {
    console.error(" Error generating referral code:", err);
    throw err;
  }
}

const loadVerifyOtpPage = async (req, res) => {
  try {
    if (!req.session.userOtp || !req.session.userData) {
      return res.redirect("/signup");
    }
    return res.render("verify-otp");
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

    const currentTime = Date.now();
    const otpExpirationTime = req.session.otpExpirationTime;

    if (!otpExpirationTime || currentTime > otpExpirationTime) {
      req.session.userOtp = null;
      req.session.userData = null;
      req.session.otpExpirationTime = null;

      return res.status(400).json({
        success: false,
        message: "OTP has expired. Please request a new OTP.",
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

      const referralCode = await generateUniqueReferralCode(user.fullName);

      const newUser = new User({
        name: user.fullName,
        email: user.email,
        phone: user.phone,
        password: hashedPassword,
        refferalCode: referralCode,
        redeemed: false,
        redeemedUsers: [],
      });

      if (user.referral) {
        try {
          console.log(" Processing referral:", user.referral);

          const referrerUser = await User.findOne({
            refferalCode: user.referral,
          });

          if (referrerUser) {
            console.log(" Referrer found:", referrerUser.name);

            newUser.redeemed = true;
            referrerUser.redeemedUsers.push(newUser._id);
            await referrerUser.save();

            let referrerWallet = await Wallet.findOne({
              user: referrerUser._id,
            });
            if (!referrerWallet) {
              console.log(
                " Creating new wallet for referrer:",
                referrerUser._id
              );
              referrerWallet = new Wallet({ user: referrerUser._id });
            }

            referrerWallet.balance += 100;
            referrerWallet.transactions.push({
              type: "credit",
              amount: 100,
              description: "Referral",
              reason: `${user.fullName} signed up using your referral code`,
              date: new Date(),
            });

            await referrerWallet.save();
            console.log(" Referrer wallet credited with ₹100 on signup");
            console.log(" Referrer new balance:", referrerWallet.balance);
          } else {
            console.log("⚠ Referrer not found for code:", user.referral);
          }
        } catch (referralErr) {
          console.error(" Error processing referral:", referralErr.message);
        }
      }

      await newUser.save();

      try {
        let newUserWallet = await Wallet.findOne({ user: newUser._id });
        if (!newUserWallet) {
          console.log("📝 Creating wallet for new user:", newUser._id);
          newUserWallet = new Wallet({
            user: newUser._id,
            balance: 0,
            transactions: [],
          });
          await newUserWallet.save();
          console.log(" Wallet created for new user");
        }
      } catch (walletErr) {
        console.error(
          " Error creating wallet for new user:",
          walletErr.message
        );
      }

    req.login(newUser, (err) => {
        if (err) {
          console.error("Error during req.login after signup:", err);
          return res.status(500).json({ 
            success: false, 
            message: "Signup successful, but session could not be established." 
          });
        }
        req.session.user = {
          id: newUser._id,
          _id: newUser._id,
          name: newUser.name,
          email: newUser.email
        };
        
        req.session.userOtp = null;
        req.session.userData = null;
        req.session.otpExpirationTime = null;

        console.log("User logged in via Passport after OTP verification:", newUser.email);

        return res.status(200).json({
          success: true,
          redirectUrl: "/",
        });
      });
    } else {
      return res.status(400).json({
        success: false,
        message: "Invalid OTP. Please try again.",
      });
    }
  } catch (error) {
    console.error(" Error verifying OTP:", error);
    return res.status(500).json({
      success: false,
      message: "An error occurred while verifying OTP.",
    });
  }
};

const ensureUserHasReferralCode = async (userId) => {
  try {
    const user = await User.findById(userId);

    if (user && !user.refferalCode) {
      const referralCode = await generateUniqueReferralCode(user.name);
      user.refferalCode = referralCode;
      await user.save();
      console.log(`Generated referral code for Google user: ${referralCode}`);
      return referralCode;
    }

    return user?.refferalCode || null;
  } catch (err) {
    console.error("Error ensuring referral code:", err);
    return null;
  }
};

const sendOtp = async (req, res) => {
  try {
    const { email, fullName, phone, password } = req.body;

    const otp = generateOtp();

    req.session.userData = { email, fullName, phone, password };
    req.session.userOtp = otp;

    req.session.otpExpirationTime = Date.now() + 60000; // 1 minute

    const emailSent = await sendVerificationEmail(email, otp);

    if (emailSent) {
      console.log(
        "OTP sent:",
        otp,
        "Expires at:",
        new Date(req.session.otpExpirationTime)
      );
      return res.status(200).json({
        success: true,
        message: "OTP sent successfully to your email.",
      });
    } else {
      return res.status(500).json({
        success: false,
        message: "Failed to send OTP. Please try again.",
      });
    }
  } catch (error) {
    console.error("Error sending OTP:", error);
    return res.status(500).json({
      success: false,
      message: "An error occurred. Please try again.",
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
    req.session.otpExpirationTime = Date.now() + 60000; // 1 minute

    const emailSent = await sendVerificationEmail(userData.email, otp);

    if (emailSent) {
      console.log(
        "Resent OTP:",
        otp,
        "Expires at:",
        new Date(req.session.otpExpirationTime)
      );
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
    if (!req.userId)
{
      return res.render("login", { message: "" });
    } else {
      res.redirect("/");
    }
  } catch (error) {
    res.redirect("/pageNotFound");
  }
};

const login = async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res
        .status(400)
        .json({ success: false, message: "All fields are required" });
    }

    const findUser = await User.findOne({ email: email, isAdmin: false });
    if (!findUser) {
      return res
        .status(401)
        .json({ success: false, message: "Invalid credentials" });
    }

    if (findUser.isBlocked) {
      return res
        .status(403)
        .json({
          success: false,
          message: "Your account is blocked. Contact support.",
        });
    }

    if (!findUser.password) {
      return res
        .status(400)
        .json({
          success: false,
          message: "This account uses Google login only",
        });
    }

    const passwordMatch = await bcrypt.compare(password, findUser.password);
    if (!passwordMatch) {
      return res
        .status(401)
        .json({ success: false, message: "Invalid credentials" });
    }

 req.login(findUser, async (err) => {
  if (err) {
    console.error("Passport login error:", err);
    return res.status(500).json({ success: false, message: "Login failed" });
  }
  req.session.user = {
    id: findUser._id,
    _id: findUser._id,
    name: findUser.name,
    email: findUser.email,
    image: findUser.image
  };

  findUser.lastLogin = new Date();
  await findUser.save();

  return res.json({
    success: true,
    message: "Login successful",
    redirectUrl: "/",
  });
});

   
  } catch (error) {
    console.error("Login error:", error);
    return res
      .status(500)
      .json({
        success: false,
        message: "Something went wrong. Please try again later.",
      });
  }
};

const logout = async (req, res) => {
    try {
        req.logout((err) => {
            req.session.destroy((err) => {
               res.clearCookie('userSession');
                res.redirect("/login");
            });
        });
    } catch (error) {
        console.log("Logout error:", error);
        res.redirect("/pageNotFound");
    }
};



module.exports = {
  pageNotFound,
  loadSignup,
  signup,
  verifyOtp,
  loadVerifyOtpPage,
  resendOtp,
  loadLogin,
  login,
  logout,
  generateOtp,
  sendOtp,
  ensureUserHasReferralCode,
  generateUniqueReferralCode,
  
};
