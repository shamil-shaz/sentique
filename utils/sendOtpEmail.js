const nodemailer = require("nodemailer");

async function sendOtpEmail(email, otp) {
  const transporter = nodemailer.createTransport({
    service: "gmail",
    auth: {
      user: process.env.NODEMAILER_EMAIL,
      pass: process.env.NODEMAILER_PASSWORD,
    },
  });

  const mailOptions = {
    from: process.env.NODEMAILER_EMAIL,
    to: email,
    subject: "Sentique - Email Verification OTP",
    text: `Your OTP for email verification is: ${otp}`,
  };

  await transporter.sendMail(mailOptions);
}

module.exports = { sendOtpEmail };
