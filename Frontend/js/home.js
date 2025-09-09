// js/home.js
const API_BASE = "http://localhost:5000";
const token = localStorage.getItem("token");
const user = JSON.parse(localStorage.getItem("user") || "null");

if (!token || !user) {
  window.location = "index.html";
}
renderUserAvatar("meLabel", user);


// document.getElementById("meLabel").textContent = user.username || "You";
document.getElementById("logoutBtn").onclick = () => { localStorage.clear(); window.location="index.html"; };

const socket = io(API_BASE, { auth: { token } }); // optional token auth for socket
let currentChatUser = null;

// When socket connects
socket.on("connect", () => {
  console.log("socket connected", socket.id);
  // Optionally notify server about user id -> server can map socket id -> user id
  socket.emit("user:online", { userId: user.id });
});

// Incoming message event
socket.on("message:receive", (msg) => {
  // If message is for current chat or from current chat, append
  if (!currentChatUser) return;
  if ((msg.senderId === currentChatUser._id && msg.receiverId === user.id) ||
      (msg.receiverId === currentChatUser._id && msg.senderId === user.id)) {
    appendMessage(msg);
  } else {
    // You can also show notification or badge for other chats
    // (left as exercise)
  }
});

// fetch and render all users
async function loadUsers() {
  try {
    const res = await fetch(`${API_BASE}/api/auth/users`, {
      headers: { Authorization: `Bearer ${token}` }
    });
    const users = await res.json();
    const ul = document.getElementById("userList");
    ul.innerHTML = "";
    users.forEach(u => {
      if (u._id === user.id) return; // don't show self
      const li = document.createElement("li");
      li.className = "list-group-item d-flex justify-content-between align-items-center";
      li.innerHTML = `<span>${escapeHtml(u.username)}</span>`;
      const btn = document.createElement("button");
      btn.className = "btn btn-sm btn-success";
      btn.textContent = "Chat";
      btn.onclick = () => startChat(u);
      li.appendChild(btn);
      ul.appendChild(li);
    });
  } catch (err) {
    console.error("Failed to load users", err);
  }
}

async function startChat(u) {
  currentChatUser = u;
  document.getElementById("chatWith").textContent = `Chat with ${u.username}`;
  document.getElementById("chatBox").innerHTML = "";
  await loadMessages(u._id);
  // Optionally tell server which room to join:
  socket.emit("join", { userId: user.id, peerId: u._id });
}

// load conversation with selected user
async function loadMessages(peerId) {
  try {
    const res = await fetch(`${API_BASE}/api/chat/${peerId}`, {
      headers: { Authorization: `Bearer ${token}` }
    });
    const messages = await res.json();
    messages.forEach(m => appendMessage(m));
    scrollChatToBottom();
  } catch (err) {
    console.error("Failed to load messages", err);
  }
}

// // append message element (handles text & images)
// function appendMessage(m) {
//   const box = document.getElementById("chatBox");
//   const wrapper = document.createElement("div");
//   const isMe = m.senderId === user.id;
//   wrapper.className = isMe ? "msg-right" : "msg-left";

//   const bubble = document.createElement("div");
//   bubble.className = "msg-bubble " + (isMe ? "msg-sent" : "msg-recv");
//   // text
//   if (m.text) {
//     const p = document.createElement("div");
//     p.textContent = m.text;
//     bubble.appendChild(p);
//   }
//   // image
//   if (m.imageId) {
//     const img = document.createElement("img");
//     img.className = "chat-image";
//     img.src = `${API_BASE}/api/chat/image/${m.imageId}`; // backend should stream GridFS file
//     img.alt = "image";
//     bubble.appendChild(img);
//   }

//   wrapper.appendChild(bubble);
//   box.appendChild(wrapper);
//   scrollChatToBottom();
// }

// // append message element (handles text & images)
// function appendMessage(m) {
//   const box = document.getElementById("chatBox");
//   const wrapper = document.createElement("div");

//   // handle ObjectId vs string comparison safely
//   const isMe = String(m.senderId) === String(user.id);
//   wrapper.className = isMe ? "msg-right" : "msg-left";

//   const bubble = document.createElement("div");
//   bubble.className = "msg-bubble " + (isMe ? "msg-sent" : "msg-recv");

