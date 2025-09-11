


// auth.js (top)
const API_BASE = (window.APP_CONFIG && window.APP_CONFIG.API_BASE) || "http://localhost:5000/api/auth";

const regForm = document.getElementById("registerForm");
const resendWrap = document.getElementById('resendWrap');
const resendBtn = document.getElementById('resendBtn');
const resendStatus = document.getElementById('resendStatus');

const RESEND_COOLDOWN_SECS = 60;
let resendCooldownTimer = 0;
let resendIntervalId = null;

function startResendCooldown() {
  resendCooldownTimer = RESEND_COOLDOWN_SECS;
  updateResendUi();
  if (resendIntervalId) clearInterval(resendIntervalId);
  resendIntervalId = setInterval(() => {
    resendCooldownTimer -= 1;
    updateResendUi();
    if (resendCooldownTimer <= 0) {
      clearInterval(resendIntervalId);
      resendIntervalId = null;
    }
  }, 1000);
}

function updateResendUi() {
  if (!resendBtn) return;
  if (resendCooldownTimer > 0) {
    resendBtn.disabled = true;
    resendBtn.textContent = `Resend (${resendCooldownTimer}s)`;
    if (resendStatus) { resendStatus.textContent = 'Please wait before resending.'; resendStatus.style.color = '#666'; }
  } else {
    resendBtn.disabled = false;
    resendBtn.textContent = 'Resend verification email';
    if (resendStatus) { resendStatus.textContent = ''; }
  }
}

function showResendUI(emailValue) {
  if (!resendWrap) return;
  resendWrap.style.display = '';
  if (resendBtn) resendBtn.dataset.email = emailValue || '';
  updateResendUi();
}

if (regForm) {
  regForm.addEventListener("submit", async (e) => {
    e.preventDefault();
    const username = document.getElementById("username").value.trim();
    const email = document.getElementById("email").value.trim();
    const password = document.getElementById("password").value;
    const msgEl = document.getElementById("msg");
    msgEl.style.color = ''; msgEl.textContent = 'Registering...';

    try {
      const res = await fetch(`${API_BASE}/signup`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username, email, password })
      });

      const raw = await res.text();
      let data = {};
      try { data = raw ? JSON.parse(raw) : {}; } catch (err) { console.warn('Non-JSON response', raw); }

      if (res.ok) {
        msgEl.style.color = "green";
        msgEl.textContent = data.message || "Registered. Please check your email.";
        // ===== FIXED: correct function name =====
        showResendUI(email);
      } else {
        msgEl.style.color = "red";
        msgEl.textContent = data.error || `Registration failed (${res.status})`;
        if (res.status === 409 && /email/i.test(data.error || '')) {
          showResendUI(email);
        }
      }
    } catch (err) {
      console.error('Signup handler error', err);
      const msgEl = document.getElementById("msg");
      if (msgEl) {
        msgEl.style.color = "red";
        msgEl.textContent = err.message?.includes('Failed to fetch') ?
          "Network error — check backend is running and CORS allows this origin." :
          (err.message || "Network error");
      }
    }
  });
}

if (resendBtn) {
  resendBtn.addEventListener('click', async () => {
    const email = resendBtn.dataset.email || document.getElementById('email')?.value?.trim();
    if (!email) {
      if (resendStatus) { resendStatus.textContent = 'Please enter your email first.'; resendStatus.style.color = 'crimson'; }
      return;
    }

    const simpleEmailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!simpleEmailRegex.test(email)) {
      if (resendStatus) { resendStatus.textContent = 'Invalid email address.'; resendStatus.style.color = 'crimson'; }
      return;
    }

    try {
      resendBtn.disabled = true;
      if (resendStatus) { resendStatus.textContent = 'Sending...'; resendStatus.style.color = '#333'; }

      const res = await fetch(`${API_BASE}/resend-verify`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email })
      });

      const raw = await res.text();
      let data = {};
      try { data = raw ? JSON.parse(raw) : {}; } catch (e) { console.warn('Non-JSON', raw); }

      if (res.ok) {
        if (resendStatus) { resendStatus.textContent = data.message || 'Verification email resent — check your inbox.'; resendStatus.style.color = 'green'; }
        startResendCooldown();
      } else {
        if (resendStatus) { resendStatus.textContent = data.error || `Failed to resend (${res.status})`; resendStatus.style.color = 'crimson'; }
        if (!resendCooldownTimer) resendBtn.disabled = false;
      }
    } catch (err) {
      console.error('Resend error', err);
      if (resendStatus) { resendStatus.textContent = 'Network error while resending.'; resendStatus.style.color = 'crimson'; }
      if (!resendCooldownTimer) resendBtn.disabled = false;
    }
  });
}


// const regForm = document.getElementById("registerForm");
// if (regForm) {
//   regForm.addEventListener("submit", async (e) => {
//     e.preventDefault();
//     const username = document.getElementById("username").value.trim();
//     const email = document.getElementById("email").value.trim();
//     const password = document.getElementById("password").value;
//     const msgEl = document.getElementById("msg");

