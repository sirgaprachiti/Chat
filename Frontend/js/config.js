// config.js
// This file defines your API base URL depending on environment.
// Make sure to include this BEFORE auth.js in your HTML pages.

window.APP_CONFIG = {
  API_BASE: (function () {
    // 👉 PRODUCTION (replace with your actual domain)
    if (location.hostname === "your-production-domain.com") {
      // If your API is served from the same domain as your frontend:
      return "/api/auth";
      // OR, if your backend is on a different subdomain:
      // return "https://api.your-production-domain.com/api/auth";
    }

    // 👉 STAGING (optional)
    if (location.hostname === "staging.your-domain.com") {
      return "https://staging-api.your-domain.com/api/auth";
    }

    // 👉 LOCAL DEVELOPMENT (default)
    return "http://localhost:5000/api/auth";
  })(),
};
