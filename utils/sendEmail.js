const nodemailer = require("nodemailer");
require('dotenv').config();

// Nodemailer
const sendEmail = async (options) => {
  // 1) Create transporter ( service that will send email like "gmail","Mailgun", "mialtrap", sendGrid)
  const transporter = nodemailer.createTransport({
    service: "gmail",
    auth: {
      user: process.env.EMAIL_USER,
      pass: process.env.EMAIL_PASSWORD,
    },
  });
  
  // 2) Define email options (like from, to, subject, email content)
  const mailOpts = {
    from: `"TIC Academy" <${process.env.EMAIL_USER}>`,
    to: options.email,
    subject: options.subject,
    html: options.html,
  };

  // 3) Send email
  await transporter.sendMail(mailOpts);
};

module.exports = sendEmail;
