// server/utils/sendResetEmail.js
const nodemailer = require('nodemailer');

module.exports = async function sendResetEmail(email, rawToken) {
  const backendHost = process.env.BACKEND_HOST || 'http://localhost:5000';
  const frontendHost = process.env.FRONTEND_URL || 'http://localhost:5500'; // your frontend host
  const resetUrl = `${frontendHost}/reset.html?token=${encodeURIComponent(rawToken)}`;

  console.log('Reset URL:', resetUrl); // debug — remove in production

  const transporter = nodemailer.createTransport({
    host: process.env.SMTP_HOST || 'smtp.gmail.com',
    port: Number(process.env.SMTP_PORT || 587),
    secure: process.env.SMTP_SECURE === 'true',
    auth: {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASS
    }
  });

  const html = `
    <p>Hello,</p>
    <p>Click the link below to reset your password (valid for 1 hour):</p>
    <p><a href="${resetUrl}">Reset password</a></p>
    <p>If link doesn't work, paste this into your browser:</p>
    <pre>${resetUrl}</pre>
  `;

  return transporter.sendMail({
    from: process.env.EMAIL_FROM || 'no-reply@example.com',
    to: email,
    subject: 'Password reset',
    html
  });
};
