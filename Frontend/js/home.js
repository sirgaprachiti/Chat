

// origin for HTTP API (no trailing path)
const API_BASE = (window.APP_CONFIG && window.APP_CONFIG.API_BASE) || 'http://localhost:5000';
// socket origin (used when calling io(...))
const SOCKET_BASE = (window.APP_CONFIG && window.APP_CONFIG.SOCKET_BASE) || API_BASE;
// AUTH_BASE is the REST namespace for authentication endpoints
const AUTH_BASE = (window.APP_CONFIG && window.APP_CONFIG.AUTH_BASE) || (API_BASE.replace(/\/$/, '') + '/api/auth');

const token = localStorage.getItem("token");
const user = JSON.parse(localStorage.getItem("user") || "null");
// const API_BASE = (window.APP_CONFIG && window.APP_CONFIG.API_BASE) || "http://localhost:5000/api/auth";

if (!token || !user) {
  window.location = "index.html";
}
renderUserAvatar("meLabel", user);



const SOCKET_ORIGIN = (window.APP_CONFIG && window.APP_CONFIG.SOCKET_BASE) || (window.SOCKET_BASE) || API_BASE || 'http://localhost:5000';

// create socket but don't connect yet
const socket = io(SOCKET_ORIGIN, { autoConnect: false, transports: ['polling', 'websocket'] });
window.socket = socket; // expose for debug

// attach handlers (only once)
socket.on('connect', () => {
  console.log('socket connected, id=', socket.id);
  const uid = String(user?._id ?? user?.id ?? '').trim();
  if (uid) socket.emit('user:online', { userId: uid });
});

socket.on('disconnect', (reason) => console.log('socket disconnected, reason=', reason));

// handle connect_error gracefully (auth failure or other)
socket.on('connect_error', (err) => {
  console.error('socket connect_error', err && (err.message || err));
  // If authentication failed, clear local state and redirect to login
  const msg = err && err.message ? String(err.message).toLowerCase() : '';
  if (/auth|token|unauth/i.test(msg)) {
    try { localStorage.removeItem('token'); localStorage.removeItem('user'); } catch(e){}
    alert('Session invalid or expired — please log in again.');
    window.location = 'index.html';
  }
});

socket.on('error', (err) => console.error('socket error', err));

// Now attach token and connect (we already redirected earlier if no token/user)
if (token) {
  socket.auth = { token };
  socket.connect();
} else {
  console.warn('No token available; socket will not connect. Redirecting to login.');
  // Optional: redirect already handled at top of file; keep in case.
  window.location = 'index.html';
}


// const socket = io(API_BASE, { auth: { token } }); // optional token auth for socket
let currentChatUser = null;

// ---------- DEBUG: log incoming socket events ----------
window.socket = socket; // expose for console



console.log('socket object created ->', socket);

// install onAny if available (optional debug)
if (typeof socket.onAny === 'function') {
  socket.onAny((event, ...args) => console.log('SOCKET EVENT (onAny):', event, args));
  console.log('onAny installed - now logging all incoming socket events');
}

// SINGLE connect handler (normalize id here and emit string)
socket.on('connect', () => {
  console.log('socket connected, id=', socket.id);

  // Normalize user id from user._id or user.id -> string -> trimmed
  const uid = String(user?._id ?? user?.id ?? '').trim();

  if (uid) {
    console.log('emitting user:online with userId=', uid);
    socket.emit('user:online', { userId: uid });
  } else {
    console.warn('socket connect: no user id found; not emitting user:online', user);
  }
});

// lifecycle logging (single handlers)
socket.on('disconnect', (reason) => console.log('socket disconnected, reason=', reason));
socket.on('connect_error', (err) => console.error('socket connect_error', err));
socket.on('error', (err) => console.error('socket error', err));


console.log('socket object created ->', socket);

// Try to install onAny if present
if (typeof socket.onAny === 'function') {
  socket.onAny((event, ...args) => console.log('SOCKET EVENT (onAny):', event, args));
  console.log('onAny installed - now logging all incoming socket events');
} else {
  console.warn('socket.onAny not available; attaching listeners for common event names');

  // Common event names servers often use — add others if needed
  const likelyEvents = ['message:receive', 'private_message', 'message', 'new_message', 'chat:message', 'private'];

  likelyEvents.forEach(ev => {
    // remove old debug listener to avoid duplicates
    try { socket.off(ev); } catch(e) {}
    socket.on(ev, (...args) => {
      console.log(`SOCKET EVENT (${ev}):`, args);
    });
  });
}

// general socket lifecycle logging (helpful)
socket.on('connect', () => console.log('socket connected, id=', socket.id));
socket.on('disconnect', (r) => console.log('socket disconnected, reason=', r));
socket.on('connect_error', (err) => console.error('socket connect_error', err));
socket.on('error', (err) => console.error('socket error', err));

// When socket connects
socket.on("connect", () => {
  console.log("socket connected", socket.id);
  // Optionally notify server about user id -> server can map socket id -> user id
  socket.emit("user:online", { userId: user.id });
});



