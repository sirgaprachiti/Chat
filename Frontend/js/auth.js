// // const API_BASE = (window.APP_CONFIG && window.APP_CONFIG.API_BASE) || 'http://localhost:5000/api/auth';


// // const regForm = document.getElementById("registerForm");
// // const resendWrap = document.getElementById('resendWrap');
// // const resendBtn = document.getElementById('resendBtn');
// // const resendStatus = document.getElementById('resendStatus');

// // const RESEND_COOLDOWN_SECS = 60;
// // let resendCooldownTimer = 0;
// // let resendIntervalId = null;

// // function startResendCooldown() {
// //   resendCooldownTimer = RESEND_COOLDOWN_SECS;
// //   updateResendUi();
// //   if (resendIntervalId) clearInterval(resendIntervalId);
// //   resendIntervalId = setInterval(() => {
// //     resendCooldownTimer -= 1;
// //     updateResendUi();
// //     if (resendCooldownTimer <= 0) {
// //       clearInterval(resendIntervalId);
// //       resendIntervalId = null;
// //     }
// //   }, 1000);
// // }

// // function updateResendUi() {
// //   if (!resendBtn) return;
// //   if (resendCooldownTimer > 0) {
// //     resendBtn.disabled = true;
// //     resendBtn.textContent = `Resend (${resendCooldownTimer}s)`;
// //     if (resendStatus) { resendStatus.textContent = 'Please wait before resending.'; resendStatus.style.color = '#666'; }
// //   } else {
// //     resendBtn.disabled = false;
// //     resendBtn.textContent = 'Resend verification email';
// //     if (resendStatus) { resendStatus.textContent = ''; }
// //   }
// // }

// // function showResendUI(emailValue) {
// //   if (!resendWrap) return;
// //   resendWrap.style.display = '';
// //   if (resendBtn) resendBtn.dataset.email = emailValue || '';
// //   updateResendUi();
// // }

// // if (regForm) {
// //   regForm.addEventListener("submit", async (e) => {
// //     e.preventDefault();
// //     const username = document.getElementById("username").value.trim();
// //     const email = document.getElementById("email").value.trim();
// //     const password = document.getElementById("password").value;
// //     const msgEl = document.getElementById("msg");
// //     msgEl.style.color = ''; msgEl.textContent = 'Registering...';

// //     try {
// //       const res = await fetch(`${API_BASE}/signup`, {
// //         method: "POST",
// //         headers: { "Content-Type": "application/json" },
// //         body: JSON.stringify({ username, email, password })
// //       });

// //       const raw = await res.text();
// //       let data = {};
// //       try { data = raw ? JSON.parse(raw) : {}; } catch (err) { console.warn('Non-JSON response', raw); }

// //       if (res.ok) {
// //         msgEl.style.color = "green";
// //         msgEl.textContent = data.message || "Registered. Please check your email.";
// //         // ===== FIXED: correct function name =====
// //         showResendUI(email);
// //       } else {
// //         msgEl.style.color = "red";
// //         msgEl.textContent = data.error || `Registration failed (${res.status})`;
// //         if (res.status === 409 && /email/i.test(data.error || '')) {
// //           showResendUI(email);
// //         }
// //       }
// //     } catch (err) {
// //       console.error('Signup handler error', err);
// //       const msgEl = document.getElementById("msg");
// //       if (msgEl) {
// //         msgEl.style.color = "red";
// //         msgEl.textContent = err.message?.includes('Failed to fetch') ?
// //           "Network error — check backend is running and CORS allows this origin." :
// //           (err.message || "Network error");
// //       }
// //     }
// //   });
// // }

// // if (resendBtn) {
// //   resendBtn.addEventListener('click', async () => {
// //     const email = resendBtn.dataset.email || document.getElementById('email')?.value?.trim();
// //     if (!email) {
// //       if (resendStatus) { resendStatus.textContent = 'Please enter your email first.'; resendStatus.style.color = 'crimson'; }
// //       return;
// //     }

// //     const simpleEmailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
// //     if (!simpleEmailRegex.test(email)) {
// //       if (resendStatus) { resendStatus.textContent = 'Invalid email address.'; resendStatus.style.color = 'crimson'; }
// //       return;
// //     }

