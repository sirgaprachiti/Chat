
// (function () {
//   // ----- CONFIG -----
//   const API_PROFILE_URL = 'http://localhost:5000/api/auth/profile'; // change host if needed
//   const token = localStorage.getItem('token'); // JWT

//   // Element references (must match your HTML IDs)
//   const profileModalEl = document.getElementById('profileModal');
//   const profileImageInput = document.getElementById('profileImageInput');
//   const profileAvatarPreview = document.getElementById('profileAvatarPreview');
//   const profileNameInput = document.getElementById('profileName');
//   const profileAboutInput = document.getElementById('profileAbout');
//   const profileEmailInput = document.getElementById('profileEmail');
//   const emojiBtn = document.getElementById('emojiBtn');
//   const emojiPickerEl = document.getElementById('emojiPicker') || document.querySelector('emoji-picker');
//   const profileSaveBtn = document.getElementById('profileSaveBtn');

//   if (!profileModalEl) {
//     console.warn('Profile modal element not found. Script aborted.');
//     return;
//   }

//   // Small emoji list (extend as needed)
//   const EMOJIS = ["😀","😃","😄","😁","😆","😅","😂","🤣","😊","😍","😘","😜","🤩","😉","👍","🙏","👏","🔥","❤️"];

//   // Build picker content (works whether emojiPickerEl is <div> or custom element)
//   function buildEmojiPicker() {
//     if (!emojiPickerEl) return;
//     // If custom <emoji-picker> tag is used by other lib, don't overwrite; but we handle both:
//     if (emojiPickerEl.tagName.toLowerCase() === 'emoji-picker') {
//       // If you're using a custom web component, it might expose methods—skip building here.
//       // But if it's empty, try to populate fallback:
//       if (!emojiPickerEl.innerHTML.trim()) {
//         // create a grid inside the custom tag
//         const container = document.createElement('div');
//         container.style.display = 'grid';
//         container.style.gridTemplateColumns = 'repeat(8, 1fr)';
//         container.style.gap = '6px';
//         EMOJIS.forEach(e => {
//           const b = document.createElement('button');
//           b.type = 'button';
//           b.textContent = e;
//           b.style.border = 'none';
//           b.style.background = 'transparent';
//           b.style.fontSize = '20px';
//           b.style.cursor = 'pointer';
//           b.addEventListener('click', () => { insertAtCursor(profileAboutInput, e); profileAboutInput.focus(); });
//           container.appendChild(b);
//         });
//         emojiPickerEl.appendChild(container);
//       }
//     } else {
//       // regular div
//       emojiPickerEl.style.position = 'absolute';
//       emojiPickerEl.style.display = 'none';
//       emojiPickerEl.style.zIndex = 99999;
//       emojiPickerEl.style.background = '#fff';
//       emojiPickerEl.style.border = '1px solid #ddd';
//       emojiPickerEl.style.padding = '8px';
//       emojiPickerEl.style.borderRadius = '8px';
//       emojiPickerEl.style.boxShadow = '0 6px 18px rgba(0,0,0,0.12)';
//       emojiPickerEl.style.maxHeight = '220px';
//       emojiPickerEl.style.overflow = 'auto';
//       emojiPickerEl.style.gridTemplateColumns = 'repeat(8, 1fr)';
//       emojiPickerEl.style.display = ''; // allow CSS grid
//       emojiPickerEl.style.display = 'grid';
//       emojiPickerEl.innerHTML = ''; // reset
//       EMOJIS.forEach(e => {
//         const b = document.createElement('button');
//         b.type = 'button';
//         b.className = 'emoji';
//         b.textContent = e;
//         b.title = e;
//         b.style.border = 'none';
//         b.style.background = 'transparent';
//         b.style.fontSize = '20px';
//         b.style.padding = '6px';
//         b.style.cursor = 'pointer';
//         b.addEventListener('click', () => { insertAtCursor(profileAboutInput, e); profileAboutInput.focus(); });
//         emojiPickerEl.appendChild(b);
//       });
//       // Initially hide
//       emojiPickerEl.style.display = 'none';
//     }
//   }

//   // insert emoji at caret in textarea/input
//   function insertAtCursor(input, text) {
//     if (!input) return;
//     try {
//       const start = input.selectionStart || 0;
//       const end = input.selectionEnd || 0;
//       const value = input.value || '';
//       const newVal = value.slice(0, start) + text + value.slice(end);
//       input.value = newVal;
//       const pos = start + text.length;
//       input.selectionStart = input.selectionEnd = pos;
//       input.dispatchEvent(new Event('input', { bubbles: true }));
//     } catch (e) {
//       // fallback: append
//       input.value = (input.value || '') + text;
//     }
//   }

//   // position picker below the emoji button, keep inside viewport
//   function positionPicker() {
//     if (!emojiPickerEl) return;
//     const rect = emojiBtn.getBoundingClientRect();
//     const pickerRect = emojiPickerEl.getBoundingClientRect();
//     let top = rect.bottom + window.scrollY + 6;
//     let left = rect.left + window.scrollX;
//     // keep within viewport
//     const maxLeft = window.scrollX + window.innerWidth - pickerRect.width - 8;
//     if (left > maxLeft) left = Math.max(window.scrollX + 8, maxLeft);
//     emojiPickerEl.style.top = top + 'px';
//     emojiPickerEl.style.left = left + 'px';
//   }

//   // toggle picker visibility
//   function togglePicker() {
//     if (!emojiPickerEl) return;
//     if (emojiPickerEl.style.display === 'none' || !emojiPickerEl.style.display) {
//       buildEmojiPicker();
//       emojiPickerEl.style.display = 'grid';
//       positionPicker();
//     } else {
//       emojiPickerEl.style.display = 'none';
//     }
//   }

