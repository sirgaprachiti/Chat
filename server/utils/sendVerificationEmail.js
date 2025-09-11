// // const nodemailer = require('nodemailer');

// // const transporter = nodemailer.createTransport({
// //   host: process.env.SMTP_HOST,
// //   port: Number(process.env.SMTP_PORT || 587),
// //   secure: process.env.SMTP_SECURE === 'true', // false for 587
// //   auth: {
// //     user: process.env.SMTP_USER,
// //     pass: process.env.SMTP_PASS
// //   },
// //   tls: {
// //     // allow self-signed certs if any; leave true/omit in production for stricter validation
// //     rejectUnauthorized: false
// //   }
// // });

// // transporter.verify()
// //   .then(() => console.log('SMTP ready'))
// //   .catch(err => console.warn('SMTP verify failed:', err.message));


// // utils/sendVerificationEmail.js
// const nodemailer = require('nodemailer');

// const transporter = nodemailer.createTransport({
//   host: process.env.SMTP_HOST,
//   port: Number(process.env.SMTP_PORT || 587),
//   secure: process.env.SMTP_SECURE === 'true',
//   auth: {
//     user: process.env.SMTP_USER,
//     pass: process.env.SMTP_PASS
//   }
// });

// transporter.verify()
//   .then(() => console.log('SMTP ready'))
//   .catch(err => console.warn('SMTP verify failed:', err.message));

// module.exports = async function sendVerificationEmail(toEmail, token) {
//   const verifyUrl = `${process.env.BACKEND_URL || 'http://localhost:5000'}/api/auth/verify-email?token=${token}`;

//   console.log('EMAIL -> sending verify URL:', url);
//   const html = `
//     <p>Hello 👋</p>
//     <p>Please verify your email by clicking the link below:</p>
//     <p><a href="${verifyUrl}">Verify my email</a></p>
//     <p>If the link doesn't work, copy & paste this URL into your browser:<br>${verifyUrl}</p>
//     <p>This link expires in 24 hours.</p>
//   `;
//   await transporter.sendMail({
//     from: process.env.EMAIL_FROM,
//     to: toEmail,
//     subject: 'Verify your ChatApp account',
//     html
//   });
// };


// server/utils/sendVerificationEmail.js
const nodemailer = require('nodemailer');

module.exports = async function sendVerificationEmail(email, token) {
  const backendHost = process.env.BACKEND_HOST || 'http://localhost:5000';
  // build the url variable (important!)
  const url = `${backendHost}/api/auth/verify-email?token=${encodeURIComponent(token)}`;

  console.log('EMAIL -> verify url to send:', url); // debug only

  // configure transporter (example using Gmail - replace with your config)
  const transporter = nodemailer.createTransport({
    host: process.env.SMTP_HOST || 'smtp.gmail.com',
    port: Number(process.env.SMTP_PORT) || 587,
    secure: process.env.SMTP_SECURE === 'true', // true for 465, false for other ports
    auth: {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASS
    }
  });

  const html = `
    <p>Hello 👋</p>
    <p>Please verify your email by clicking the link below:</p>
    <p><a href="${url}">Verify my email</a></p>
    <p>If the link doesn't work, copy & paste this URL into your browser:</p>
    <p><small>${url}</small></p>
  `;

  const info = await transporter.sendMail({
    from: process.env.EMAIL_FROM || 'no-reply@example.com',
    to: email,
    subject: 'Please verify your email',
    html
  });

  // optional debug log
  console.log('Verification email sent:', info?.messageId || info);
};