// //     try {
// //       resendBtn.disabled = true;
// //       if (resendStatus) { resendStatus.textContent = 'Sending...'; resendStatus.style.color = '#333'; }

// //       const res = await fetch(`${API_BASE}/resend-verify`, {
// //         method: 'POST',
// //         headers: { 'Content-Type': 'application/json' },
// //         body: JSON.stringify({ email })
// //       });

// //       const raw = await res.text();
// //       let data = {};
// //       try { data = raw ? JSON.parse(raw) : {}; } catch (e) { console.warn('Non-JSON', raw); }

// //       if (res.ok) {
// //         if (resendStatus) { resendStatus.textContent = data.message || 'Verification email resent — check your inbox.'; resendStatus.style.color = 'green'; }
// //         startResendCooldown();
// //       } else {
// //         if (resendStatus) { resendStatus.textContent = data.error || `Failed to resend (${res.status})`; resendStatus.style.color = 'crimson'; }
// //         if (!resendCooldownTimer) resendBtn.disabled = false;
// //       }
// //     } catch (err) {
// //       console.error('Resend error', err);
// //       if (resendStatus) { resendStatus.textContent = 'Network error while resending.'; resendStatus.style.color = 'crimson'; }
// //       if (!resendCooldownTimer) resendBtn.disabled = false;
// //     }
// //   });
// // }



// // const logForm = document.getElementById("loginForm");
// // if (logForm) {
// //   logForm.addEventListener("submit", async (e) => {
// //     e.preventDefault();
// //     const email = document.getElementById("email").value.trim();
// //     const password = document.getElementById("password").value;
// //     const msgEl = document.getElementById("msg");

// //     try {
// //       const res = await fetch(`${API_BASE}/login`, {
// //         method: "POST",
// //         headers: { "Content-Type":"application/json" },
// //         body: JSON.stringify({ email, password })
// //       });
// //       const data = await res.json();
      
// //       if (res.ok && data.token && data.user) {
// //         // 🔑 Save token + full user object (with profilePicUrl if exists)
// //         localStorage.setItem("token", data.token);
// //         localStorage.setItem("user", JSON.stringify(data.user));

// //         // ✅ Redirect to home
// //         window.location = "home.html";
// //       } else {
// //         msgEl.style.color = "red";
// //         msgEl.textContent = data.error || "Login failed";
// //       }
// //     } catch (err) {
// //       msgEl.style.color = "red";
// //       msgEl.textContent = "Network error";
// //     }
// //   });
// // }


// // Ensure a global API_BASE exists but DO NOT redeclare it with const/let/globally.
// // This only sets window.API_BASE if one doesn't already exist.
// window.API_BASE = window.API_BASE ||
//                  (window.APP_CONFIG && window.APP_CONFIG.API_BASE) ||
//                  'http://localhost:5000/api/auth';

// document.addEventListener('DOMContentLoaded', () => {
//   // Use a block-scoped constant so we don't clash with any other global declarations.
//   const API_BASE = window.API_BASE;

//   // DOM nodes (now safe to query because DOMContentLoaded fired)
//   const regForm = document.getElementById("registerForm");
//   const resendWrap = document.getElementById('resendWrap');
//   const resendBtn = document.getElementById('resendBtn');
//   const resendStatus = document.getElementById('resendStatus');
//   const logForm = document.getElementById("loginForm");

//   // Lightbox: if you use a lightbox plugin, initialize it here after DOM is ready.
//   // If your plugin exposes Lightbox.init(), call it; otherwise call whatever init is required.
//   // Example (uncomment if present): if (window.Lightbox) Lightbox.init();

//   const RESEND_COOLDOWN_SECS = 60;
//   let resendCooldownTimer = 0;
//   let resendIntervalId = null;

//   function startResendCooldown() {
//     resendCooldownTimer = RESEND_COOLDOWN_SECS;
//     updateResendUi();
//     if (resendIntervalId) clearInterval(resendIntervalId);
//     resendIntervalId = setInterval(() => {
//       resendCooldownTimer -= 1;
//       updateResendUi();
//       if (resendCooldownTimer <= 0) {
//         clearInterval(resendIntervalId);
//         resendIntervalId = null;
//       }
//     }, 1000);
//   }