// Replace your existing handler with this robust debug-friendly one
socket.off('message:receive'); // remove old listener if present
socket.on('message:receive', (msg) => {
  try {
    // keep last message handy for manual inspection from console
    window._lastSocketMessage = msg;
    console.log('message:receive raw ->', msg);

    // Try common flat fields first
    let senderId =
      msg.senderId || msg.sender || msg.from || msg.fromId || msg.from_user ||
      msg.userId || msg._id || msg.user || msg.owner || null;

    // If senderId is an object (server sometimes nests user object), try to extract ._id or .id
    if (senderId && typeof senderId === 'object') {
      senderId = senderId._id || senderId.id || senderId._id?.toString?.() || null;
    }

    // If still missing, try digging into msg.senderObject-like shapes
    if (!senderId) {
      if (msg.sender && typeof msg.sender === 'object') {
        senderId = msg.sender._id || msg.sender.id || null;
      } else if (msg.from && typeof msg.from === 'object') {
        senderId = msg.from._id || msg.from.id || null;
      } else if (msg.user && typeof msg.user === 'object') {
        senderId = msg.user._id || msg.user.id || null;
      }
    }

    senderId = senderId ? String(senderId) : '';

    // Try to match to a rendered user row by checking either the normalized id or _id
    // We created rows with dataset.userId = uid or badge id = unread_UID
    let matchedUid = '';

    // First: if badge element exists directly for this id, use it
    if (senderId && document.getElementById('unread_' + senderId)) {
      matchedUid = senderId;
    } else {
      // Otherwise attempt to find a matching backend user row we stored earlier
      // window._backendUserById should have keys equal to the normalized uid when loadUsers ran
      if (window._backendUserById) {
        // direct key match
        if (window._backendUserById[senderId]) matchedUid = senderId;
        else {
          // try to find by comparing to stored object's _id or id fields
          for (const k of Object.keys(window._backendUserById)) {
            const u = window._backendUserById[k];
            const candidateIds = [String(u.id || ''), String(u._id || ''), String(u._id?._id || '')];
            if (candidateIds.includes(String(senderId))) { matchedUid = k; break; }
          }
        }
      }

      // last resort: search DOM for something that looks similar (if user list labels include the name)
      if (!matchedUid && senderId) {
        const maybe = document.querySelector(`[data-user-id="${senderId}"]`);
        if (maybe) matchedUid = maybe.dataset.userId;
      }
    }

    console.log('normalized/extracted senderId ->', senderId, 'matchedUid ->', matchedUid);

    if (matchedUid) {
      incrementUnread(matchedUid);
    } else {
      // Not matched — show helpful debug output
      console.warn('Could not map incoming sender to any known user/badge. Inspect `window._lastSocketMessage` and `window._backendUserById`.');
      // Also print all badge ids you have for quick comparison
      const badgeIds = Array.from(document.querySelectorAll('[id^="unread_"]')).map(el => el.id.replace(/^unread_/, ''));
      console.log('existing badge ids:', badgeIds);
    }

  } catch (err) {
    console.error('message:receive handler error', err);
  }
});
// ---------- Robust notification handlers (paste after socket creation) ----------

// tiny toast UI (vanilla)
function ensureToastContainer() {
  let cont = document.getElementById('toastContainer');
  if (!cont) {
    cont = document.createElement('div');
    cont.id = 'toastContainer';
    cont.style.position = 'fixed';
    cont.style.right = '16px';
    cont.style.bottom = '16px';
    cont.style.zIndex = 2147483647;
    cont.style.maxWidth = '360px';
    document.body.appendChild(cont);
  }
  return cont;
}
function showInAppToast(title, body, onClick) {
  const container = ensureToastContainer();
  const t = document.createElement('div');
  t.className = 'toast shadow-sm';
  t.style.background = '#fff';
  t.style.borderRadius = '8px';
  t.style.padding = '10px';
  t.style.marginTop = '8px';
  t.style.cursor = 'pointer';
  t.innerHTML = `<div style="font-weight:600">${escapeHtml(title)}</div><div style="font-size:13px;color:#333">${escapeHtml(body)}</div>`;
  container.appendChild(t);
  t.addEventListener('click', () => { try { onClick && onClick(); } catch{}; t.remove(); });
  setTimeout(() => t.remove(), 6000);
}

// Desktop notification helper (asks permission on first use)
async function ensureNotificationPermission() {
  if (!('Notification' in window)) return false;
  if (Notification.permission === 'granted') return true;
  if (Notification.permission === 'denied') return false;
  try { const p = await Notification.requestPermission(); return p === 'granted'; } catch { return false; }
}

// Normalize unread:update payloads and update UI
socket.on('unread:update', (data) => {
  try {
    // Accept either shape:
    // { userId, count }  OR  { fromUserId, unreadCount } OR { fromUserId, count } OR { userId, unreadCount }
    let uid = data?.userId ?? data?.fromUserId ?? data?.from ?? data?.senderId ?? '';
    let count = data?.count ?? data?.unreadCount ?? data?.value ?? 0;
    uid = uid ? String(uid) : '';
    count = Number(count || 0);

    if (!uid) {
      console.warn('unread:update received with no user id', data);
      return;
    }

    // update our normalized store and badges
    window._unreadCounts = window._unreadCounts || {};
    window._unreadCounts[uid] = count;
    updateUnreadCount(uid, count);

  } catch (err) {
    console.error('unread:update handler error', err, data);
  }
});

