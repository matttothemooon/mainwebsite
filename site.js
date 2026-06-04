document.addEventListener('DOMContentLoaded', () => {
  const burger = document.getElementById('burger');
  const drawer = document.getElementById('drawer');
  const drawerLinks = drawer ? drawer.querySelectorAll('a') : [];
  const navLinks = document.querySelectorAll('.nav-links a');
  const path = window.location.pathname.replace(/\/index\.html$/, '/').replace(/\/$/, '');

  function setActiveLink() {
    const current = window.location.pathname.split('/').pop() || 'index.html';
    navLinks.forEach((link) => {
      const href = link.getAttribute('href');
      if (href === current || (href === 'index.html' && current === '')) {
        link.classList.add('active');
      } else {
        link.classList.remove('active');
      }
    });
    drawerLinks.forEach((link) => {
      const href = link.getAttribute('href');
      if (href === current || (href === 'index.html' && current === '')) {
        link.classList.add('active');
      } else {
        link.classList.remove('active');
      }
    });
  }

  function toggleDrawer() {
    if (!drawer || !burger) return;
    const isOpen = drawer.classList.toggle('open');
    burger.classList.toggle('open', isOpen);
    burger.setAttribute('aria-expanded', isOpen ? 'true' : 'false');
  }

  if (burger && drawer) {
    burger.addEventListener('click', toggleDrawer);
    drawerLinks.forEach((link) => link.addEventListener('click', () => {
      drawer.classList.remove('open');
      burger.classList.remove('open');
      burger.setAttribute('aria-expanded', 'false');
    }));
  }

  setActiveLink();

  const contactForm = document.getElementById('contact-form');
  if (contactForm) {
    const formspreeId = contactForm.dataset.formspreeId || 'YOUR_FORM_ID';
    const submitButton = document.getElementById('sbtn');
    const successNote = document.getElementById('fsuccess');
    const errorNote = document.getElementById('ferror');

    contactForm.addEventListener('submit', async (event) => {
      event.preventDefault();
      successNote.style.display = 'none';
      errorNote.style.display = 'none';
      submitButton.disabled = true;
      submitButton.textContent = 'Sending...';

      if (!formspreeId || formspreeId === 'YOUR_FORM_ID') {
        errorNote.textContent = 'Contact form not configured yet. Message me directly on Discord or email.';
        errorNote.style.display = 'block';
        submitButton.disabled = false;
        submitButton.textContent = 'Send Message';
        return;
      }

      try {
        const response = await fetch(`https://formspree.io/f/${formspreeId}`, {
          method: 'POST',
          headers: { 'Accept': 'application/json' },
          body: new FormData(contactForm),
        });
        if (response.ok) {
          successNote.style.display = 'block';
          contactForm.reset();
          submitButton.textContent = 'Sent ✓';
        } else {
          throw new Error('Failed to send');
        }
      } catch (error) {
        errorNote.textContent = 'Something went wrong. Reach out directly via Discord or email.';
        errorNote.style.display = 'block';
        submitButton.disabled = false;
        submitButton.textContent = 'Send Message';
      }
    });
  }

  const DISCORD_ID = '436300903927119873';

  async function loadLanyard() {
    const statusDot = document.querySelector('.status-dot');
    const statusText = document.getElementById('status-text');
    const npEl = document.getElementById('now-playing');
    const npTrack = document.getElementById('np-track');
    const npArtist = document.getElementById('np-artist');

    if (!statusDot || !statusText || !npEl || !npTrack || !npArtist) return;

    try {
      const response = await fetch(`https://api.lanyard.rest/v1/users/${DISCORD_ID}`);
      const json = await response.json();
      const data = json.data;

      const statusColors = { online: '#4ecdc4', idle: '#f0c040', dnd: '#e05252', offline: 'var(--muted)' };
      const discordStatus = data.discord_status || 'offline';
      statusDot.style.background = statusColors[discordStatus];
      statusDot.style.boxShadow = discordStatus === 'offline' ? 'none' : `0 0 6px ${statusColors[discordStatus]}`;
      statusDot.style.animation = discordStatus === 'offline' ? 'none' : 'pulse 2s infinite';

      if (data.spotify) {
        const sp = data.spotify;
        npTrack.textContent = sp.song;
        npArtist.textContent = sp.artist;
        npEl.classList.add('playing');
        statusText.textContent = `listening to ${sp.song} by ${sp.artist}`;
      } else {
        npTrack.textContent = 'not playing anything';
        npArtist.textContent = '';
        npEl.classList.remove('playing');
        statusText.textContent = discordStatus === 'offline' ? 'offline' : discordStatus;
      }
    } catch (error) {
      npTrack.textContent = 'unavailable';
      statusText.textContent = 'offline';
    }
  }

  if (document.querySelector('.status-dot')) {
    loadLanyard();
    setInterval(loadLanyard, 30000);
  }
});
