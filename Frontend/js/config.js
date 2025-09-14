


// js/config.js
(function() {
  // pick environment by hostname
  let apiBase = 'http://localhost:5000/api/auth';
  let socketBase = 'http://localhost:5000';

  if (location.hostname === 'your-production-domain.com') {
    apiBase = 'https://api.your-production-domain.com/api/auth';
    socketBase = 'https://api.your-production-domain.com';
  } else if (location.hostname === 'staging.your-domain.com') {
    apiBase = 'https://staging-api.your-domain.com/api/auth';
    socketBase = 'https://staging-api.your-domain.com';
  }

  window.APP_CONFIG = window.APP_CONFIG || {};
  window.APP_CONFIG.API_BASE = String(apiBase).replace(/\/$/, '');
  window.APP_CONFIG.SOCKET_BASE = String(socketBase).replace(/\/$/, '');

  // backwards compat convenience globals
  window.API_BASE = window.APP_CONFIG.API_BASE;
  window.SOCKET_BASE = window.APP_CONFIG.SOCKET_BASE;

  console.debug('CONFIG loaded → API_BASE:', window.API_BASE, 'SOCKET_BASE:', window.SOCKET_BASE);
})();