// Initial aggregated counts map
socket.on('unread_counts_update', (countsObj) => {
  try {
    window._unreadCounts = window._unreadCounts || {};
    Object.keys(countsObj || {}).forEach(k => {
      window._unreadCounts[String(k)] = Number(countsObj[k] || 0);
      updateUnreadCount(String(k), Number(countsObj[k] || 0));
    });
  } catch (err) {
    console.error('unread_counts_update handler error', err);
  }
});

// High-level new-message notification (show toast + desktop)
socket.on('notification:new_message', (payload) => {
  try {
    // Expected payload from server: { type:'message', id, from, to, text, createdAt, ... }
    const fromId = String(payload?.from ?? payload?.senderId ?? '');
    const text = String(payload?.text ?? payload?.body ?? 'New message');
    const fromName = payload?.fromName ?? payload?.fromLabel ?? (window._backendUserById && window._backendUserById[fromId] && (window._backendUserById[fromId].username || window._backendUserById[fromId].name)) ?? 'New message';

    // increment unread locally (server will also send unread:update soon, but this gives immediate UI feedback)
    if (fromId) incrementUnread(fromId, 1);

    // in-app toast; clicking opens chat
    showInAppToast(fromName, text, () => {
      const backend = window._backendUserById && window._backendUserById[fromId];
      if (backend) startChat(backend);
      else openChatWithUser(fromId);
      clearUnread(fromId);
      // inform server that user opened chat (optional)
      socket.emit('messages:markRead', { userId: String(user.id || user._id), peerId: String(fromId) });
    });

    // desktop notification
    ensureNotificationPermission().then(granted => {
      if (!granted) return;
      try {
        const n = new Notification(fromName, { body: text, tag: `msg-${payload?.id || Date.now()}`, data: payload });
        n.onclick = () => {
          window.focus();
          const backend = window._backendUserById && window._backendUserById[fromId];
          if (backend) startChat(backend);
          else openChatWithUser(fromId);
          clearUnread(fromId);
          n.close();
        };
      } catch (err) { console.warn('desktop notification failed', err); }
    });

  } catch (err) {
    console.error('notification:new_message handler error', err, payload);
  }
});

/* ===== read receipt UI handler =====
   Place near other socket handlers in js/home.js
*/
(function() {
  // small helper to create/read indicator elements
  function ensureReadIndicatorElem(userId) {
    const li = document.querySelector(`[data-user-id="${userId}"]`);
    if (!li) return null;

    // Try to reuse an existing node
    let readEl = li.querySelector('.read-indicator');
    if (!readEl) {
      readEl = document.createElement('span');
      readEl.className = 'read-indicator';
      readEl.style.display = 'inline-block';
      readEl.style.marginLeft = '8px';
      readEl.style.padding = '2px 6px';
      readEl.style.borderRadius = '999px';
      readEl.style.fontSize = '12px';
      readEl.style.fontWeight = '600';
      readEl.style.verticalAlign = 'middle';
      readEl.style.background = 'transparent';
      readEl.style.color = '#6c757d';
      readEl.textContent = 'Read';
      // Place it after the name but before the unread badge if possible
      const nameWrap = li.querySelector('.user-name') || li.querySelector('span');
      if (nameWrap) nameWrap.insertAdjacentElement('afterend', readEl);
      else li.appendChild(readEl);
    }
    return readEl;
  }

  // show read indicator for a user (or clear if show=false)
  function showReadIndicator(userId, show = true) {
    const uid = String(userId);
    const readEl = ensureReadIndicatorElem(uid);
    if (!readEl) return;
    if (show) {
      readEl.style.display = '';
      // subtle color change to indicate it's recent
      readEl.style.background = 'rgba(40,167,69,0.08)'; // light green tint
      readEl.style.color = '#28a745';
      // optionally auto-hide after N seconds (so UI doesn't stay forever)
      if (readEl._hideTimer) clearTimeout(readEl._hideTimer);
      readEl._hideTimer = setTimeout(() => {
        // only auto hide if user is not currently viewing the conversation
        if (String(currentOpenUserId) !== uid && (!currentChatUser || String(currentChatUser._id || currentChatUser.id) !== uid)) {
          showReadIndicator(uid, false);
        }
      }, 6000); // 6s - tweak to taste
    } else {
      readEl.style.display = 'none';
      if (readEl._hideTimer) { clearTimeout(readEl._hideTimer); readEl._hideTimer = null; }
    }
  }

  // also optionally show "Read" in chat header when the open chat has been marked read
  function showReadInChatHeader(userId, show = true) {
    const header = document.getElementById('chatWith');
    if (!header) return;
    // append small span with id for easy clearing
    let span = document.getElementById(`chatread_${userId}`);
    if (!span) {
      span = document.createElement('span');
      span.id = `chatread_${userId}`;
      span.className = 'read-indicator chat-header-read';
      span.style.marginLeft = '10px';
      span.style.fontSize = '12px';
      span.style.fontWeight = '600';
      span.style.color = '#28a745';
      span.textContent = 'Read';
      header.appendChild(span);
    }
    span.style.display = show ? '' : 'none';
  }

  // socket event: messages read by other user / this user read other user's messages
  socket.on('messages:readBy', (payload) => {
    try {
      // payload shapes: { conversationWith: me, userId: <who-read> } or { userId, conversationWith }
      const who = String(payload?.userId ?? payload?.from ?? payload?.by ?? '');
      const convWith = String(payload?.conversationWith ?? payload?.conversationWithId ?? '');
      if (!who) return;

      // if the read event indicates they read messages you sent (so you are the conversationWith),
      // show small "Read" next to the recipient in your user list
      // If ambiguity exists, we show indicator beside 'who' (the actor)
      showReadIndicator(who, true);

      // if they read a conversation that is currently open in our UI, show it in header too
      const openId = String(currentOpenUserId || (currentChatUser && (currentChatUser._id || currentChatUser.id)) || '');
      if (openId && (openId === who || openId === convWith)) {
        showReadInChatHeader(openId, true);
        // hide it after a short time (since the header can get stale)
        setTimeout(() => showReadInChatHeader(openId, false), 5000);
      }
    } catch (err) {
      console.error('messages:readBy handler error', err, payload);
    }
  });

  // clear read indicator when opening chat with that user
  const origOpenChat = openChatWithUser;
  window.openChatWithUser = function(userId) {
    try {
      origOpenChat(userId);
    } catch(e){ console.warn(e); }
    // clear read indicator immediately when user opens chat
    showReadIndicator(userId, false);
    showReadInChatHeader(userId, false);

    // optionally notify server that we've opened the chat (you already call messages:markRead)
    try {
      const myId = String(user?.id || user?._id || '');
      if (myId && userId) {
        socket.emit('messages:markRead', { userId: myId, peerId: String(userId) });
      }
    } catch (e) {}
  };

  // also clear read indicator if a new message is received from that user (they have new activity)
  socket.on('message:receive', (msg) => {
    try {
      const from = String(msg?.from || msg?.senderId || msg?.userId || msg?.fromId || '');
      if (!from) return;
      // a new incoming message should remove the previous "Read" indicator
      showReadIndicator(from, false);
      // also hide header read for that conversation if open
      const openId = String(currentOpenUserId || (currentChatUser && (currentChatUser._id || currentChatUser.id)) || '');
      if (openId && openId === from) showReadInChatHeader(openId, false);
    } catch (err) {
      console.error('message:receive -> clear read indicator error', err);
    }
  });

  // clear all read indicators when the list is re-rendered (optional)
  const originalRenderUserList = renderUserList;
  window.renderUserList = function() {
    try {
      originalRenderUserList();
      // hide any lingering read indicators initially
      Object.keys(window._backendUserById || {}).forEach(k => showReadIndicator(k, false));
    } catch(e){ console.warn(e); }
  };
})();

