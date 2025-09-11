// config.js
// // This file defines your API base URL depending on environment.
// // Make sure to include this BEFORE auth.js in your HTML pages.

// window.APP_CONFIG = {
//   API_BASE: (function () {
//     // 👉 PRODUCTION (replace with your actual domain)
//     if (location.hostname === "your-production-domain.com") {
//       // If your API is served from the same domain as your frontend:
//       return "/api/auth";
//       // OR, if your backend is on a different subdomain:
//       // return "https://api.your-production-domain.com/api/auth";
//     }

//     // 👉 STAGING (optional)
//     if (location.hostname === "staging.your-domain.com") {
//       return "https://staging-api.your-domain.com/api/auth";
//     }

//     // 👉 LOCAL DEVELOPMENT (default)
//     return "http://localhost:5000/api/auth";
//   })(),
// };


// // /js/config.js
// window.APP_CONFIG = {
//   API_BASE: (function(){
//     if (location.hostname === 'your-production-domain.com') {
//       return 'https://api.your-production-domain.com'; // production server origin
//     }
//     // default local dev
//     return 'http://localhost:5000';
//   })(),
//   SOCKET_BASE: (function(){
//     // By default use same host as API
//     if (location.hostname === 'your-production-domain.com') {
//       return 'https://api.your-production-domain.com';
//     }
//     return 'http://localhost:5000';
//   })()
// };
// config.js - drop into Frontend/js/config.js
// Make sure this is loaded BEFORE auth.js in your HTML.

window.APP_CONFIG = {
  // API_BASE should point to the AUTH API root used by auth.js (it expects /signup, /login, etc).
  // Include the /api/auth suffix so auth.js can call `${API_BASE}/signup` etc.
  API_BASE: (function(){
    if (location.hostname === 'your-production-domain.com') {
      return 'https://api.your-production-domain.com/api/auth';
    }
    if (location.hostname === 'staging.your-domain.com') {
      return 'https://staging-api.your-domain.com/api/auth';
    }
    // default local dev (auth endpoints)
    return 'http://localhost:5000/api/auth';
  })(),

  // Socket base must be the server origin (no /api) — used for Socket.IO connections.
  SOCKET_BASE: (function(){
    if (location.hostname === 'your-production-domain.com') {
      return 'https://api.your-production-domain.com';
    }
    if (location.hostname === 'staging.your-domain.com') {
      return 'https://staging-api.your-domain.com';
    }
    // default local dev (socket server origin)
    return 'http://localhost:5000';
  })()
};