//   function updateResendUi() {
//     if (!resendBtn) return;
//     if (resendCooldownTimer > 0) {
//       resendBtn.disabled = true;
//       resendBtn.textContent = `Resend (${resendCooldownTimer}s)`;
//       if (resendStatus) { resendStatus.textContent = 'Please wait before resending.'; resendStatus.style.color = '#666'; }
//     } else {
//       resendBtn.disabled = false;
//       resendBtn.textContent = 'Resend verification email';
//       if (resendStatus) { resendStatus.textContent = ''; }
//     }
//   }

//   function showResendUI(emailValue) {
//     if (!resendWrap) return;
//     resendWrap.style.display = '';
//     if (resendBtn) resendBtn.dataset.email = emailValue || '';
//     updateResendUi();
//   }

//   // Registration handler
//   if (regForm) {
//     regForm.addEventListener("submit", async (e) => {
//       e.preventDefault();
//       const username = document.getElementById("username").value.trim();
//       const email = document.getElementById("email").value.trim();
//       const password = document.getElementById("password").value;
//       const msgEl = document.getElementById("msg");
//       if (msgEl) { msgEl.style.color = ''; msgEl.textContent = 'Registering...'; }

//       try {
//         const res = await fetch(`${API_BASE}/signup`, {
//           method: "POST",
//           headers: { "Content-Type": "application/json" },
//           body: JSON.stringify({ username, email, password })
//         });

//         const raw = await res.text();
//         let data = {};
//         try { data = raw ? JSON.parse(raw) : {}; } catch (err) { console.warn('Non-JSON response', raw); }

//         if (res.ok) {
//           if (msgEl) { msgEl.style.color = "green"; msgEl.textContent = data.message || "Registered. Please check your email."; }
//           showResendUI(email);
//         } else {
//           if (msgEl) { msgEl.style.color = "red"; msgEl.textContent = data.error || `Registration failed (${res.status})`; }
//           if (res.status === 409 && /email/i.test(data.error || '')) {
//             showResendUI(email);
//           }
//         }
//       } catch (err) {
//         console.error('Signup handler error', err);
//         const msgEl = document.getElementById("msg");
//         if (msgEl) {
//           msgEl.style.color = "red";
//           msgEl.textContent = err.message?.includes('Failed to fetch') ?
//             "Network error — check backend is running and CORS allows this origin." :
//             (err.message || "Network error");
//         }
//       }
//     });
//   }

//   // Resend button handler
//   if (resendBtn) {
//     resendBtn.addEventListener('click', async () => {
//       const email = resendBtn.dataset.email || document.getElementById('email')?.value?.trim();
//       if (!email) {
//         if (resendStatus) { resendStatus.textContent = 'Please enter your email first.'; resendStatus.style.color = 'crimson'; }
//         return;
//       }

//       const simpleEmailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
//       if (!simpleEmailRegex.test(email)) {
//         if (resendStatus) { resendStatus.textContent = 'Invalid email address.'; resendStatus.style.color = 'crimson'; }
//         return;
//       }

//       try {
//         resendBtn.disabled = true;
//         if (resendStatus) { resendStatus.textContent = 'Sending...'; resendStatus.style.color = '#333'; }

//         const res = await fetch(`${API_BASE}/resend-verify`, {
//           method: 'POST',
//           headers: { 'Content-Type': 'application/json' },
//           body: JSON.stringify({ email })
//         });

//         const raw = await res.text();
//         let data = {};
//         try { data = raw ? JSON.parse(raw) : {}; } catch (e) { console.warn('Non-JSON', raw); }

//         if (res.ok) {
//           if (resendStatus) { resendStatus.textContent = data.message || 'Verification email resent — check your inbox.'; resendStatus.style.color = 'green'; }
//           startResendCooldown();
//         } else {
//           if (resendStatus) { resendStatus.textContent = data.error || `Failed to resend (${res.status})`; resendStatus.style.color = 'crimson'; }
//           if (!resendCooldownTimer) resendBtn.disabled = false;
//         }
//       } catch (err) {
//         console.error('Resend error', err);
//         if (resendStatus) { resendStatus.textContent = 'Network error while resending.'; resendStatus.style.color = 'crimson'; }
//         if (!resendCooldownTimer) resendBtn.disabled = false;
//       }
//     });
//   }

