// js/profile-emoji.js
(function () {
  // helper to insert at caret for textarea/input
  function insertAtCursor(el, text) {
    if (!el) return;
    try {
      const start = el.selectionStart ?? 0;
      const end = el.selectionEnd ?? 0;
      const val = el.value ?? '';
      el.value = val.slice(0, start) + text + val.slice(end);
      const pos = start + text.length;
      el.selectionStart = el.selectionEnd = pos;
      el.dispatchEvent(new Event('input', { bubbles: true }));
    } catch (err) {
      // fallback: append
      el.value = (el.value || '') + text;
    }
  }

  // wait until DOM ready (script will be loaded at bottom, but this is safe)
  function init() {
    const emojiBtn = document.getElementById('emojiBtn');
    const about = document.getElementById('profileAbout');

    // prefer the web-component <emoji-picker>, fallback to div#emojiPicker
    let picker = document.querySelector('emoji-picker') || document.getElementById('emojiPicker');

    if (!emojiBtn) {
      // nothing to do
      console.warn('profile-emoji: #emojiBtn not found');
      return;
    }
    if (!about) {
      console.warn('profile-emoji: #profileAbout not found');
      return;
    }
    if (!picker) {
      // create a fallback div-based picker if web component missing
      picker = document.createElement('div');
      picker.id = 'emojiPicker';
      picker.style.position = 'absolute';
      picker.style.display = 'none';
      picker.style.zIndex = 99999;
      picker.style.background = '#fff';
      picker.style.border = '1px solid #ddd';
      picker.style.padding = '8px';
      picker.style.borderRadius = '8px';
      picker.style.boxShadow = '0 6px 18px rgba(0,0,0,0.12)';
      picker.style.gridTemplateColumns = 'repeat(8,1fr)';
      picker.style.display = 'grid';
      document.body.appendChild(picker);

      // small emoji set for fallback
      const EMOJIS = ["😀","😃","😄","😁","😆","😅","😂","🤣","😊","😍","😘","😜","🤩","😉","👍","🙏","👏","🔥","❤️"];
      EMOJIS.forEach(e => {
        const b = document.createElement('button');
        b.type = 'button';
        b.textContent = e;
        b.style.fontSize = '18px';
        b.style.padding = '6px';
        b.style.border = 'none';
        b.style.background = 'transparent';
        b.style.cursor = 'pointer';
        b.addEventListener('click', () => {
          insertAtCursor(about, e);
          about.focus();
        });
        picker.appendChild(b);
      });
    }

    // If using the web component - listen for 'emoji-click'
    if (picker.tagName && picker.tagName.toLowerCase() === 'emoji-picker') {
      picker.addEventListener('emoji-click', (ev) => {
        // event.detail.unicode holds the emoji char
        const emoji = ev.detail && (ev.detail.unicode || ev.detail.emoji) ? (ev.detail.unicode || ev.detail.emoji) : (ev.detail?.name || '');
        if (emoji) insertAtCursor(about, emoji);
        about.focus();
      });
    }

    // toggle position + visibility when button clicked
    emojiBtn.addEventListener('click', (ev) => {
      ev.stopPropagation();
      // ensure picker is visible and positioned
      if (picker.style.display === 'none' || !picker.style.display) {
        // position below button
        const rect = emojiBtn.getBoundingClientRect();
        // put picker as child of body so it won't be clipped by modal overflow
        if (picker.parentElement !== document.body) document.body.appendChild(picker);
        picker.style.position = 'absolute';
        picker.style.left = Math.max(8, rect.left + window.scrollX) + 'px';
        // prefer below the button
        picker.style.top = (rect.bottom + window.scrollY + 6) + 'px';
        picker.style.display = 'block';
        picker.style.zIndex = 999999;
      } else {
        picker.style.display = 'none';
      }
    });

    // hide when clicking outside
    document.addEventListener('click', (ev) => {
      if (!picker) return;
      if (ev.target === emojiBtn) return;
      if (!picker.contains(ev.target)) picker.style.display = 'none';
    });

    // reposition on scroll/resize while visible
    window.addEventListener('resize', () => {
      if (picker && picker.style.display === 'block') {
        const rect = emojiBtn.getBoundingClientRect();
        picker.style.left = Math.max(8, rect.left + window.scrollX) + 'px';
        picker.style.top = (rect.bottom + window.scrollY + 6) + 'px';
      }
    });
    window.addEventListener('scroll', () => {
      if (picker && picker.style.display === 'block') {
        const rect = emojiBtn.getBoundingClientRect();
        picker.style.left = Math.max(8, rect.left + window.scrollX) + 'px';
        picker.style.top = (rect.bottom + window.scrollY + 6) + 'px';
      }
    }, true);

    console.log('profile-emoji initialized (picker:', picker.tagName, ')');
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
  else init();
})();