//     try {
//       const res = await fetch(`http://localhost:5000/api/auth/signup`, {
//         method: "POST",
//         headers: { "Content-Type": "application/json" },
//         body: JSON.stringify({ username, email, password })
//       });
//       const data = await res.json();
//       if (res.ok) {
//         msgEl.style.color = "green";
//         msgEl.textContent = data.message || "Registered. Please check your email.";

//         // SHOW the Resend UI and populate it with the email
//         showResendUIFor(email);

//         // Optional: if you still want to redirect after a short delay:
//         // setTimeout(() => { window.location = "index.html"; }, 4000);
//       } else {
//         msgEl.style.color = "red";
//         msgEl.textContent = data.error || "Registration failed";
//       }
//     } catch (err) {
//       msgEl.style.color = "red";
//       msgEl.textContent = "Network error";
//     }
//   });
// }


// // assume API_BASE is "http://localhost:5000/api/auth" like earlier
// const RESEND_COOLDOWN_SECS = 60;
// let resendCooldownTimer = 0;
// let resendIntervalId = null;

// const resendWrap = document.getElementById('resendWrap');
// const resendBtn = document.getElementById('resendBtn');
// const resendStatus = document.getElementById('resendStatus');

// function startResendCooldown() {
//   resendCooldownTimer = RESEND_COOLDOWN_SECS;
//   updateResendUi();
//   resendIntervalId = setInterval(() => {
//     resendCooldownTimer -= 1;
//     updateResendUi();
//     if (resendCooldownTimer <= 0) {
//       clearInterval(resendIntervalId);
//       resendIntervalId = null;
//     }
//   }, 1000);
// }

// function updateResendUi() {
//   if (!resendBtn) return;
//   if (resendCooldownTimer > 0) {
//     resendBtn.disabled = true;
//     resendBtn.textContent = `Resend (${resendCooldownTimer}s)`;
//     resendStatus.textContent = 'Please wait before resending.';
//     resendStatus.style.color = '#666';
//   } else {
//     resendBtn.disabled = false;
//     resendBtn.textContent = 'Resend verification email';
//     resendStatus.textContent = '';
//   }
// }

// // show the resend UI after successful registration attempt (or always visible if you prefer)
// function showResendUI(emailValue) {
//   if (!resendWrap) return;
//   resendWrap.style.display = '';
//   // store last email on button element for convenience
//   resendBtn.dataset.email = emailValue || '';
//   updateResendUi();
// }

// if (resendBtn) {
//   resendBtn.addEventListener('click', async () => {
//     const email = resendBtn.dataset.email || document.getElementById('email')?.value?.trim();
//     if (!email) {
//       resendStatus.textContent = 'Please enter your email first.';
//       resendStatus.style.color = 'crimson';
//       return;
//     }

//     // quick client-side email format check
//     const simpleEmailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
//     if (!simpleEmailRegex.test(email)) {
//       resendStatus.textContent = 'Invalid email address.';
//       resendStatus.style.color = 'crimson';
//       return;
//     }

//     try {
//       resendBtn.disabled = true;
//       resendStatus.textContent = 'Sending...';
//       resendStatus.style.color = '#333';

//       const res = await fetch(`${API_BASE}/resend-verify`, {
//         method: 'POST',
//         headers: { 'Content-Type': 'application/json' },
//         body: JSON.stringify({ email })
//       });

//       const data = await res.json().catch(() => ({}));

//       if (res.ok) {
//         resendStatus.textContent = data.message || 'Verification email resent — check your inbox.';
//         resendStatus.style.color = 'green';
//         startResendCooldown();
//       } else {
//         resendStatus.textContent = data.error || 'Failed to resend verification email.';
//         resendStatus.style.color = 'crimson';
//         // if backend returns "Email already verified", consider hiding the resend UI
//         if (data.error && data.error.toLowerCase().includes('already verified')) {
//           // optionally hide UI:
//           // resendWrap.style.display = 'none';
//         }
//         // re-enable button unless cooldown is on
//         if (!resendCooldownTimer) {
//           resendBtn.disabled = false;
//         }
//       }
//     } catch (err) {
//       console.error('Resend error', err);
//       resendStatus.textContent = 'Network error while resending.';
//       resendStatus.style.color = 'crimson';
//       if (!resendCooldownTimer) resendBtn.disabled = false;
//     }
//   });
// }


const logForm = document.getElementById("loginForm");
if (logForm) {
  logForm.addEventListener("submit", async (e) => {
    e.preventDefault();
    const email = document.getElementById("email").value.trim();
    const password = document.getElementById("password").value;
    const msgEl = document.getElementById("msg");

    try {
      const res = await fetch(`${API_BASE}/login`, {
        method: "POST",
        headers: { "Content-Type":"application/json" },
        body: JSON.stringify({ email, password })
      });
      const data = await res.json();
      
      if (res.ok && data.token && data.user) {
        // 🔑 Save token + full user object (with profilePicUrl if exists)
        localStorage.setItem("token", data.token);
        localStorage.setItem("user", JSON.stringify(data.user));

        // ✅ Redirect to home
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