//   // Login handler
//   if (logForm) {
//     logForm.addEventListener("submit", async (e) => {
//       e.preventDefault();
//       const email = document.getElementById("email").value.trim();
//       const password = document.getElementById("password").value;
//       const msgEl = document.getElementById("msg");

//       try {
//         const res = await fetch(`${API_BASE}/login`, {
//           method: "POST",
//           headers: { "Content-Type":"application/json" },
//           body: JSON.stringify({ email, password })
//         });
//         const data = await res.json();

//         if (res.ok && data.token && data.user) {
//           localStorage.setItem("token", data.token);
//           localStorage.setItem("user", JSON.stringify(data.user));
//           window.location = "home.html";
//         } else {
//           if (msgEl) { msgEl.style.color = "red"; msgEl.textContent = data.error || "Login failed"; }
//         }
//       } catch (err) {
//         if (msgEl) { msgEl.style.color = "red"; msgEl.textContent = "Network error"; }
//       }
//     });
//   }
// });

document.addEventListener('DOMContentLoaded', () => {
  // Always take AUTH_BASE from config.js
  const AUTH_BASE = (window.APP_CONFIG && window.APP_CONFIG.AUTH_BASE) || 'http://localhost:5000/api/auth';

  const regForm = document.getElementById("registerForm");
  const resendWrap = document.getElementById('resendWrap');
  const resendBtn = document.getElementById('resendBtn');
  const resendStatus = document.getElementById('resendStatus');
  const logForm = document.getElementById("loginForm");

  // ... keep your cooldown helpers here ...

  // Registration handler
  if (regForm) {
    regForm.addEventListener("submit", async (e) => {
      e.preventDefault();
      const username = document.getElementById("username").value.trim();
      const email = document.getElementById("email").value.trim();
      const password = document.getElementById("password").value;
      const msgEl = document.getElementById("msg");

      try {
        const res = await fetch(`${AUTH_BASE}/signup`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ username, email, password })
        });

        const data = await res.json();
        if (res.ok) {
          msgEl.style.color = "green";
          msgEl.textContent = data.message || "Registered. Please check your email.";
          showResendUI(email);
        } else {
          msgEl.style.color = "red";
          msgEl.textContent = data.error || `Registration failed (${res.status})`;
          if (res.status === 409 && /email/i.test(data.error || '')) {
            showResendUI(email);
          }
        }
      } catch (err) {
        msgEl.style.color = "red";
        msgEl.textContent = "Network error";
      }
    });
  }

  // Resend button handler
  if (resendBtn) {
    resendBtn.addEventListener('click', async () => {
      const email = resendBtn.dataset.email || document.getElementById('email')?.value?.trim();
      if (!email) return;

      try {
        const res = await fetch(`${AUTH_BASE}/resend-verify`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email })
        });
        const data = await res.json();

        if (res.ok) {
          resendStatus.textContent = data.message || 'Verification email resent — check your inbox.';
          resendStatus.style.color = 'green';
          startResendCooldown();
        } else {
          resendStatus.textContent = data.error || `Failed to resend (${res.status})`;
          resendStatus.style.color = 'crimson';
        }
      } catch (err) {
        resendStatus.textContent = 'Network error while resending.';
        resendStatus.style.color = 'crimson';
      }
    });
  }

  // Login handler
  if (logForm) {
    logForm.addEventListener("submit", async (e) => {
      e.preventDefault();
      const email = document.getElementById("email").value.trim();
      const password = document.getElementById("password").value;
      const msgEl = document.getElementById("msg");

      try {
        const res = await fetch(`${AUTH_BASE}/login`, {
          method: "POST",
          headers: { "Content-Type":"application/json" },
          body: JSON.stringify({ email, password })
        });
        const data = await res.json();

        if (res.ok && data.token && data.user) {
          localStorage.setItem("token", data.token);
          localStorage.setItem("user", JSON.stringify(data.user));
          window.location = "home.html";
        } else {
          msgEl.style.color = "red";
          msgEl.textContent = data.error || "Login failed";
        }
      } catch (err) {
        msgEl.style.color = "red";
        msgEl.textContent = "Network error";
      }
    });
  }
});