//   // text
//   if (m.text) {
//     const p = document.createElement("div");
//     p.textContent = m.text;
//     bubble.appendChild(p);
//   }

//   // image — support several possible field names and ensure correct URL
//   const imageId = m.imageId || (m.image && (m.image._id || m.image.id)) || m.image;
//   if (imageId) {
//     const img = document.createElement("img");
//     img.className = "chat-image";
//     // IMPORTANT: if your API_BASE is "/api", do not repeat /api twice
//     // Use "/api/chat/image/:id" if frontend served from same origin
//     img.src = `${API_BASE.replace(/\/$/, "")}/api/chat/image/${imageId}`;
//     img.alt = "image";
//     img.loading = "lazy";
//     img.style.maxWidth = "220px"; // optional styling fallback
//     img.onload = () => { scrollChatToBottom(); };
//     img.onerror = () => {
//       console.warn("Failed loading image:", imageId);
//       img.remove(); // optionally remove broken image
//     };
//     bubble.appendChild(img);
//   }

//   wrapper.appendChild(bubble);
//   box.appendChild(wrapper);
//   scrollChatToBottom();
// }
async function appendMessage(m) {
  const box = document.getElementById("chatBox");
  const wrapper = document.createElement("div");
  const isMe = String(m.senderId) === String(user.id);
  wrapper.className = isMe ? "msg-right" : "msg-left";

  const bubble = document.createElement("div");
  bubble.className = "msg-bubble " + (isMe ? "msg-sent" : "msg-recv");

  // text
  if (m.text) {
    const p = document.createElement("div");
    p.textContent = m.text;
    bubble.appendChild(p);
  }

  // file (image/document) handling
  const imageId = m.imageId || (m.image && (m.image._id || m.image.id)) || m.image;
  if (imageId) {
    // call the async renderer (it will append image/iframe/link to bubble)
    await renderFileInBubble(bubble, imageId);
  }

  wrapper.appendChild(bubble);
  box.appendChild(wrapper);
  scrollChatToBottom();
}


function scrollChatToBottom() {
  const box = document.getElementById("chatBox");
  box.scrollTop = box.scrollHeight + 100;
}

// Fetch a protected GridFS file and return { blob, contentType }
// API_BASE should be set to your API base, e.g. "/api"
async function fetchProtectedFile(imageId) {
  const url = `${API_BASE.replace(/\/$/, "")}/api/chat/image/${imageId}`;
  const res = await fetch(url, {
    method: "GET",
    headers: {
      Authorization: `Bearer ${localStorage.getItem("token") || ""}`
    }
  });
  if (!res.ok) {
    throw new Error(`Failed to fetch file: ${res.status}`);
  }
  const contentType = res.headers.get("Content-Type") || "";
  const blob = await res.blob();
  return { blob, contentType };
}
// create element for a file (image/pdf/other)
async function renderFileInBubble(bubbleEl, imageId) {
  try {
    const { blob, contentType } = await fetchProtectedFile(imageId);

    // If it's an image, show inline
    if (contentType.startsWith("image/")) {
      const img = document.createElement("img");
      img.className = "chat-image";
      img.onload = () => scrollChatToBottom();
      img.src = URL.createObjectURL(blob);
img.className = "chat-image";
img.dataset.full = `${API_BASE}/api/chat/image/${imageId}`; // for lightbox re-fetch
bubbleEl.appendChild(img);

      // img.src = URL.createObjectURL(blob);
      // bubbleEl.appendChild(img);

      // revoke objectURL later to free memory
      // img.addEventListener("load", () => { URL.revokeObjectURL(img.src); }, { once: true });
      return;
    }

    // If it's a PDF (or other viewable type), embed or show link
    if (contentType === "application/pdf") {
      const iframe = document.createElement("iframe");
      iframe.style.width = "100%";
      iframe.style.height = "300px";
      iframe.src = URL.createObjectURL(blob);
      bubbleEl.appendChild(iframe);
      // revoke when iframe loads
      iframe.addEventListener("load", () => { URL.revokeObjectURL(iframe.src); }, { once: true });
      return;
    }

    // otherwise show a download link with filename fallback
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `file-${imageId}`;
    a.textContent = "Download file";
    a.className = "btn btn-sm btn-outline-secondary";
    a.onclick = () => { setTimeout(() => URL.revokeObjectURL(url), 3000); };
    bubbleEl.appendChild(a);
  } catch (err) {
    console.error("renderFileInBubble error:", err);
    const errSpan = document.createElement("div");
    errSpan.textContent = "Failed to load file";
    errSpan.style.color = "crimson";
    bubbleEl.appendChild(errSpan);
  }
}