window._unreadCounts = window._unreadCounts || {}; // canonical unread store

// async function loadUsers() {
//   try {
//     const res = await fetch(`${API_BASE}/api/auth/users`, {
//       headers: { Authorization: `Bearer ${token}` }
//     });
//     if (!res.ok) {
//       console.error('loadUsers fetch failed', res.status);
//       return;
//     }

//     const usersResp = await res.json();

//     // normalize ids once
//     const normalizedUsers = usersResp.map(u => {
//       const id = String(u._id ?? u.id ?? '');
//       return { ...u, id };
//     });

//     const ul = document.getElementById("userList");
//     if (!ul) return console.error('#userList missing');
//     ul.innerHTML = "";

//     // keep backend objects for startChat
//     window._backendUserById = window._backendUserById || {};

//     const meId = String(user.id ?? user._id ?? '');

//     normalizedUsers.forEach(u => {
//       const uid = u.id;
//       if (!uid) return;
//       if (uid === meId) return; // don't show self

//       window._backendUserById[uid] = u;

//       const li = document.createElement("li");
//       li.className = "list-group-item d-flex align-items-center gap-2 user-item justify-content-between";
//       li.style.cursor = "pointer";
//       li.dataset.userId = uid;

//       // left: avatar + name
//       const left = document.createElement('div');
//       left.style.display = 'flex';
//       left.style.alignItems = 'center';
//       left.style.gap = '8px';

//       const avatar = document.createElement("div");
//       avatar.className = "avatar";
//       avatar.style.width = "45px";
//       avatar.style.height = "45px";
//       avatar.style.borderRadius = "50%";
//       avatar.style.overflow = "hidden";
//       avatar.style.background = "#ddd";

//       if (u.profilePicUrl && u.profilePicUrl.trim() !== "") {
//         const img = document.createElement("img");
//         img.src = u.profilePicUrl;
//         img.alt = u.username || "User";
//         img.style.width = "100%";
//         img.style.height = "100%";
//         img.style.objectFit = "cover";
//         avatar.appendChild(img);
//       } else {
//         avatar.innerHTML = `
//           <svg viewBox="0 0 24 24" width="32" height="32" fill="#666">
//             <circle cx="12" cy="12" r="12" fill="#ccc"/>
//             <path d="M12 12c2.2 0 4-1.8 4-4s-1.8-4-4-4-4 
//                      1.8-4 4 1.8 4 4zm0 2c-3.3 0-10 1.7-10 
//                      5v1h20v-1c0-3.3-6.7-5-10-5z"/>
//           </svg>
//         `;
//       }

//       const label = document.createElement('span');
//       label.textContent = u.username || u.name || u.email || 'Unknown';

//       left.appendChild(avatar);
//       left.appendChild(label);

//       // right: unread badge (hidden by default)
//       const right = document.createElement('div');
//       right.style.display = 'flex';
//       right.style.alignItems = 'center';
//       right.style.gap = '8px';

