


// // // // js/config.js
// // // (function() {
// // //   // pick environment by hostname
// // //   let apiBase = 'http://localhost:5000/api/auth';
// // //   let socketBase = 'http://localhost:5000';

// // //   if (location.hostname === 'your-production-domain.com') {
// // //     apiBase = 'https://api.your-production-domain.com/api/auth';
// // //     socketBase = 'https://api.your-production-domain.com';
// // //   } else if (location.hostname === 'staging.your-domain.com') {
// // //     apiBase = 'https://staging-api.your-domain.com/api/auth';
// // //     socketBase = 'https://staging-api.your-domain.com';
// // //   }

// // //   window.APP_CONFIG = window.APP_CONFIG || {};
// // //   window.APP_CONFIG.API_BASE = String(apiBase).replace(/\/$/, '');
// // //   window.APP_CONFIG.SOCKET_BASE = String(socketBase).replace(/\/$/, '');

// // //   // backwards compat convenience globals
// // //   window.API_BASE = window.APP_CONFIG.API_BASE;
// // //   window.SOCKET_BASE = window.APP_CONFIG.SOCKET_BASE;

// // //   console.debug('CONFIG loaded → API_BASE:', window.API_BASE, 'SOCKET_BASE:', window.SOCKET_BASE);
// // // })();

// // // js/config.js
// // (function() {
// //   // default (local dev)
// //   let apiBase = 'http://localhost:5000/api/auth';
// //   let socketBase = 'http://localhost:5000';

// //   // If running on Render (or any onrender.com domain), point to your deployed backend
// //   // Replace chat-1-2rru.onrender.com with your actual backend URL if different.
// //   if (location.hostname.endsWith('.onrender.com')) {
// //     const host = 'chat-1-2rru.onrender.com';   // <- REPLACE this with your Render backend host if different
// //     apiBase = `https://${host}/api/auth`;
// //     socketBase = `https://${host}`;
// //   }

// //   // If you later have a custom production domain, add another branch:
// //   // else if (location.hostname === 'www.yourdomain.com') { ... }

// //   window.APP_CONFIG = window.APP_CONFIG || {};
// //   window.APP_CONFIG.API_BASE = String(apiBase).replace(/\/$/, '');
// //   window.APP_CONFIG.SOCKET_BASE = String(socketBase).replace(/\/$/, '');

// //   // backwards compat convenience globals (your code uses these in many places)
// //   window.API_BASE = window.APP_CONFIG.API_BASE;
// //   window.SOCKET_BASE = window.APP_CONFIG.SOCKET_BASE;

// //   console.debug('CONFIG loaded → API_BASE:', window.API_BASE, 'SOCKET_BASE:', window.SOCKET_BASE);
// // })();
// // js/config.js
// (function() {
//   // defaults for local dev
//   let apiBase = 'http://localhost:5000/api/auth';
//   let socketBase = 'http://localhost:5000';


//   if (location.hostname.endsWith('.onrender.com')) {
//     const backendHost = 'chat-1-2rru.onrender.com'; 
//   }

//   // if you have a custom production domain:
//   // else if (location.hostname === 'www.yourdomain.com') { ... }

//   window.APP_CONFIG = window.APP_CONFIG || {};
//   window.APP_CONFIG.API_BASE = String(apiBase).replace(/\/$/, '');
//   window.APP_CONFIG.SOCKET_BASE = String(socketBase).replace(/\/$/, '');

//   // optional backwards compat
//   window.API_BASE = window.APP_CONFIG.API_BASE;
//   window.SOCKET_BASE = window.APP_CONFIG.SOCKET_BASE;

//   console.debug('CONFIG loaded → API_BASE:', window.API_BASE, 'SOCKET_BASE:', window.SOCKET_BASE);
// })();


// Frontend/js/config.js
(function() {
  const defaultHost = 'http://localhost:5000';
  const prodHost ="https://chat-1-2rru.onrender.com";
// 'https://chat-1-2ru.onrender.com'; // your backend on Render

  // detect if running on Render (any *.onrender.com frontend)
  const isOnRender = location.hostname.endsWith('.onrender.com');

  window.APP_CONFIG = {
    API_HOST: isOnRender ? prodHost : defaultHost,
    SOCKET_BASE: isOnRender ? prodHost : defaultHost,
    AUTH_BASE: (isOnRender ? prodHost : defaultHost) + '/api/auth'
  };

  // backwards-compat
  window.API_HOST = window.APP_CONFIG.API_HOST;
  window.SOCKET_BASE = window.APP_CONFIG.SOCKET_BASE;
  window.AUTH_BASE = window.APP_CONFIG.AUTH_BASE;

  console.debug('CONFIG loaded →', window.APP_CONFIG);
})();
