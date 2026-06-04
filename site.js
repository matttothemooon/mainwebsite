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
});
