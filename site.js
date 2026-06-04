document.addEventListener('DOMContentLoaded', () => {
  const burger = document.getElementById('burger');
  const drawer = document.getElementById('drawer');
  const navLinksContainer = document.querySelector('.nav-links');
  const drawerLinksContainer = document.getElementById('drawer');

  function toggleDrawer() {
    if (!drawer || !burger) return;
    const isOpen = drawer.classList.toggle('open');
    burger.classList.toggle('open', isOpen);
    burger.setAttribute('aria-expanded', isOpen ? 'true' : 'false');
  }

  if (burger && drawer) {
    burger.addEventListener('click', toggleDrawer);
    drawer.addEventListener('click', (event) => {
      const target = event.target.closest('a');
      if (!target) return;
      drawer.classList.remove('open');
      burger.classList.remove('open');
      burger.setAttribute('aria-expanded', 'false');
    });
  }

  function normalizeSlug(slug) {
    if (!slug) return 'home';
    return slug.toString().trim().toLowerCase().replace(/[^a-z0-9-]/g, '-').replace(/-+/g, '-').replace(/^-|-$/g, '') || 'home';
  }

  function detectPageSlug() {
    const bodyPage = document.body.dataset.page;
    if (bodyPage === 'dynamic') {
      const params = new URLSearchParams(window.location.search);
      return normalizeSlug(params.get('page') || 'home');
    }
    if (bodyPage) {
      return normalizeSlug(bodyPage);
    }

    const path = window.location.pathname.split('/').pop();
    if (!path || path === 'index.html') return 'home';
    return normalizeSlug(path.replace(/\.html$/, '')) || 'home';
  }

  function setMeta(title, description) {
    if (title) document.title = title;
    const metaDescription = document.querySelector('meta[name="description"]');
    if (metaDescription && description) metaDescription.content = description;
  }

  function setActiveLink(currentSlug) {
    const links = document.querySelectorAll('.nav-links a, #drawer a');
    links.forEach((link) => {
      const slug = link.dataset.slug;
      if (slug === currentSlug) {
        link.classList.add('active');
      } else {
        link.classList.remove('active');
      }
    });
  }

  function renderNav(items, currentSlug) {
    if (!Array.isArray(items)) return;
    const navHtml = items.map((item) => `
      <li><a href="${item.href}" data-slug="${item.slug}">${item.label}</a></li>
    `).join('');

    if (navLinksContainer) navLinksContainer.innerHTML = navHtml;
    if (drawerLinksContainer) drawerLinksContainer.innerHTML = items.map((item) => `
      <a href="${item.href}" data-slug="${item.slug}">${item.label}</a>
    `).join('');

    setActiveLink(currentSlug);
  }

  async function fetchSiteContent() {
    try {
      const response = await fetch('/content.json', { cache: 'no-cache' });
      if (!response.ok) throw new Error('Failed to load content');
      return await response.json();
    } catch (error) {
      console.warn('Content load failed:', error);
      return null;
    }
  }

  function renderFeatureCards(cards) {
    const container = document.getElementById('featured-grid');
    if (!container || !Array.isArray(cards)) return;
    container.innerHTML = cards.map((card) => `
      <article class="feature-card">
        <h3>${card.title}</h3>
        <p>${card.description}</p>
      </article>
    `).join('');
  }

  function renderAboutItems(items) {
    const container = document.getElementById('about-grid');
    if (!container || !Array.isArray(items)) return;
    container.innerHTML = items.map((item) => `
      <div class="about-item">
        <span class="about-key">${item.key}</span>
        <span class="about-val">${item.value}</span>
      </div>
    `).join('');
  }

  function renderLinkItems(items) {
    const container = document.getElementById('link-list');
    if (!container || !Array.isArray(items)) return;
    container.innerHTML = items.map((item) => `
      <a class="link-item" href="${item.href}" target="_blank">
        <div>
          <div>${item.label}</div>
          <div class="link-sub">${item.sub}</div>
        </div>
        <span class="link-arrow">→</span>
      </a>
    `).join('');
  }

  function renderHome(content) {
    if (!content) return;
    setMeta(content.title, content.description);

    const pageContainer = document.getElementById('page-content');
    if (!pageContainer) return;

    pageContainer.innerHTML = `
      <section class="intro">
        <h1>${content.hero.headline || ''}</h1>
        <p>${content.hero.subline || ''}</p>
        <div class="intro-actions">
          <a class="btn btn-primary" id="hero-primary" href="${content.hero.ctaPrimary?.href || '#'}">${content.hero.ctaPrimary?.text || ''}</a>
          <a class="btn" id="hero-secondary" href="${content.hero.ctaSecondary?.href || '#'}">${content.hero.ctaSecondary?.text || ''}</a>
        </div>
      </section>
      <section>
        <div class="section-label">featured work</div>
        <div class="featured-grid" id="featured-grid"></div>
      </section>
      <section>
        <div class="section-label">about</div>
        <div class="about-grid" id="about-grid"></div>
      </section>
      <section>
        <div class="section-label">links</div>
        <div class="link-list" id="link-list"></div>
      </section>
    `;

    renderFeatureCards(content.featuredWork);
    renderAboutItems(content.aboutItems);
    renderLinkItems(content.links);
  }

  function renderPage(page) {
    if (!page) return;
    setMeta(page.title, page.description);

    const pageContainer = document.getElementById('page-content');
    if (!pageContainer) return;

    const headlineHtml = page.hero ? `
      <div class="eyebrow">${page.hero.eyebrow || ''}</div>
      <h1>${page.hero.headline || ''}</h1>
      <p class="lead">${page.hero.lead || ''}</p>
    ` : '';

    pageContainer.innerHTML = `
      <section>
        ${headlineHtml}
      </section>
      ${page.contentHtml || ''}
    `;
  }

  function renderNotFound() {
    const pageContainer = document.getElementById('page-content');
    if (!pageContainer) return;
    pageContainer.innerHTML = `
      <section>
        <div class="eyebrow">Not found</div>
        <h1>Page not found</h1>
        <p class="lead">This page doesn’t exist yet. Create it from the admin dashboard.</p>
      </section>
    `;
  }

  async function loadSiteContent() {
    const content = await fetchSiteContent();
    const currentSlug = detectPageSlug();

    if (content?.site?.nav) {
      renderNav(content.site.nav, currentSlug);
    }

    if (currentSlug === 'home') {
      renderHome(content?.pages?.home);
    } else {
      const page = content?.pages?.[currentSlug];
      if (page) {
        renderPage(page);
      } else {
        renderNotFound();
      }
    }
  }

  loadSiteContent();

  const DISCORD_ID = '436300903927119873';

  async function loadLanyard() {
    const statusDots = document.querySelectorAll('.status-dot');
    const statusLabel = document.querySelector('.status-label');
    const statusText = document.getElementById('status-text');
    const npEl = document.getElementById('now-playing');
    const npTrack = document.getElementById('np-track');
    const npArtist = document.getElementById('np-artist');

    if (!statusDots.length) return;

    try {
      const response = await fetch(`https://api.lanyard.rest/v1/users/${DISCORD_ID}`);
      const json = await response.json();
      const data = json.data;

      const statusColors = { online: '#4ecdc4', idle: '#f0c040', dnd: '#e05252', offline: 'var(--muted)' };
      const statusLabels = { online: 'Online', idle: 'Idle', dnd: 'Do not disturb', offline: 'Offline' };
      const discordStatus = data.discord_status || 'offline';
      const color = statusColors[discordStatus] || statusColors.offline;
      const label = statusLabels[discordStatus] || statusLabels.offline;

      statusDots.forEach((dot) => {
        dot.classList.remove('online', 'idle', 'dnd', 'offline');
        dot.classList.add(discordStatus);
        dot.style.background = color;
        dot.style.boxShadow = discordStatus === 'offline' ? 'none' : `0 0 6px ${color}`;
        dot.style.animation = discordStatus === 'offline' ? 'none' : 'pulse 2s infinite';
      });

      if (statusLabel) statusLabel.textContent = label;
      if (statusText) statusText.textContent = discordStatus === 'offline' ? 'offline' : discordStatus;

      if (data.spotify && npEl && npTrack && npArtist) {
        const sp = data.spotify;
        npTrack.textContent = sp.song;
        npArtist.textContent = sp.artist;
        npEl.classList.add('playing');
        if (statusText) statusText.textContent = `listening to ${sp.song} by ${sp.artist}`;
      } else if (npEl && npTrack && npArtist) {
        npTrack.textContent = 'not playing anything';
        npArtist.textContent = '';
        npEl.classList.remove('playing');
      }
    } catch (error) {
      if (statusText) statusText.textContent = 'offline';
      if (statusLabel) statusLabel.textContent = 'Offline';
      if (npEl && npTrack) {
        npTrack.textContent = 'unavailable';
      }
    }
  }

  if (document.querySelector('.status-dot')) {
    loadLanyard();
    setInterval(loadLanyard, 30000);
  }
});