//       const badge = document.createElement('span');
//       badge.className = 'unread-badge hidden';
//       badge.id = `unread_${uid}`;          // IMPORTANT: id used by incrementUnread()
//       badge.textContent = '0';

//       right.appendChild(badge);

//       li.appendChild(left);
//       li.appendChild(right);

//       // click handler: open chat and clear unread
//       li.onclick = () => {
//         const backendUser = window._backendUserById[uid];
//         if (backendUser) startChat(backendUser);
//         clearUnread(uid);
//       };

//       ul.appendChild(li);
//     });

//     // update summary if implemented
//     if (typeof updateUnreadChatsSummary === 'function') updateUnreadChatsSummary();

//   } catch (err) {
//     console.error("Failed to load users", err);
//   }
// }
async function loadUsers() {
  try {
    const base = (window.APP_CONFIG && (window.APP_CONFIG.AUTH_BASE || window.APP_CONFIG.API_BASE)) || (window.AUTH_BASE || API_BASE);
const url = base.replace(/\/$/, '') + '/users';
const res = await fetch(url, { headers: { Authorization: `Bearer ${token}` } });

    // // const res = await fetch(`${API_BASE}/api/auth/users`, {
    //   headers: { Authorization: `Bearer ${token}` }
    // });
    if (!res.ok) {
      console.error('loadUsers fetch failed', res.status);
      return;
    }

    const usersResp = await res.json();
    const normalizedUsers = usersResp.map(u => ({ ...u, id: String(u._id ?? u.id ?? '') }));

    const ul = document.getElementById("userList");
    if (!ul) return console.error('#userList missing');
    ul.innerHTML = "";

    window._backendUserById = window._backendUserById || {};
    const meId = String(user.id ?? user._id ?? '');

    // ensure fallback modal exists (only if openLightbox isn't available)
    ensureAvatarFallbackModal();

    normalizedUsers.forEach(u => {
      const uid = u.id;
      if (!uid) return;
      if (uid === meId) return; // don't show self

      window._backendUserById[uid] = u;

      const li = document.createElement("li");
      li.className = "list-group-item d-flex align-items-center gap-2 user-item justify-content-between";
      li.style.cursor = "pointer";
      li.dataset.userId = uid;

      // left: avatar + name
      const left = document.createElement('div');
      left.style.display = 'flex';
      left.style.alignItems = 'center';
      left.style.gap = '12px';

      const avatar = document.createElement("div");
      avatar.className = "avatar"; // uses CSS above

      // if user uploaded profile picture
      if (u.profilePicUrl && u.profilePicUrl.trim() !== "") {
        const img = document.createElement("img");
        img.src = u.profilePicUrl;
        img.alt = u.username || "User";
        img.dataset.full = u.profilePicUrl; // full-size url
        avatar.appendChild(img);

        // click -> preview
        img.addEventListener('click', (ev) => {
          ev.stopPropagation();
          previewAvatar({ type: 'img', url: img.dataset.full, caption: u.username });
        });
      } else {
        // default AccountCircle-like SVG (single circle + head/shoulders) — cleaner than concentric rings
        const svg = `
          <svg viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
            <circle cx="12" cy="12" r="12" fill="#e6e6e6"/>
            <g fill="#4a4a4a">
              <circle cx="12" cy="9" r="3.2"></circle>
              <path d="M12 14.2c-3.2 0-5.8 1.4-5.8 2.6v1.2h11.6v-1.2c0-1.2-2.6-2.6-5.8-2.6z"/>
            </g>
          </svg>
        `;
        avatar.innerHTML = svg;

        // svg click -> preview
        const svgEl = avatar.querySelector('svg');
        if (svgEl) {
          svgEl.style.cursor = 'pointer';
          svgEl.addEventListener('click', (ev) => {
            ev.stopPropagation();
            previewAvatar({ type: 'svg', svgHtml: svg, caption: u.username });
          });
        }
      }

      // const label = document.createElement('span');
      // label.textContent = u.username || u.name || u.email || 'Unknown';

      // left.appendChild(avatar);
      // left.appendChild(label);
// container for name + about stacked vertically
const nameAboutWrap = document.createElement('div');
nameAboutWrap.style.display = 'flex';
nameAboutWrap.style.flexDirection = 'column';
nameAboutWrap.style.lineHeight = '1.2';

// name line
const nameEl = document.createElement('span');
nameEl.textContent = u.username || u.name || u.email || 'Unknown';
nameEl.style.fontWeight = '500';

// about line (smaller, muted text)
if (u.about && u.about.trim() !== '') {
  const aboutEl = document.createElement('span');
  aboutEl.textContent = u.about;
  aboutEl.style.fontSize = '12px';
  aboutEl.style.color = '#6c757d'; // Bootstrap muted gray
  nameAboutWrap.appendChild(aboutEl);
}

nameAboutWrap.insertBefore(nameEl, nameAboutWrap.firstChild);

left.appendChild(avatar);
left.appendChild(nameAboutWrap);


      // right: unread badge (hidden by default)
      const right = document.createElement('div');
      right.style.display = 'flex';
      right.style.alignItems = 'center';
      right.style.gap = '8px';

      const badge = document.createElement('span');
      badge.className = 'unread-badge hidden';
      badge.id = `unread_${uid}`;
      badge.textContent = '0';

      right.appendChild(badge);

      li.appendChild(left);
      li.appendChild(right);

      // click handler: open chat and clear unread
      li.addEventListener('click', () => {
        const backendUser = window._backendUserById[uid];
        if (backendUser) startChat(backendUser);
        clearUnread(uid);
      });

      ul.appendChild(li);
    });

    if (typeof updateUnreadChatsSummary === 'function') updateUnreadChatsSummary();

  } catch (err) {
    console.error("Failed to load users", err);
  }
}


