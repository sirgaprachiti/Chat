// // // js/friends.js

// // // ---- Friend request helpers ----
// // async function fetchIncomingRequests() {
// //   const res = await fetch(`${API_BASE}/api/friends/requests`, {
// //     headers: { Authorization: `Bearer ${token}` }
// //   });
// //   if (!res.ok) return;
// //   const requests = await res.json();

// //   const container = document.getElementById('incomingRequests');
// //   if (!container) return;

// //   container.innerHTML = '';
// //   if (!requests.length) {
// //     container.textContent = 'No pending requests';
// //     return;
// //   }

// //   requests.forEach(r => {
// //     const div = document.createElement('div');
// //     div.className = 'request-item';
// //     div.innerHTML = `
// //       <span><b>${r.from.username}</b> sent you a request</span>
// //       <button class="btn btn-sm btn-success me-1">Accept</button>
// //       <button class="btn btn-sm btn-danger">Reject</button>
// //     `;
// //     const [acceptBtn, rejectBtn] = div.querySelectorAll('button');
// //     acceptBtn.onclick = () => respondRequest(r._id, 'accept', acceptBtn);
// //     rejectBtn.onclick = () => respondRequest(r._id, 'reject', rejectBtn);
// //     container.appendChild(div);
// //   });
// // }

// // async function respondRequest(requestId, action, buttonEl) {
// //   buttonEl.disabled = true;
// //   try {
// //     const res = await fetch(`${API_BASE}/api/friends/respond`, {
// //       method: 'POST',
// //       headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
// //       body: JSON.stringify({ requestId, action })
// //     });
// //     const data = await res.json();
// //     if (!res.ok) {
// //       alert(data.error || 'Failed');
// //       buttonEl.disabled = false;
// //       return;
// //     }
// //     alert(`Request ${action}ed`);
// //     fetchIncomingRequests(); // refresh list
// //   } catch (err) {
// //     console.error(err);
// //     buttonEl.disabled = false;
// //   }
// // }

// // ---------- Friend UI + Request logic (add to home.js or js/friends.js) ----------

// // cache for friends & outgoing requests
// let friendIds = new Set();
// let outgoingIdsOrEmails = new Set();

// // fetch friends (people already joined/connected)
// async function fetchFriends() {
//   try {
//     const res = await fetch(`${API_BASE}/api/friends`, {
//       headers: { Authorization: `Bearer ${token}` }
//     });
//     if (!res.ok) return [];
//     const friends = await res.json();
//     // normalize to set of ids if provided
//     friendIds = new Set((friends || []).map(f => String(f._id || f.id)));
//     return friends;
//   } catch (err) {
//     console.error('fetchFriends error', err);
//     return [];
//   }
// }

// // fetch outgoing requests (requests you've already sent)
// async function fetchOutgoingRequests() {
//   try {
//     const res = await fetch(`${API_BASE}/api/friends/outgoing`, {
//       headers: { Authorization: `Bearer ${token}` }
//     });
//     if (!res.ok) return [];
//     const outgoing = await res.json();
//     // normalize to set of ids or emails depending on response
//     outgoingIdsOrEmails = new Set((outgoing || []).map(r => String(r.toUserId || r.to || r.email || r._id)));
//     return outgoing;
//   } catch (err) {
//     console.error('fetchOutgoingRequests error', err);
//     return [];
//   }
// }

// // send friend request (either by userId or email - adapt payload to your backend)
// async function sendFriendRequest(userObj, btn) {
//   try {
//     btn.disabled = true;
//     btn.textContent = 'Sending…';

//     // Example payload by userId. If your API needs email, change to { email: userObj.email }.
//     const payload = { userId: userObj._id || userObj.id };

//     const res = await fetch(`${API_BASE}/api/friends/request`, {
//       method: 'POST',
//       headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
//       body: JSON.stringify(payload)
//     });

//     const data = await res.json().catch(()=>({}));
//     if (!res.ok) {
//       alert(data.error || 'Failed to send request');
//       btn.disabled = false;
//       btn.textContent = 'Request';
//       return;
//     }

//     // success — mark outgoing so UI updates
//     outgoingIdsOrEmails.add(String(userObj._id || userObj.email || userObj.id));
//     btn.textContent = 'Requested';
//     btn.classList.remove('btn-outline-primary');
//     btn.classList.add('btn-secondary');
//     btn.disabled = true;
//     alert('Request sent');
//   } catch (err) {
//     console.error('sendFriendRequest error', err);
//     btn.disabled = false;
//     btn.textContent = 'Request';
//     alert('Network error');
//   }
// }

// // modified loadUsers that uses friends/outgoing sets to decide which button to show
// async function loadUsers() {
//   try {
//     // fetch friends & outgoing first (parallel)
//     await Promise.all([ fetchFriends(), fetchOutgoingRequests() ]);

//     const res = await fetch(`${API_BASE}/api/auth/users`, {
//       headers: { Authorization: `Bearer ${token}` }
//     });
//     if (!res.ok) {
//       console.error('loadUsers fetch failed', res.status);
//       return;
//     }
//     const users = await res.json();
//     const ul = document.getElementById("userList");
//     if (!ul) return console.error('#userList missing');
//     ul.innerHTML = "";

//     users.forEach(u => {
//       const uid = String(u._id || u.id || '');
//       if (!uid) return;
//       // hide self
//       const currentUserId = String(user.id || user._id || '');
//       if (uid === currentUserId) return;

//       const li = document.createElement("li");
//       li.className = "list-group-item d-flex justify-content-between align-items-center";

//       const label = document.createElement('span');
//       label.innerHTML = escapeHtml(u.username || u.name || u.email || 'Unknown');
//       li.appendChild(label);

//       const controls = document.createElement('div');

//       // Chat button — always available (or optionally only if friend)
//       const chatBtn = document.createElement('button');
//       chatBtn.className = "btn btn-sm btn-success me-1";
//       chatBtn.textContent = "Chat";
//       chatBtn.onclick = () => startChat(u);
//       controls.appendChild(chatBtn);

//       // Decide whether to show Request button:
//       if (friendIds.has(uid)) {
//         // already joined / friend — optionally show nothing or show "Joined"
//         const joined = document.createElement('button');
//         joined.className = 'btn btn-sm btn-outline-secondary';
//         joined.textContent = 'Joined';
//         joined.disabled = true;
//         controls.appendChild(joined);
//       } else {
//         // not a friend — show Request or Requested (if outgoing)
//         const reqBtn = document.createElement('button');
//         reqBtn.className = 'btn btn-sm btn-outline-primary';
//         // prefer id check; if your outgoing set is emails adapt here
//         if (outgoingIdsOrEmails.has(uid) || outgoingIdsOrEmails.has(String(u.email || ''))) {
//           reqBtn.textContent = 'Requested';
//           reqBtn.className = 'btn btn-sm btn-secondary';
//           reqBtn.disabled = true;
//         } else {
//           reqBtn.textContent = 'Request';
//           reqBtn.onclick = () => sendFriendRequest(u, reqBtn);
//         }
//         controls.appendChild(reqBtn);
//       }

//       li.appendChild(controls);
//       ul.appendChild(li);
//     });

//   } catch (err) {
//     console.error("Failed to load users or friends", err);
//   }
// }
