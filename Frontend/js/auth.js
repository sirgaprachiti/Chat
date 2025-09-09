// // js/auth.js
// const API_BASE = "http://localhost:5000/api/auth";

// const regForm = document.getElementById("registerForm");
// if (regForm) {
//   regForm.addEventListener("submit", async (e) => {
//     e.preventDefault();
//     const username = document.getElementById("username").value.trim();
//     const email = document.getElementById("email").value.trim();
//     const password = document.getElementById("password").value;
//     const msgEl = document.getElementById("msg");

//     try {
//       const res = await fetch(`${API_BASE}/signup`, {
//         method: "POST",
//         headers: { "Content-Type": "application/json" },
//         body: JSON.stringify({ username, email, password })
//       });
//       const data = await res.json();
//       if (res.ok) {
//         msgEl.style.color = "green";
//         msgEl.textContent = data.message || "Registered. Please login.";
//         setTimeout(() => { window.location = "index.html"; }, 900);
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

// const logForm = document.getElementById("loginForm");
// if (logForm) {
//   logForm.addEventListener("submit", async (e) => {
//     e.preventDefault();
//     const email = document.getElementById("email").value.trim();
//     const password = document.getElementById("password").value;
//     const msgEl = document.getElementById("msg");

//     try {
//       const res = await fetch(`${API_BASE}/login`, {
//         method: "POST",
//         headers: { "Content-Type":"application/json" },
//         body: JSON.stringify({ email, password })
//       });
//       const data = await res.json();
//       if (res.ok && data.token) {
//         localStorage.setItem("token", data.token);
//         localStorage.setItem("user", JSON.stringify(data.user));
//         window.location = "home.html";
//       } else {
//         msgEl.style.color = "red";
//         msgEl.textContent = data.error || "Login failed";
//       }
//     } catch (err) {
//       msgEl.style.color = "red";
//       msgEl.textContent = "Network error";
//     }
//   });
// }

const API_BASE = "http://localhost:5000/api/auth";

const regForm = document.getElementById("registerForm");
if (regForm) {
  regForm.addEventListener("submit", async (e) => {
    e.preventDefault();
    const username = document.getElementById("username").value.trim();
    const email = document.getElementById("email").value.trim();
    const password = document.getElementById("password").value;
    const msgEl = document.getElementById("msg");

    try {
      const res = await fetch(`${API_BASE}/signup`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username, email, password })
      });
      const data = await res.json();
      if (res.ok) {
        msgEl.style.color = "green";
        msgEl.textContent = data.message || "Registered. Please login.";
        setTimeout(() => { window.location = "index.html"; }, 900);
      } else {
        msgEl.style.color = "red";
        msgEl.textContent = data.error || "Registration failed";
      }
    } catch (err) {
      msgEl.style.color = "red";
      msgEl.textContent = "Network error";
    }
  });
}

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
