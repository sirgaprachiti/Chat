// // server/utils/sendResetEmail.js
// const nodemailer = require('nodemailer');

// module.exports = async function sendResetEmail(email, rawToken) {
//   const backendHost = process.env.BACKEND_HOST || 'http://localhost:5000';
//   const frontendHost = process.env.FRONTEND_URL || 'http://localhost:5500'; // your frontend host
//   const resetUrl = `${frontendHost}/reset.html?token=${encodeURIComponent(rawToken)}`;

//   console.log('Reset URL:', resetUrl); // debug — remove in production

//   const transporter = nodemailer.createTransport({
//     host: process.env.SMTP_HOST || 'smtp.gmail.com',
//     port: Number(process.env.SMTP_PORT || 587),
//     secure: process.env.SMTP_SECURE === 'true',
//     auth: {
//       user: process.env.SMTP_USER,
//       pass: process.env.SMTP_PASS
//     }
//   });

//   const html = `
//     <p>Hello,</p>
//     <p>Click the link below to reset your password (valid for 1 hour):</p>
//     <p><a href="${resetUrl}">Reset password</a></p>
//     <p>If link doesn't work, paste this into your browser:</p>
//     <pre>${resetUrl}</pre>
//   `;

//   return transporter.sendMail({
//     from: process.env.EMAIL_FROM || 'no-reply@example.com',
//     to: email,
//     subject: 'Password reset',
//     html
//   });
// };
// server/utils/sendResetEmail.js
const sgMail = require('@sendgrid/mail');
const nodemailer = require('nodemailer');

const FROM = process.env.EMAIL_FROM || process.env.MAIL_FROM || 'no-reply@example.com';
const FRONTEND = process.env.FRONTEND_URL || 'http://localhost:5500';
const BACKEND = process.env.BACKEND_HOST || 'http://localhost:5000';

async function sendViaSendGrid(to, rawToken) {
  sgMail.setApiKey(process.env.SENDGRID_API_KEY);
  const resetUrl = `${FRONTEND}/reset.html?token=${encodeURIComponent(rawToken)}`;
  const msg = {
    to,
    from: FROM,
    subject: 'Password reset',
    text: `Reset your password: ${resetUrl}`,
    html: `
      <p>Hello,</p>
      <p>Click the link below to reset your password (valid for 1 hour):</p>
      <p><a href="${resetUrl}">Reset password</a></p>
      <p>If the link doesn't work, paste this into your browser:</p>
      <pre>${resetUrl}</pre>
    `
  };
  const res = await sgMail.send(msg);
  return res;
}

async function sendViaNodemailer(to, rawToken) {
  let transporter;
  if (process.env.SMTP_HOST && process.env.SMTP_USER) {
    transporter = nodemailer.createTransport({
      host: process.env.SMTP_HOST,
      port: Number(process.env.SMTP_PORT || 587),
      secure: process.env.SMTP_SECURE === 'true',
      auth: { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS },
      logger: true,
      debug: true
    });
  } else {
    // ethereal dev account
    const testAccount = await nodemailer.createTestAccount();
    transporter = nodemailer.createTransport({
      host: 'smtp.ethereal.email',
      port: 587,
      auth: { user: testAccount.user, pass: testAccount.pass }
    });
    console.log('Ethereal account for reset email:', testAccount);
  }

  const resetUrl = `${FRONTEND}/reset.html?token=${encodeURIComponent(rawToken)}`;
  const info = await transporter.sendMail({
    from: FROM,
    to,
    subject: 'Password reset',
    html: `
      <p>Hello,</p>
      <p>Click the link below to reset your password (valid for 1 hour):</p>
      <p><a href="${resetUrl}">Reset password</a></p>
      <p>If link doesn't work, paste this into your browser:</p>
      <pre>${resetUrl}</pre>
    `
  });

  const preview = nodemailer.getTestMessageUrl ? nodemailer.getTestMessageUrl(info) : undefined;
  return { nodemailerInfo: info, preview };
}

module.exports = async function sendResetEmail(email, rawToken) {
  try {
    if (process.env.SENDGRID_API_KEY) {
      const res = await sendViaSendGrid(email, rawToken);
      console.log('sendResetEmail: SendGrid result:', Array.isArray(res) ? res[0] : res);
      return res;
    } else {
      const res = await sendViaNodemailer(email, rawToken);
      console.log('sendResetEmail: Nodemailer result:', res);
      return res;
    }
  } catch (err) {
    console.error('sendResetEmail error:', err && err.stack ? err.stack : err);
    throw err;
  }
};
