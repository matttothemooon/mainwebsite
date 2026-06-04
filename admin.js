document.addEventListener('DOMContentLoaded', () => {
  const passwordInput = document.getElementById('admin-password');
  const contentTextarea = document.getElementById('content-json');
  const saveButton = document.getElementById('save-btn');
  const downloadButton = document.getElementById('download-btn');
  const statusEl = document.getElementById('admin-status');
  const pageSelect = document.getElementById('page-select');
  const newPageSlugInput = document.getElementById('new-page-slug');
  const newPageTitleInput = document.getElementById('new-page-title');
  const addPageButton = document.getElementById('add-page-btn');

  let currentContent = null;

  function normalizeSlug(value) {
    return value
      .toString()
      .trim()
      .toLowerCase()
      .replace(/[^a-z0-9-]/g, '-')
      .replace(/-+/g, '-')
      .replace(/^-|-$/g, '');
  }

  function buildPageOptions(content) {
    if (!pageSelect) return;
    const pages = content?.pages || {};
    const options = Object.keys(pages).map((slug) => {
      const label = pages[slug]?.title || slug;
      return `<option value="${slug}">${label} (${slug})</option>`;
    });
    pageSelect.innerHTML = '<option value="">Select a page to edit</option>' + options.join('');
  }

  function createPageTemplate(slug, title) {
    return {
      slug,
      title,
      description: 'New page created from the admin dashboard.',
      hero: {
        eyebrow: 'New page',
        headline: `New ${title} page`,
        lead: 'Update this content from the admin editor.',
      },
      contentHtml: '<section><p>Start editing this page in the content JSON. Use the page slug to open it from page.html?page=slug.</p></section>',
    };
  }

  async function loadContent() {
    try {
      const response = await fetch('/content.json', { cache: 'no-cache' });
      if (!response.ok) throw new Error('Failed to load content');
      const content = await response.json();
      currentContent = content;
      contentTextarea.value = JSON.stringify(content, null, 2);
      buildPageOptions(content);
      statusEl.textContent = 'Loaded current site content.';
    } catch (error) {
      statusEl.textContent = 'Unable to load content.json. Check the file or network.';
    }
  }

  function ensureContentShape(content) {
    if (!content || typeof content !== 'object') return 'Content must be a JSON object.';
    if (!content.site || typeof content.site !== 'object' || !Array.isArray(content.site.nav)) {
      return 'Content must include a site.nav array.';
    }
    if (!content.pages || typeof content.pages !== 'object' || Array.isArray(content.pages)) {
      return 'Content must include a pages object.';
    }
    return null;
  }

  async function saveContent() {
    const password = passwordInput.value.trim();
    const raw = contentTextarea.value.trim();

    statusEl.textContent = '';

    if (!password) {
      statusEl.textContent = 'Enter the admin password before saving.';
      return;
    }

    let parsed;
    try {
      parsed = JSON.parse(raw);
    } catch (error) {
      statusEl.textContent = 'Invalid JSON. Fix the formatting and try again.';
      return;
    }

    const validationError = ensureContentShape(parsed);
    if (validationError) {
      statusEl.textContent = validationError;
      return;
    }

    saveButton.disabled = true;
    saveButton.textContent = 'Saving...';

    try {
      const response = await fetch('/api/save-content', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password, content: JSON.stringify(parsed, null, 2) }),
      });

      const result = await response.json();
      if (!response.ok) {
        throw new Error(result.error || 'Save failed');
      }
      currentContent = parsed;
      buildPageOptions(parsed);
      statusEl.textContent = 'Content saved successfully.';
    } catch (error) {
      statusEl.textContent = `Save failed: ${error.message}`;
    } finally {
      saveButton.disabled = false;
      saveButton.textContent = 'Save content';
    }
  }

  function downloadContent() {
    const blob = new Blob([contentTextarea.value], { type: 'application/json' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = 'content.json';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }

  function addPageFromTemplate() {
    if (!currentContent) {
      statusEl.textContent = 'Load current content first.';
      return;
    }

    const slug = normalizeSlug(newPageSlugInput.value);
    if (!slug) {
      statusEl.textContent = 'Enter a valid page slug.';
      return;
    }

    if (currentContent.pages?.[slug]) {
      statusEl.textContent = `A page with slug "${slug}" already exists.`;
      return;
    }

    const title = newPageTitleInput.value.trim() || slug.replace(/-/g, ' ').replace(/\b\w/g, (char) => char.toUpperCase());
    currentContent.pages = currentContent.pages || {};
    currentContent.pages[slug] = createPageTemplate(slug, title);
    currentContent.site = currentContent.site || { nav: [] };
    currentContent.site.nav.push({ label: title, href: `page.html?page=${slug}`, slug });
    contentTextarea.value = JSON.stringify(currentContent, null, 2);
    buildPageOptions(currentContent);
    statusEl.textContent = `Added new page template for "${slug}".`;
  }

  saveButton.addEventListener('click', saveContent);
  downloadButton.addEventListener('click', downloadContent);
  if (addPageButton) addPageButton.addEventListener('click', addPageFromTemplate);

  loadContent();
});