//   // hide picker
//   function hidePicker() {
//     if (!emojiPickerEl) return;
//     emojiPickerEl.style.display = 'none';
//   }

//   // ensure listeners are attached after modal is shown (Bootstrap reuses DOM)
//   profileModalEl.addEventListener('shown.bs.modal', () => {
//     // populate fields from server (optional): fetch /api/auth/me or use stored data
//     // quick attempt: fetch me info if endpoint exists
//     (async () => {
//       try {
//         if (!token) return;
//         const r = await fetch('/api/auth/me', { headers: { 'Authorization': 'Bearer ' + token } });
//         if (!r.ok) return;
//         const json = await r.json();
//         const user = json.user || json; // adapt endpoint shape
//         profileNameInput.value = user.username || '';
//         profileAboutInput.value = user.about || '';
//         profileEmailInput.value = user.email || '';
//         // set avatar preview
//         if (user.profilePicUrl) {
//           profileAvatarPreview.innerHTML = `<img src="${user.profilePicUrl}" alt="avatar" style="width:100%;height:100%;object-fit:cover;" />`;
//         } else {
//           profileAvatarPreview.innerHTML = `<div style="width:100%;height:100%;display:flex;align-items:center;justify-content:center;color:#999;">No image</div>`;
//         }
//       } catch (err) {
//         console.warn('Could not fetch user info', err);
//       }
//     })();

//     // attach emoji toggle (avoid duplicate listeners)
//     emojiBtn.addEventListener('click', (ev) => {
//       ev.stopPropagation();
//       togglePicker();
//     });

//     // clicking outside hides picker
//     document.addEventListener('click', (ev) => {
//       if (!emojiPickerEl) return;
//       if (ev.target === emojiBtn) return;
//       if (!emojiPickerEl.contains(ev.target)) hidePicker();
//     });

//     // reposition on scroll/resize while open
//     window.addEventListener('resize', positionPicker);
//     window.addEventListener('scroll', positionPicker, true);

//     // build picker now (but keep hidden)
//     buildEmojiPicker();
//   });

//   // also hide picker when modal hides
//   profileModalEl.addEventListener('hidden.bs.modal', () => {
//     hidePicker();
//   });

//   // preview image when user selects file
//   profileImageInput.addEventListener('change', (e) => {
//     const file = e.target.files && e.target.files[0];
//     if (!file) return;
//     const url = URL.createObjectURL(file);
//     profileAvatarPreview.innerHTML = `<img src="${url}" alt="preview" style="width:100%;height:100%;object-fit:cover;" />`;
//   });

//   // Save button handler: send multipart form to /api/auth/profile
//   profileSaveBtn.addEventListener('click', async () => {
//     try {
//       profileSaveBtn.disabled = true;
//       const form = new FormData();
//       form.append('name', profileNameInput.value || '');
//       form.append('about', profileAboutInput.value || '');
//       const file = profileImageInput.files && profileImageInput.files[0];
//       if (file) form.append('image', file);

//       const res = await fetch(API_PROFILE_URL, {
//         method: 'POST',
//         headers: token ? { 'Authorization': 'Bearer ' + token } : {},
//         body: form
//       });

//       const data = await res.json();
//       if (!res.ok) {
//         console.error('Profile save failed', data);
//         alert('Save failed: ' + (data.error || res.statusText));
//         profileSaveBtn.disabled = false;
//         return;
//       }

//       // success -> update UI locally
//       const user = data.user || data;
//       // update modal fields (ensure consistent)
//       profileNameInput.value = user.username || profileNameInput.value;
//       profileAboutInput.value = user.about || profileAboutInput.value;
//       profileEmailInput.value = user.email || profileEmailInput.value;
//       if (user.profilePicUrl) {
//         profileAvatarPreview.innerHTML = `<img src="${user.profilePicUrl}" alt="avatar" style="width:100%;height:100%;object-fit:cover;" />`;
//       }

//       // Try to update common UI elements if present:
//       // - element with id currentUsername
//       // - elements with class .current-user-name
//       // - element with id currentUserAvatar (img)
//       const unameEls = document.querySelectorAll('#currentUsername, .current-user-name');
//       unameEls.forEach(el => el.textContent = user.username || el.textContent);

//       const avatarImg = document.getElementById('currentUserAvatar');
//       if (avatarImg && user.profilePicUrl) avatarImg.src = user.profilePicUrl;

//       // Option: update contact list items that refer to this user by dataset attribute
//       document.querySelectorAll(`[data-user-id="${user._id}"] .user-name`).forEach(el => {
//         el.textContent = user.username;
//       });
//       document.querySelectorAll(`[data-user-id="${user._id}"] .user-avatar img`).forEach(img => {
//         if (user.profilePicUrl) img.src = user.profilePicUrl;
//       });

//       // Close modal (Bootstrap)
//       const modal = bootstrap.Modal.getInstance(profileModalEl);
//       if (modal) modal.hide();

//       profileSaveBtn.disabled = false;
//     } catch (err) {
//       console.error('Profile save error', err);
//       alert('Save error: ' + err.message);
//       profileSaveBtn.disabled = false;
//     }
//   });


//   // If modal is not opened via Bootstrap's JS or shown.bs.modal doesn't fire,
//   // attach listeners just in case (defensive)
//   if (!window.bootstrap) {
//     // attach basic emoji toggle
//     emojiBtn.addEventListener('click', (ev) => { ev.stopPropagation(); togglePicker(); });
//     document.addEventListener('click', (ev) => { if (!emojiPickerEl.contains(ev.target) && ev.target !== emojiBtn) hidePicker(); });
//     buildEmojiPicker();
//   }


// })();