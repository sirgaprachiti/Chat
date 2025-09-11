require('dotenv').config();
const nodemailer = require('nodemailer');

async function main() {
  const transporter = nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port: Number(process.env.SMTP_PORT || 587),
    secure: process.env.SMTP_SECURE === 'true',
    auth: {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASS
    }
  });

  try {
    // send a test message
    let info = await transporter.sendMail({
      from: process.env.EMAIL_FROM,
      to: "your-other-email@gmail.com", // put another inbox you can check
      subject: "SMTP Test",
      text: "Hello! If you see this, SMTP works 🚀",
      html: "<b>Hello!</b><br>If you see this, SMTP works 🚀"
    });

    console.log("Message sent:", info.messageId);
  } catch (err) {
    console.error("Error:", err.message);
  }
}

main();
