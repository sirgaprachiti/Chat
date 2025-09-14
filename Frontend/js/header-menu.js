/* ---------- Three-dots menu + select/delete messages logic ---------- */

(function () {
  const threeDotsBtn = document.getElementById('threeDotsBtn');
  const dropdown = document.getElementById('threeDotsDropdown');
  const menuLogout = document.getElementById('menuLogout');
  const menuCloseChat = document.getElementById('menuCloseChat');
  const menuDeleteChat = document.getElementById('menuDeleteChat');
  const menuSelectMessages = document.getElementById('menuSelectMessages');

  const selectToolbar = document.getElementById('selectToolbar');
  const deleteSelectedBtn = document.getElementById('deleteSelectedBtn');
  const cancelSelectBtn = document.getElementById('cancelSelectBtn');

  let selectMode = false; // whether selection mode is active

  // toggle dropdown
  function toggleDropdown(show) {
    if (typeof show === 'undefined') show = dropdown.style.display === 'none';
    dropdown.style.display = show ? 'block' : 'none';
    threeDotsBtn.setAttribute('aria-expanded', show ? 'true' : 'false');
  }

  // close dropdown on outside click
  document.addEventListener('click', (e) => {
    if (!threeDotsBtn.contains(e.target) && !dropdown.contains(e.target)) toggleDropdown(false);
  });

  threeDotsBtn.addEventListener('click', (e) => {
    e.stopPropagation();
    toggleDropdown();
  });

  // Logout handler
  menuLogout.addEventListener('click', () => {
    localStorage.clear();
    window.location = 'index.html';
  });

  // Close chat: simply clear currentChatUser and UI
  menuCloseChat.addEventListener('click', () => {
    if (!currentChatUser) { alert('No chat selected'); toggleDropdown(false); return; }
    try { socket.emit('leave', { userId: user.id, peerId: currentChatUser._id }); } catch(e){}
    currentChatUser = null;
    document.getElementById('chatWith').textContent = 'Select a user to chat';
    document.getElementById('chatBox').innerHTML = '';
    toggleDropdown(false);
    if (selectMode) toggleSelectMode(false);
  });

  // Delete chat: remove all messages for currentChatUser (local + API)
  menuDeleteChat.addEventListener('click', async () => {
    if (!currentChatUser) { alert('No chat selected'); toggleDropdown(false); return; }
    if (!confirm(`Delete entire chat with ${currentChatUser.username}? This cannot be undone.`)) { toggleDropdown(false); return; }

    // Local UI cleanup
    document.getElementById('chatBox').innerHTML = '';
    // Optional: call backend to delete conversation
    try {
      const res = await fetch(`${API_BASE}/api/chat/delete/${currentChatUser._id}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' }
      });
      if (!res.ok) console.warn('Delete chat API responded with', res.status);
    } catch (err) {
      console.warn('delete chat request failed', err);
    }

    toggleDropdown(false);
    currentChatUser = null;
    document.getElementById('chatWith').textContent = 'Select a user to chat';
    if (selectMode) toggleSelectMode(false);
  });

  // Select messages toggles checkbox mode
  menuSelectMessages.addEventListener('click', () => {
    if (!currentChatUser) { alert('No chat selected'); toggleDropdown(false); return; }
    toggleSelectMode(!selectMode);
    toggleDropdown(false);
  });

  // Cancel select
  cancelSelectBtn.addEventListener('click', () => toggleSelectMode(false));

  // Delete selected message IDs
  deleteSelectedBtn.addEventListener('click', async () => {
    const checked = Array.from(document.querySelectorAll('.msg-checkbox:checked'))
      .map(cb => cb.dataset.msgId)
      .filter(Boolean);

    if (!checked.length) return alert('No messages selected');

    if (!confirm(`Delete ${checked.length} selected message(s)?`)) return;

    // Remove from UI
    checked.forEach(id => {
      const row = document.querySelector(`.msg-wrapper[data-msg-id="${id}"]`);
      if (row) row.remove();
    });

    // Optionally call backend API to delete messages in bulk
    try {
      await fetch(`${API_BASE}/api/chat/messages/delete`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ messageIds: checked })
      });
    } catch (err) {
      console.warn('bulk delete request failed', err);
    }

    // If no messages remain, leave select mode
    if (!document.querySelector('.msg-wrapper')) toggleSelectMode(false);
  });

  // toggles select mode UI & adds/removes checkboxes
  // function toggleSelectMode(enable) {
  //   selectMode = !!enable;

  //   const chatBox = document.getElementById('chatBox');
  //   if (selectMode) {
  //     selectToolbar.style.display = 'flex';
  //     chatBox.classList.add('select-mode');

  //     // for each message bubble, insert checkbox if not present
  //     Array.from(chatBox.querySelectorAll('.msg-wrapper')).forEach(wrapper => {
  //       insertCheckboxIfNeeded(wrapper);
  //     });
  //   } else {
  //     selectToolbar.style.display = 'none';
  //     chatBox.classList.remove('select-mode');
  //     Array.from(chatBox.querySelectorAll('.msg-checkbox')).forEach(cb => cb.closest('.checkbox-container').replaceWith(cb.closest('.checkbox-container').nextSibling || document.createTextNode('')));
  //     Array.from(chatBox.querySelectorAll('.msg-wrapper')).forEach(wrapper => {
  //       const cbCont = wrapper.querySelector('.checkbox-container');
  //       if (cbCont) cbCont.remove();
  //       wrapper.classList.remove('selectable');
  //       wrapper.removeAttribute('data-selected');
  //     });
  //   }
  // }
function toggleSelectMode(enable) {
  selectMode = !!enable;
  const chatBox = document.getElementById('chatBox');

  if (selectMode) {
    selectToolbar.style.display = 'flex';
    chatBox.classList.add('select-mode');

    // insert checkboxes
    Array.from(chatBox.querySelectorAll('.msg-wrapper')).forEach(wrapper => {
      wrapper.classList.add('selectable');
      insertCheckboxIfNeeded(wrapper);
    });
  } else {
    selectToolbar.style.display = 'none';
    chatBox.classList.remove('select-mode');

    Array.from(chatBox.querySelectorAll('.msg-wrapper')).forEach(wrapper => {
      const cbCont = wrapper.querySelector('.checkbox-container');
      if (cbCont) cbCont.remove();
      wrapper.classList.remove('selectable');
      wrapper.removeAttribute('data-selected');
    });
  }
}

  // insert checkbox at a message wrapper (if not present)
  function insertCheckboxIfNeeded(wrapper) {
    if (!wrapper || wrapper.querySelector('.msg-checkbox')) return;
    const bubble = wrapper.querySelector('.msg-bubble');
    if (!bubble) return;

    const container = document.createElement('span');
    container.className = 'checkbox-container';

    const cb = document.createElement('input');
    cb.type = 'checkbox';
    cb.className = 'msg-checkbox';
    const msgId = wrapper.dataset.msgId || wrapper.getAttribute('data-msg-id') || '';
    cb.dataset.msgId = msgId;

    cb.addEventListener('change', () => {
      if (cb.checked) wrapper.setAttribute('data-selected', '1');
      else wrapper.removeAttribute('data-selected');
    });

    wrapper.insertBefore(container, bubble);
    container.appendChild(cb);
    container.appendChild(bubble);
  }

  /* ------------------ Override appendMessage to support selection checkboxes ------------------ */
  const origAppend = window.appendMessage || null;

  window.appendMessage = async function (m) {
    const box = document.getElementById('chatBox');
    const wrapper = document.createElement('div');

    const msgId = m._id || m.id || m.messageId || `tmp-${Date.now()}-${Math.random().toString(36).slice(2,8)}`;
    wrapper.className = 'msg-wrapper ' + (String(m.senderId) === String(user.id) ? 'msg-right' : 'msg-left');
    wrapper.setAttribute('data-msg-id', msgId);

    const isMe = String(m.senderId) === String(user.id);
    const bubble = document.createElement('div');
    bubble.className = 'msg-bubble ' + (isMe ? 'msg-sent' : 'msg-recv');

    if (m.text) {
      const p = document.createElement('div');
      p.textContent = m.text;
      bubble.appendChild(p);
    }

    const imageId = m.imageId || (m.image && (m.image._id || m.image.id)) || m.image;
    if (imageId) {
      await renderFileInBubble(bubble, imageId);
    }

    wrapper.appendChild(bubble);

    if (selectMode) {
      insertCheckboxIfNeeded(wrapper);
    }

    box.appendChild(wrapper);
    scrollChatToBottom();
  };

  toggleDropdown(false);

})();

// async function saveProfile(e) {
//     e.preventDefault();
//     saveBtn.disabled = true;
//     saveBtn.textContent = 'Saving...';

//     try {
//       const formData = new FormData();
//       formData.append('name', nameInput.value.trim());
//       formData.append('about', aboutInput.value.trim());
//       if (imageInput.files[0]) formData.append('image', imageInput.files[0]);

//       const res = await fetch(`${API_BASE}/profile`, {
//         method: 'POST',
//         headers: {
//           Authorization: `Bearer ${localStorage.getItem('token')}`
//         },
//         body: formData
//       });

//       const data = await res.json();
//       if (!res.ok) throw new Error(data.error || 'Failed to save profile');

//       // ✅ Save to localStorage
//       localStorage.setItem('user', JSON.stringify(data.user));

//       // ✅ Update popup fields and navbar/profile section
//       renderProfilePopup(data.user);
//       updateNavbarProfile(data.user);

//       // ✅ Close modal
//       closeProfileModal();

//     } catch (err) {
//       console.error('Save profile error', err);
//       alert('Error saving profile: ' + err.message);
//     } finally {
//       saveBtn.disabled = false;
//       saveBtn.textContent = 'Save';
//     }
//   }

//   profileForm.addEventListener('submit', saveProfile);

//   function renderProfilePopup(user) {
//     if (!user) return;
//     nameInput.value = user.username || '';
//     aboutInput.value = user.about || '';
//     emailInput.value = user.email || '';
//     if (user.profilePicUrl) {
//       document.getElementById('profilePreview').src = user.profilePicUrl;
//     }
//   }

//   function updateNavbarProfile(user) {
//     // Example: update profile pic/name on header if you have them
//     const navPic = document.getElementById('navProfilePic');
//     const navName = document.getElementById('navProfileName');
//     if (navPic && user.profilePicUrl) navPic.src = user.profilePicUrl;
//     if (navName && user.username) navName.textContent = user.username;
//   }

//   function closeProfileModal() {
//     // If using Bootstrap modal
//     if (typeof bootstrap !== 'undefined') {
//       const modal = bootstrap.Modal.getInstance(profileModal);
//       modal.hide();
//     } else {
//       // fallback: hide manually
//       profileModal.style.display = 'none';
//     }
//   }

//   // When opening the popup → fill with saved data
//   document.getElementById('openProfileBtn').addEventListener('click', () => {
//     const user = JSON.parse(localStorage.getItem('user') || '{}');
//     renderProfilePopup(user);
//   });