let users = [];          // populated from backend
const unreadCounts = {}; // map userId -> number
let currentOpenUserId = null; // who is currently open

const userListEl = document.getElementById('userList'); // your existing UL

// Render users from `users` array (call after fetching backend list)
function renderUserList() {
  userListEl.innerHTML = '';
  users.forEach(u => {
    // ensure unread map has an entry
    if (unreadCounts[u.id] === undefined) unreadCounts[u.id] = 0;

    const li = document.createElement('li');
    li.className = 'list-group-item d-flex justify-content-between align-items-center';
    li.dataset.userId = u.id;

    // left side: user name (can include avatar etc)
    const nameWrap = document.createElement('div');
    nameWrap.className = 'user-name';
    nameWrap.textContent = u.name;

    // right side: badge container
    const badge = document.createElement('span');
    badge.className = 'unread-badge';
    badge.id = `unread_${u.id}`;
    badge.textContent = unreadCounts[u.id] > 99 ? '99+' : unreadCounts[u.id];
    if ((unreadCounts[u.id] || 0) === 0) badge.classList.add('hidden');

    li.appendChild(nameWrap);
    li.appendChild(badge);

    // click handler: open the chat and clear unread
    li.addEventListener('click', () => {
      openChatWithUser(u.id);
    });

    userListEl.appendChild(li);
  });
}




// keep unread counts in a global map (normalize keys to strings)
window._unreadCounts = window._unreadCounts || {}; // safe global

// global unread store
window._unreadCounts = window._unreadCounts || {};

function incrementUnread(userId, amount = 1) {
  if (!userId) { console.warn('incrementUnread called without userId'); return; }
  const uid = String(userId);

  // if the chat currently open with this id, don't increment
  if (String(currentOpenUserId) === uid || (currentChatUser && String(currentChatUser._id || currentChatUser.id) === uid)) {
    return;
  }

  window._unreadCounts[uid] = (window._unreadCounts[uid] || 0) + amount;

  const badge = document.getElementById(`unread_${uid}`);
  if (badge) {
    const c = window._unreadCounts[uid];
    badge.textContent = c > 99 ? '99+' : String(c);
    badge.classList.remove('hidden');
  } else {
    console.warn('incrementUnread: badge element not found for', uid);
  }

  // update global badge if present
  if (typeof updateGlobalUnreadBadge === 'function') updateGlobalUnreadBadge();
}

function clearUnread(userId) {
  if (!userId) return;
  const uid = String(userId);
  window._unreadCounts[uid] = 0;

  const badge = document.getElementById(`unread_${uid}`);
  if (badge) {
    badge.textContent = '0';
    badge.classList.add('hidden');
  }

  if (typeof updateGlobalUnreadBadge === 'function') updateGlobalUnreadBadge();
}


// ensure summary DOM exists (creates it if missing)
function ensureUnreadSummaryDOM() {
  let header = document.querySelector('.card .card-header');
  if (!header) return null;
  let summary = document.getElementById('chatsUnreadSummary');
  if (!summary) {
    summary = document.createElement('span');
    summary.id = 'chatsUnreadSummary';
    summary.className = 'chats-unread-summary hidden';
    summary.innerHTML = `<span>Unread</span>
                         <span id="chatsUnreadCount" class="chats-unread-count">0</span>`;
    header.appendChild(summary);
  }
  return summary;
}

// compute how many chats have unread > 0 and render
function updateUnreadChatsSummary() {
  // unreadCounts is your map: { userId: count }
  const counts = window._unreadCounts || window.unreadCounts || unreadCounts || {};
  const chatsWithUnread = Object.values(counts).filter(c => Number(c) > 0).length;

  const summary = ensureUnreadSummaryDOM();
  if (!summary) return;

  const countEl = document.getElementById('chatsUnreadCount');
  if (!countEl) return;

  if (chatsWithUnread > 0) {
    countEl.textContent = chatsWithUnread > 99 ? '99+' : String(chatsWithUnread);
    summary.classList.remove('hidden');
  } else {
    countEl.textContent = '0';
    summary.classList.add('hidden');
  }
}

// call updateUnreadChatsSummary() anywhere you change unreadCounts
// (the incrementUnread/clearUnread functions below call it already)


// Example open chat function - replace with your real logic
function openChatWithUser(userId) {
  currentOpenUserId = userId;
  clearUnread(userId);
  // update chat header and load messages...
  const user = users.find(u => u.id === userId);
  document.getElementById('chatWith').textContent = user ? `Chat with ${user.name}` : 'Chat';
  // TODO: load conversation for userId (existing code)
}

// Example: initialize users (call after you fetch the user list from backend)
// function initUsersFromBackend(backendUsers) {
//   users = backendUsers;
//   users.forEach(u => unreadCounts[u.id] = unreadCounts[u.id] || 0);
//   renderUserList();
// }