// send text or image
document.getElementById("sendBtn").onclick = async () => {
  if (!currentChatUser) { alert("Select a user to chat"); return; }

  const input = document.getElementById("msgInput");
  const imageInput = document.getElementById("imageInput");

  
  // If image file selected -> upload image message
  if (imageInput.files && imageInput.files.length > 0) {
    const file = imageInput.files[0];
    const fd = new FormData();
    fd.append("image", file);
    fd.append("receiverId", currentChatUser._id);

    try {
      const res = await fetch(`${API_BASE}/api/chat/send-image`, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
        body: fd
      });
      const data = await res.json();
      if (res.ok) {
        // data.msg is saved message doc (should include imageId)
        socket.emit("message:send", data.msg); // notify recipient via socket
        appendMessage(data.msg);
        imageInput.value = "";
      } else {
        alert(data.error || "Image upload failed");
      }
    } catch (err) {
      console.error("Upload failed", err);
      alert("Upload error");
    }
    return;
  }

  // otherwise send text
  const text = document.getElementById("msgInput").value.trim();
  if (!text) return;

  try {
    // send to backend to save
    const res = await fetch(`${API_BASE}/api/chat/send`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
      body: JSON.stringify({ receiverId: currentChatUser._id, text })
    });
    const data = await res.json();
    if (res.ok) {
      socket.emit("message:send", data.msg || { senderId: user.id, receiverId: currentChatUser._id, text });
      appendMessage(data.msg || { senderId: user.id, receiverId: currentChatUser._id, text });
      document.getElementById("msgInput").value = "";
    } else {
      alert(data.error || "Send failed");
    }
  } catch (err) {
    console.error("send error", err);
  }
};
// small helper — escape text for safety
function escapeHtml(str) {
  if (!str) return "";
  return str.replace(/[&<>"']/g, (m) => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m]));
}


(function() {
  // safety: ensure required DOM exists, else create lightbox
  function ensureLightboxDOM() {
    if (document.getElementById("chatLightbox")) return;
    const div = document.createElement("div");
    div.id = "chatLightbox";
    div.className = "chat-lightbox";
    div.setAttribute("aria-hidden", "true");
    div.style.display = "none";
    div.innerHTML = `
      <div class="lb-inner" role="dialog" aria-modal="true">
        <button class="lb-close" id="lbClose" aria-label="Close">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M18 6L6 18M6 6l12 12"></path>
          </svg>
        </button>
        <img class="lb-image" id="lbImage" src="" alt="Preview" />
      </div>
      <div class="lb-caption" id="lbCaption"></div>
    `;
    document.body.appendChild(div);
  }

  // main setup function
  function setupLightbox() {
    ensureLightboxDOM();

    const lb = document.getElementById("chatLightbox");
    const lbImage = document.getElementById("lbImage");
    const lbCaption = document.getElementById("lbCaption");
    const lbClose = document.getElementById("lbClose");
    const chatBox = document.getElementById("chatBox");

    if (!lb || !lbImage || !lbClose || !chatBox) {
      console.error("Lightbox init failed: missing DOM nodes", { lb, lbImage, lbClose, chatBox });
      return;
    }

    let currentObjectUrl = null;

    // open with src or blob
    function openLightbox({ src, blob, caption }) {
      // debug
      console.log("openLightbox called", { src, blob, caption });

      // clean previous
      if (currentObjectUrl) { URL.revokeObjectURL(currentObjectUrl); currentObjectUrl = null; }

      // set up onload to force sizing
      lbImage.onload = () => {
        lbImage.style.width = "auto";
        lbImage.style.height = "auto";
        lbImage.style.maxWidth = "95vw";
        lbImage.style.maxHeight = "95vh";
      };

      lbImage.onerror = () => {
        console.warn("Lightbox image failed to load", src);
        // show placeholder message
        lbImage.style.display = "none";
        lbCaption.textContent = "Failed to load preview";
      };

      // set image source
      lbImage.style.display = ""; // ensure visible
      if (blob) {
        currentObjectUrl = URL.createObjectURL(blob);
        lbImage.src = currentObjectUrl;
      } else if (src) {
        lbImage.src = src;
      } else {
        console.warn("openLightbox called with no src/blob");
        return;
      }

      lbCaption.textContent = caption || "";
      lb.style.display = "flex";
      lb.classList.add("open");
      lb.setAttribute("aria-hidden", "false");
      // focus close for accessibility
      lbClose.focus();
    }
    

    function closeLightbox() {
      lb.classList.remove("open");
      lb.setAttribute("aria-hidden", "true");
      lb.style.display = "none";
      try { lbImage.src = ""; } catch {}
      if (currentObjectUrl) { URL.revokeObjectURL(currentObjectUrl); currentObjectUrl = null; }
    }

    // event handlers (attach once)
    lbClose.addEventListener("click", (e) => {
      e.stopPropagation();
      closeLightbox();
    });

    // click outside image to close
    lb.addEventListener("click", (e) => {
      if (e.target === lb) closeLightbox();
    });

    // ESC to close
    document.addEventListener("keydown", (e) => {
      if (e.key === "Escape" && lb.classList.contains("open")) closeLightbox();
    });

    // delegated click on chat images
    chatBox.addEventListener("click", async (e) => {
      const img = e.target.closest && e.target.closest("img.chat-image");
      if (!img) return;
      e.preventDefault();

      // if object URL already, open directly
      if (img.src && img.src.startsWith("blob:")) {
        openLightbox({ src: img.src, caption: img.alt || "" });
        return;
      }

      // prefer data-full if set (full res)
      const full = img.dataset && img.dataset.full ? img.dataset.full : img.src;
      if (!full) {
        console.warn("No full src available for image", img);
        return;
      }

      // if route likely protected (contains /api/), fetch with token
      try {
        const needsAuth = String(full).includes("/api/");
        if (needsAuth) {
          const token = localStorage.getItem("token");
          const headers = {};
          if (token) headers.Authorization = `Bearer ${token}`;
          const res = await fetch(full, { headers });
          if (!res.ok) {
            console.warn("Protected image fetch failed", res.status);
            // fallback: attempt open with direct src
            openLightbox({ src: img.src, caption: img.alt || "" });
            return;
          }
          const blob = await res.blob();
          openLightbox({ blob, caption: img.alt || "" });
        } else {
          openLightbox({ src: full, caption: img.alt || "" });
        }
      } catch (err) {
        console.error("Error fetching full image for lightbox", err);
        openLightbox({ src: img.src, caption: img.alt || "" });
      }
    });

    console.log("Lightbox initialized");
  }

  // initialize after small timeout to ensure DOM ready and scripts loaded
  // (if home.js is loaded at end of body this still runs fine)
  setTimeout(setupLightbox, 50);
})();



function renderUserAvatar(containerId, user) {
  const el = document.getElementById(containerId);
  if (!el) return;
  el.innerHTML = ''; // clear old content

  // if user has a profilePicUrl, show it (falls back to error handler)
  if (user && user.profilePicUrl && user.profilePicUrl.trim() !== '') {
    const img = document.createElement('img');
    img.src = user.profilePicUrl;
    img.alt = user.username || 'Avatar';
    img.className = 'avatar-img';
    img.onerror = () => { img.src = ''; renderDefaultSvg(el); }; // fallback to svg if image fails
    el.appendChild(img);
    return;
  }

  // otherwise show default SVG avatar
  renderDefaultSvg(el);
}
// ---- Profile modal logic ----
(function() {
  const profileModalEl = document.getElementById('profileModal');
  if (!profileModalEl) return; // if modal not present skip

  // bootstrap modal instance (requires bootstrap js) - safe no-op if bootstrap missing
  let bsModal = null;
  try { bsModal = new bootstrap.Modal(profileModalEl); } catch(e){ bsModal = null; }

  const avatarContainer = document.getElementById('meLabel'); // header avatar container
  const preview = document.getElementById('profileAvatarPreview');
  const inputFile = document.getElementById('profileImageInput');
  const nameInput = document.getElementById('profileName');
  const aboutInput = document.getElementById('profileAbout');
  const emailInput = document.getElementById('profileEmail');
  const saveBtn = document.getElementById('profileSaveBtn');

// show preview: either dataUrl or external URL, falls back to svg if missing
  function showPreview(container, url) {
    container.innerHTML = '';
    if (url) {
      const img = document.createElement('img');
      img.src = url;
      img.alt = 'Avatar';
      img.style.cursor = 'pointer';
      // useful for the lightbox if you want to re-fetch full-resolution from server later
      img.dataset.full = url;

      // When clicked open the same lightbox used by chat images.
      img.addEventListener('click', (e) => {
        e.preventDefault();
        // call global openLightbox if available; otherwise fallback to setting up a quick preview
        if (typeof window.openLightbox === 'function') {
          // prefer blob/data urls for immediate preview, otherwise pass the URL
          if (img.src && (img.src.startsWith('blob:') || img.src.startsWith('data:'))) {
            window.openLightbox({ src: img.src, caption: `${user?.username || ''}` });
          } else {
            // if the image is served from your backend and needs auth, openLightbox will refetch it.
            window.openLightbox({ src: img.dataset.full || img.src, caption: `${user?.username || ''}` });
          }
        } else {
          // fallback simple modal: open in a new tab
          window.open(img.src, '_blank');
        }
      }, { passive: false });

      // fallbacks
      img.onload = () => {};
      img.onerror = () => { renderDefaultSvg(container); };

      container.appendChild(img);
    } else {
      renderDefaultSvg(container);
    }
  }

  // // populate modal fields from global `user`
  // function openProfileModal() {
  //   // ensure user exists
  //   if (!window.user) return alert('User not loaded');

  //   // name & about
  //   nameInput.value = user.username || '';
  //   aboutInput.value = user.about || '';

  //   // email read-only
  //   emailInput.value = user.email || '';

  //   // show profile pic if available
  //   const url = user.profilePicUrl && user.profilePicUrl.trim() !== '' ? user.profilePicUrl : null;
  //   showPreview(preview, url);

  //   // reset file input
  //   inputFile.value = '';

  //   // open bootstrap modal if available, otherwise toggle by setting class
  //   if (bsModal) bsModal.show();
  //   else profileModalEl.classList.add('show'), profileModalEl.style.display = 'block';
  // }
function openProfileModal() {
  if (!user) return alert('User not loaded');

  nameInput.value = user.username || '';
  aboutInput.value = user.about || '';
  emailInput.value = user.email || '';
  showPreview(preview, user.profilePicUrl && user.profilePicUrl.trim() ? user.profilePicUrl : null);
  inputFile.value = '';

  if (bsModal) bsModal.show();
  else { profileModalEl.classList.add('show'); profileModalEl.style.display = 'block'; }
}

const closeBtn = profileModalEl.querySelector('.btn-close');
closeBtn.addEventListener('click', () => {
  profileModalEl.classList.remove('show');
  profileModalEl.style.display = 'none';
});

  // wire clicking the header avatar to open profile
  if (avatarContainer) {
    avatarContainer.style.cursor = 'pointer';
    avatarContainer.addEventListener('click', openProfileModal);
  }

  // file -> preview (read as data URL)
  let lastSelectedDataUrl = null;
  inputFile.addEventListener('change', (ev) => {
    const f = ev.target.files && ev.target.files[0];
    if (!f) return;
    const fr = new FileReader();
    fr.onload = () => {
      lastSelectedDataUrl = fr.result; // store data URL to save later
      showPreview(preview, lastSelectedDataUrl);
    };
    fr.onerror = () => { alert('Failed to read file'); };
    fr.readAsDataURL(f);
  });

  // Save changes -> update global user & localStorage & UI
  // saveBtn.addEventListener('click', async () => {
  //   // validate name (optional)
  //   const newName = nameInput.value.trim();
  //   if (!newName) return alert('Name cannot be empty');

  //   // update fields (you may want to send to backend here)
  //   user.username = newName;
  //   user.about = aboutInput.value.trim();

  //   // if new image chosen, set profilePicUrl to data URL (you could send file to server instead)
  //   if (lastSelectedDataUrl) {
  //     user.profilePicUrl = lastSelectedDataUrl;
  //   }

  //   // persist locally and update header avatar
  //   try {
  //     localStorage.setItem('user', JSON.stringify(user));
  //   } catch (e) { console.warn('localStorage set failed', e); }

  //   // update avatar in header using existing renderUserAvatar function
  //   try {
  //     renderUserAvatar('meLabel', user);
  //   } catch (e) {
  //     // fallback: directly update preview
  //     showPreview(document.getElementById('meLabel'), user.profilePicUrl);
  //   }

  //   // optionally update username label elsewhere on page (if present)
  //   const meLabelText = document.getElementById('meText');
  //   if (meLabelText) meLabelText.textContent = user.username;

  //   // close modal
  //   if (bsModal) bsModal.hide();
  //   else profileModalEl.classList.remove('show'), profileModalEl.style.display = 'none';

  //   // reset lastSelectedDataUrl
  //   lastSelectedDataUrl = null;
  // });
  // Save changes -> upload to server, update localStorage & UI
if (saveBtn) {
  saveBtn.addEventListener('click', async () => {
    const nameEl = document.getElementById('profileName');
    const aboutEl = document.getElementById('profileAbout');
    const fileInput = document.getElementById('profileImageInput');

    const newName = (nameEl?.value || '').trim();
    if (!newName) return alert('Name cannot be empty');

    // Build FormData with text fields + optional file
    const fd = new FormData();
    fd.append('name', newName);
    fd.append('about', (aboutEl?.value || '').trim());
    if (fileInput && fileInput.files && fileInput.files[0]) {
      fd.append('image', fileInput.files[0]);
    }

    // UI feedback
    saveBtn.disabled = true;
    const prevText = saveBtn.textContent;
    saveBtn.textContent = 'Saving...';

    try {
      const res = await fetch(`${API_BASE.replace(/\/$/, "")}/api/auth/profile`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}` // IMPORTANT: do NOT set Content-Type
        },
        body: fd
      });

      const data = await res.json().catch(()=>({}));
      if (!res.ok) {
        console.error('Profile update failed', data);
        alert(data.error || 'Profile update failed');
        return;
      }

      // server returns { user: { ... } }
      const updatedUser = data.user || data;
      if (!updatedUser) {
        alert('Invalid server response');
        return;
      }

      // persist locally and update global user
      localStorage.setItem('user', JSON.stringify(updatedUser));
      window.user = updatedUser;

      // update header avatar and username UI
      try { renderUserAvatar('meLabel', updatedUser); } catch (e) { console.warn(e); }
      const meText = document.getElementById('meText');
      if (meText) meText.textContent = updatedUser.username || '';

      // close modal (bootstrap-aware)
      const profileModalEl = document.getElementById('profileModal');
      if (typeof bootstrap !== 'undefined' && profileModalEl) {
        try { bootstrap.Modal.getInstance(profileModalEl)?.hide(); } catch(e){ profileModalEl.classList.remove('show'); profileModalEl.style.display='none'; }
      } else if (profileModalEl) {
        profileModalEl.classList.remove('show');
        profileModalEl.style.display = 'none';
      }

      // clear file input & temp preview state
      if (fileInput) fileInput.value = '';
      lastSelectedDataUrl = null;
    } catch (err) {
      console.error('Profile save error', err);
      alert('Failed to save profile (network error)');
    } finally {
      saveBtn.disabled = false;
      saveBtn.textContent = prevText || 'Save';
    }
  });
}


  // If modal closed via bootstrap, cleanup temp state
  profileModalEl.addEventListener('hidden.bs.modal', () => { lastSelectedDataUrl = null; });

  // initial small preview in case avatar exists already
  showPreview(preview, user && user.profilePicUrl ? user.profilePicUrl : null);
})();

function renderDefaultSvg(container) {
  container.innerHTML = `
    <svg viewBox="0 0 24 24" width="40" height="40" aria-hidden="true" focusable="false" class="default-avatar-svg">
      <circle cx="12" cy="12" r="12" fill="#757575"/>
      <g transform="translate(0,0)" fill="#ffffff">
        <path d="M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4z"/>
        <path d="M12 14c-3.33 0-10 1.67-10 5v1h20v-1c0-3.33-6.67-5-10-5z"/>
      </g>
    </svg>
  `;
}

loadUsers();
/* Robust chat image lightbox — paste at end of home.js and remove previous lightbox code */

(function() {
  // elements
  const lb = document.getElementById('chatLightbox');
  const lbImage = document.getElementById('lbImage');
  const lbCaption = document.getElementById('lbCaption');
  const lbClose = document.getElementById('lbClose');
  const lbSpinner = document.getElementById('lbSpinner');
  const chatBox = document.getElementById('chatBox');

  if (!lb || !lbImage || !lbClose || !chatBox) {
    console.warn('Lightbox: missing DOM nodes, skipping init');
    return;
  }

  let currentObjectUrl = null;

  function openLightbox({ src, blob, caption }) {
    // clean previous
    if (currentObjectUrl) { URL.revokeObjectURL(currentObjectUrl); currentObjectUrl = null; }
    lbCaption.style.display = 'none';
    lbImage.style.display = 'none';
    lbSpinner.style.display = 'block';
    lb.classList.add('open');
    lb.style.display = 'flex';
    lb.setAttribute('aria-hidden', 'false');

    // helper to finish open with src
    const setImageSrc = (imgSrc) => {
      lbImage.onload = () => {
        lbSpinner.style.display = 'none';
        lbImage.style.display = 'block';
      };
      lbImage.onerror = () => {
        lbSpinner.style.display = 'none';
        lbImage.style.display = 'none';
        lbCaption.textContent = 'Failed to load preview';
        lbCaption.style.display = 'block';
      };
      lbImage.src = imgSrc;
      if (caption) { lbCaption.textContent = caption; lbCaption.style.display = 'block'; }
    };

    if (blob) {
      currentObjectUrl = URL.createObjectURL(blob);
      setImageSrc(currentObjectUrl);
      return;
    }
    if (!src) {
      lbSpinner.style.display = 'none';
      lbCaption.textContent = 'No image';
      lbCaption.style.display = 'block';
      return;
    }

    // if src is a data: or blob:, open directly
    if (src.startsWith('blob:') || src.startsWith('data:') || src.startsWith('http') && !src.includes('/api/')) {
      setImageSrc(src);
      return;
    }

    // if src points to /api/ (protected), fetch as blob with Authorization header
    (async () => {
      try {
        const headers = {};
        const t = localStorage.getItem('token');
        if (t) headers.Authorization = `Bearer ${t}`;

        const res = await fetch(src, { headers });
        if (!res.ok) {
          // fallback to src directly
          setImageSrc(src);
          return;
        }
        const fetchedBlob = await res.blob();
        currentObjectUrl = URL.createObjectURL(fetchedBlob);
        setImageSrc(currentObjectUrl);
      } catch (err) {
        console.warn('lightbox fetch error', err);
        setImageSrc(src);
      }
    })();
  }

  function closeLightbox() {
    lb.classList.remove('open');
    lb.setAttribute('aria-hidden', 'true');
    lb.style.display = 'none';
    lbImage.src = '';
    if (currentObjectUrl) { URL.revokeObjectURL(currentObjectUrl); currentObjectUrl = null; }
    lbCaption.textContent = '';
    lbCaption.style.display = 'none';
    lbSpinner.style.display = 'none';
  }

  // close handlers
  lbClose.addEventListener('click', (e) => { e.stopPropagation(); closeLightbox(); });
  lb.addEventListener('click', (e) => { if (e.target === lb) closeLightbox(); });
  document.addEventListener('keydown', (e) => { if (e.key === 'Escape' && lb.classList.contains('open')) closeLightbox(); });

  // Delegate clicks on images inside chatBox
  chatBox.addEventListener('click', async (e) => {
    const img = e.target.closest && e.target.closest('img.chat-image');
    if (!img) return;
    e.preventDefault();

    // Prefer a full-size data attribute if present
    const full = img.dataset && img.dataset.full ? img.dataset.full : img.src;

    // If img.src is an object URL or data: open directly
    if (full && (full.startsWith('blob:') || full.startsWith('data:'))) {
      openLightbox({ src: full, caption: img.alt || '' });
      return;
    }

    // If src is same-origin public URL (not /api) open directly
    if (full && !String(full).includes('/api/')) {
      openLightbox({ src: full, caption: img.alt || '' });
      return;
    }

    // Otherwise (likely protected /api/ route) fetch with Authorization
    openLightbox({ src: full, caption: img.alt || '' });
  });

  console.log('Robust Lightbox initialized');
})();
