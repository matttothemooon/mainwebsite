// lib/productImage.js
// Finds a product's picture from its product page: og:image / twitter:image,
// <link rel="image_src">, then JSON-LD "image".

// A site-wide logo is what error pages and category pages tend to offer.
const isGeneric = (url) => /logo|favicon|placeholder/i.test(url);

export function imageFromHtml(html, pageUrl) {
  const decode = (value) => value
    .replace(/&amp;/gi, "&")
    .replace(/&quot;/gi, '"')
    .replace(/&#39;|&apos;/gi, "'");
  const attribute = (tag, name) =>
    tag.match(new RegExp(`\\b${name}\\s*=\\s*(?:"([^"]*)"|'([^']*)'|([^\\s>]+))`, "i"))?.slice(1).find(Boolean);
  const resolve = (value) => {
    try {
      return new URL(decode(value), pageUrl).toString();
    } catch {
      return null;
    }
  };

  // Amazon doesn't use og:image; the main product photo is #landingImage.
  const landing = (html.match(/<img\b[^>]*\bid\s*=\s*["']landingImage["'][^>]*>/i) || [])[0];
  if (landing) {
    const image = resolve(attribute(landing, "data-old-hires") || attribute(landing, "src") || "");
    if (image) return image;
  }

  const tags = html.match(/<(?:meta|link)\b[^>]*>/gi) || [];
  for (const tag of tags) {
    const key = (attribute(tag, "property") || attribute(tag, "name") || "").toLowerCase();
    const rel = (attribute(tag, "rel") || "").toLowerCase();
    if (["og:image", "twitter:image", "twitter:image:src"].includes(key)) {
      const image = resolve(attribute(tag, "content"));
      if (image && !isGeneric(image)) return image;
    }
    if (rel.split(/\s+/).includes("image_src")) {
      const image = resolve(attribute(tag, "href"));
      if (image) return image;
    }
  }

  const scripts = html.match(/<script\b[^>]*type\s*=\s*["']application\/ld\+json["'][^>]*>[\s\S]*?<\/script>/gi) || [];
  for (const script of scripts) {
    const json = script.replace(/^.*?>|<\/script>$/gi, "").trim();
    try {
      const data = JSON.parse(json);
      const candidates = Array.isArray(data) ? data : [data, ...(data["@graph"] || [])];
      for (const candidate of candidates) {
        const image = Array.isArray(candidate?.image) ? candidate.image[0] : candidate?.image;
        const resolved = resolve(typeof image === "string" ? image : image?.url);
        if (resolved) return resolved;
      }
    } catch {
      // Ignore malformed JSON-LD and continue with other metadata.
    }
  }
  return null;
}

const PAGE_TIMEOUT_MS = 8000;
const CACHE_TTL_MS = 24 * 60 * 60 * 1000;
const FAIL_TTL_MS = 60 * 60 * 1000;
const cache = new Map(); // productUrl -> { at, value, ttl }

const isAmazon = (url) => /(^|\.)amazon\.[a-z.]+$/i.test(url.hostname);

// Search-results pages have no single product image. Amazon searches are the
// exception handled below.
function looksLikeSearch(url) {
  return /\/s$/.test(url.pathname) || url.searchParams.has("k") || url.searchParams.has("q");
}

// Model-number-looking words in a search: letters and digits, 5+ characters.
function modelTokens(query) {
  return (query || "").split(/[^a-z0-9]+/i).filter((w) => w.length >= 5 && /\d/.test(w) && /[a-z]/i.test(w));
}

// From an Amazon search page, the first result whose title contains the
// searched model number. Without a model number match we show nothing rather
// than a lookalike product.
export function imageFromAmazonSearch(html, query) {
  const tokens = modelTokens(query).map((t) => t.toLowerCase());
  if (!tokens.length) return null;
  const decode = (v) => v.replace(/&amp;/g, "&").replace(/&quot;/g, '"');
  for (const tag of html.match(/<img\b[^>]*class\s*=\s*["'][^"']*\bs-image\b[^"']*["'][^>]*>/gi) || []) {
    const alt = decode((tag.match(/\balt\s*=\s*"([^"]*)"/i) || [])[1] || "").toLowerCase();
    const src = (tag.match(/\bsrc\s*=\s*"([^"]*)"/i) || [])[1];
    if (src && tokens.some((t) => alt.includes(t))) {
      // Ask Amazon's image server for a larger rendition than the thumbnail.
      return decode(src).replace(/\._[A-Z0-9_,]+_\.(jpe?g|png|webp)$/i, "._AC_SL500_.$1");
    }
  }
  return null;
}

// Whether an image URL still serves an image (shops move and delete photos).
export async function imageStillWorks(rawUrl) {
  try {
    const res = await fetch(rawUrl, {
      headers: { Accept: "image/*", "User-Agent": "Mozilla/5.0 (compatible; mattothemoon gear page)" },
      redirect: "follow",
      signal: AbortSignal.timeout(PAGE_TIMEOUT_MS),
      cache: "no-store",
    });
    const ok = res.ok && (res.headers.get("content-type") || "").startsWith("image/");
    res.body?.cancel().catch(() => {});
    return ok;
  } catch (err) {
    if (typeof err?.digest === "string") throw err;
    return false;
  }
}

// Looks up the image URL for a product page, for display on the gear page.
// Cached per server instance for a day (an hour when nothing was found), and
// fetched through Next's data cache so a deploy doesn't refetch every page.
// Returns null instead of throwing.
export async function findProductImage(rawUrl, { fresh = false } = {}) {
  let url;
  try {
    url = new URL(rawUrl);
  } catch {
    return null;
  }
  if (!["http:", "https:"].includes(url.protocol)) return null;
  const amazonSearch = isAmazon(url) && looksLikeSearch(url);
  if (looksLikeSearch(url) && !amazonSearch) return null;

  const key = url.toString();
  const hit = cache.get(key);
  if (!fresh && hit && Date.now() - hit.at < hit.ttl) return hit.value;

  let value = null;
  try {
    const response = await fetch(key, {
      headers: {
        Accept: "text/html",
        "User-Agent": "Mozilla/5.0 (compatible; mattothemoon gear page)",
      },
      redirect: "follow",
      signal: AbortSignal.timeout(PAGE_TIMEOUT_MS),
      ...(fresh ? { cache: "no-store" } : { next: { revalidate: 86400 } }),
    });
    if (response.ok && (response.headers.get("content-type") || "").includes("html")) {
      const html = await response.text();
      value = amazonSearch
        ? imageFromAmazonSearch(html, url.searchParams.get("k"))
        : imageFromHtml(html, key);
    }
  } catch (err) {
    if (typeof err?.digest === "string") throw err;
  }
  cache.set(key, { at: Date.now(), value, ttl: value ? CACHE_TTL_MS : FAIL_TTL_MS });
  return value;
}