function initUsersFromBackend(backendUsers) {
  users = backendUsers;
  users.forEach(u => unreadCounts[u.id] = unreadCounts[u.id] || 0);
  renderUserList();
  // sync our global store for the summary function
  window._unreadCounts = window._unreadCounts || {};
  users.forEach(u => { window._unreadCounts[String(u.id)] = window._unreadCounts[String(u.id)] || 0; });

  updateUnreadChatsSummary();
}

// Example integration with Socket.IO (replace event names with yours)
// const socket = io(); // alre


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
    // const res = await fetch(`${API_BASE}/api/chat/${peerId}`, {
    //   headers: { Authorization: `Bearer ${token}` }
    const host = (window.APP_CONFIG && window.APP_CONFIG.API_BASE) || API_BASE;
const url = host.replace(/\/$/, '') + `/api/chat/${encodeURIComponent(peerId)}`;
const res = await fetch(url, { headers: { Authorization: `Bearer ${token}` } });

    // });
    const messages = await res.json();
    messages.forEach(m => appendMessage(m));
    scrollChatToBottom();
  } catch (err) {
    console.error("Failed to load messages", err);
  }
}


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
  // const url = `${API_BASE.replace(/\/$/, "")}/api/chat/image/${imageId}`;
  // const res = await fetch(url, {
  //   method: "GET",
  //   headers: {
  //     Authorization: `Bearer ${localStorage.getItem("token") || ""}`
  //   }
  // });
  const host = (window.APP_CONFIG && window.APP_CONFIG.API_BASE) || API_BASE;
const url = host.replace(/\/$/, '') + `/api/chat/image/${encodeURIComponent(imageId)}`;

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
      // const res = await fetch(`${API_BASE}/api/chat/send-image`, {
      const host = (window.APP_CONFIG && window.APP_CONFIG.API_BASE) || API_BASE;
const url = host.replace(/\/$/, '') + '/api/chat/send-image';
const res = await fetch(url, { method:'POST', headers: { Authorization: `Bearer ${token}` }, body: fd });

      //   method: "POST",
      //   headers: { Authorization: `Bearer ${token}` },
      //   body: fd
      // });
//       const host = (window.APP_CONFIG && window.APP_CONFIG.API_BASE) || API_BASE;
// const url = host.replace(/\/$/, '') + '/api/chat/send-image';
// const res = await fetch(url, { method:'POST', headers: { Authorization: `Bearer ${token}` }, body: fd });

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
    // const res = await fetch(`${API_BASE}/api/chat/send`, {
    //   method: "POST",
    //   headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
    //   body: JSON.stringify({ receiverId: currentChatUser._id, text })
    // });
    const host = (window.APP_CONFIG && window.APP_CONFIG.API_BASE) || API_BASE;
const url = host.replace(/\/$/, '') + '/api/chat/send';
const res = await fetch(url, {
  method: 'POST',
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
// Replace existing saveBtn handler with this code (inside your profile modal IIFE)
// if (saveBtn) {
//   saveBtn.addEventListener('click', async () => {
//     const nameEl = document.getElementById('profileName');
//     const aboutEl = document.getElementById('profileAbout');
//     const fileInput = document.getElementById('profileImageInput');

//     const newName = (nameEl?.value || '').trim();
//     if (!newName) return alert('Name cannot be empty');

//     // Build FormData with text fields + optional file
//     const fd = new FormData();
//     fd.append('name', newName);
//     fd.append('about', (aboutEl?.value || '').trim());
//     if (fileInput && fileInput.files && fileInput.files[0]) {
//       fd.append('image', fileInput.files[0]);
//     }

//     // UI feedback
//     saveBtn.disabled = true;
//     const prevText = saveBtn.textContent;
//     saveBtn.textContent = 'Saving...';

//     try {
//       // Use APP_CONFIG if present, otherwise fall back to /api/auth/profile
//       const apiRoot = (window.APP_CONFIG && window.APP_CONFIG.API_BASE) ? window.APP_CONFIG.API_BASE : ("/api/auth");
//       // API_BASE in APP_CONFIG might include '/api/auth' already; ensure we remove trailing parts
//       let profileUrl = apiRoot;
//       if (!profileUrl.endsWith('/profile')) {
//         // If APP_CONFIG.API_BASE is ".../api/auth" use that + /profile, otherwise append correctly
//         profileUrl = profileUrl.replace(/\/$/, '') + '/profile';
//       }

//       const token = localStorage.getItem('token');
//       const headers = {};
//       if (token) headers.Authorization = `Bearer ${token}`;

//       const res = await fetch(profileUrl, {
//         method: 'POST',
//         headers: headers, // do NOT set Content-Type when sending FormData
//         body: fd
//       });

//       const data = await res.json().catch(()=>({}));
//       if (!res.ok) {
//         console.error('Profile update failed', data);
//         alert(data.error || data.message || 'Profile update failed');
//         return;
//       }

//       // server returns { user: { ... } } or user object directly
//       const updatedUser = data.user || data;
//       if (!updatedUser) {
//         alert('Invalid server response');
//         return;
//       }

//       // Persist locally and update global user
//       localStorage.setItem('user', JSON.stringify(updatedUser));
//       window.user = updatedUser;

//       // update header avatar and username UI
//       try { renderUserAvatar('meLabel', updatedUser); } catch (e) { console.warn(e); }
//       const meText = document.getElementById('meText');
//       if (meText) meText.textContent = updatedUser.username || '';

//       // update profile modal fields (about/name/avatar preview)
//       document.getElementById('profileName').value = updatedUser.username || '';
//       const aboutElNow = document.getElementById('profileAbout');
//       if (aboutElNow) aboutElNow.value = updatedUser.about || '';

//       // close modal (bootstrap-aware)
//       const profileModalEl = document.getElementById('profileModal');
//       if (typeof bootstrap !== 'undefined' && profileModalEl) {
//         try { bootstrap.Modal.getInstance(profileModalEl)?.hide(); } catch(e){ profileModalEl.classList.remove('show'); profileModalEl.style.display='none'; }
//       } else if (profileModalEl) {
//         profileModalEl.classList.remove('show');
//         profileModalEl.style.display = 'none';
//       }

//       // clear file input & temp preview state
//       if (fileInput) fileInput.value = '';
//       // if you used a temp dataURL preview variable, clear it too

//     } catch (err) {
//       console.error('Profile save error', err);
//       alert('Failed to save profile (network error)');
//     } finally {
//       saveBtn.disabled = false;
//       saveBtn.textContent = prevText || 'Save';
//     }
//   });
// }
// Replace your existing saveBtn handler with this block (paste inside the profile modal IIFE)
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
      // runtime-aware base: prefer APP_CONFIG.AUTH_BASE or API_BASE
      const apiRoot = (window.APP_CONFIG && (window.APP_CONFIG.AUTH_BASE || window.APP_CONFIG.API_BASE)) || API_BASE;
      // If apiRoot already ends with /api/auth use /profile, otherwise add /api/auth/profile
      let profileUrl;
      if (apiRoot.replace(/\/$/, '').endsWith('/api/auth')) {
        profileUrl = apiRoot.replace(/\/$/, '') + '/profile';
      } else if (apiRoot.includes('/api/auth')) {
        profileUrl = apiRoot.replace(/\/$/, '') + '/profile';
      } else {
        // apiRoot is likely just host (e.g. https://chat-server-8310.onrender.com)
        profileUrl = apiRoot.replace(/\/$/, '') + '/api/auth/profile';
      }

      const token = localStorage.getItem('token');
      const headers = {};
      if (token) headers.Authorization = `Bearer ${token}`;

      // IMPORTANT: do NOT set Content-Type when sending FormData
      const res = await fetch(profileUrl, {
        method: 'POST',
        headers: headers,
        body: fd
      });

      const data = await res.json().catch(()=>({}));
      if (!res.ok) {
        console.error('Profile update failed', res.status, data);
        alert(data.error || data.message || 'Profile update failed');
        return;
      }

      // server returns { user: { ... } } or user object directly
      const updatedUser = data.user || data;
      if (!updatedUser) {
        alert('Invalid server response');
        return;
      }

      // Persist locally and update global user
      localStorage.setItem('user', JSON.stringify(updatedUser));
      window.user = updatedUser;

      // update header avatar and username UI
      try { renderUserAvatar('meLabel', updatedUser); } catch (e) { console.warn(e); }
      const meText = document.getElementById('meText');
      if (meText) meText.textContent = updatedUser.username || '';

      // update profile modal fields (about/name/avatar preview)
      document.getElementById('profileName').value = updatedUser.username || '';
      const aboutElNow = document.getElementById('profileAbout');
      if (aboutElNow) aboutElNow.value = updatedUser.about || '';

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


loadUsers();/* Robust chat image lightbox — paste at end of home.js and remove previous lightbox code */

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
// prefer to reuse existing openLightbox used for chat images; otherwise show fallback modal
function previewAvatar({ type='img', url=null, svgHtml=null, caption='' } = {}) {
  // if you have global openLightbox (from chat image lightbox), prefer it
  if (typeof window.openLightbox === 'function') {
    if (type === 'svg' && svgHtml) {
      // create temporary blob/data url for svg (data:) to pass into lightbox
      const svgDataUrl = 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(svgHtml);
      window.openLightbox({ src: svgDataUrl, caption });
    } else {
      window.openLightbox({ src: url, caption });
    }
    return;
  }

  // fallback: use simple modal created below
  ensureAvatarFallbackModal();
  const inner = document.getElementById('avatarFallbackInner');
  if (!inner) return;
  if (type === 'svg' && svgHtml) inner.innerHTML = svgHtml;
  else inner.innerHTML = `<img src="${url}" alt="${caption || 'Avatar'}" />`;

  const modal = document.getElementById('avatarFallbackModal');
  modal.classList.add('open');
}

// create fallback modal DOM if missing
function ensureAvatarFallbackModal() {
  if (document.getElementById('avatarFallbackModal')) return;
  const div = document.createElement('div');
  div.id = 'avatarFallbackModal';
  div.innerHTML = `
    <button class="close" aria-label="Close">&times;</button>
    <div class="card"><div id="avatarFallbackInner"></div></div>
  `;
  document.body.appendChild(div);

  const closeBtn = div.querySelector('.close');
  const inner = document.getElementById('avatarFallbackInner');

  function close() { div.classList.remove('open'); inner.innerHTML = ''; }
  closeBtn.addEventListener('click', close);
  div.addEventListener('click', (e) => { if (e.target === div) close(); });
  document.addEventListener('keydown', (e) => { if (e.key === 'Escape' && div.classList.contains('open')) close(); });
}
