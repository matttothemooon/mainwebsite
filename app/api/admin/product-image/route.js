import crypto from "crypto";
import { requireAuth } from "@/lib/auth";
import { saveIcon } from "@/lib/storage";

const MAX_BYTES = 2 * 1024 * 1024;
const TYPES = {
  "image/png": "png",
  "image/jpeg": "jpg",
  "image/webp": "webp",
  "image/gif": "gif",
};

function remoteUrl(value) {
  let url;
  try {
    url = new URL(String(value || ""));
  } catch {
    throw new Error("Enter a valid product URL");
  }
  if (!["http:", "https:"].includes(url.protocol)) {
    throw new Error("Product URL must use http or https");
  }
  return url;
}

async function fetchRemote(url, accept) {
  const response = await fetch(url, {
    headers: {
      Accept: accept,
      "User-Agent": "Mozilla/5.0 (compatible; mattothemoon product image importer)",
    },
    redirect: "follow",
    signal: AbortSignal.timeout(10000),
  });
  if (!response.ok) throw new Error(`Product page returned ${response.status}`);
  return response;
}

function imageFromHtml(html, pageUrl) {
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

  const tags = html.match(/<(?:meta|link)\b[^>]*>/gi) || [];
  for (const tag of tags) {
    const key = (attribute(tag, "property") || attribute(tag, "name") || "").toLowerCase();
    const rel = (attribute(tag, "rel") || "").toLowerCase();
    if (["og:image", "twitter:image", "twitter:image:src"].includes(key)) {
      const image = resolve(attribute(tag, "content"));
      if (image) return image;
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

export async function POST(request) {
  const denied = requireAuth(request);
  if (denied) return denied;

  try {
    const { url: rawUrl } = await request.json();
    const productUrl = remoteUrl(rawUrl);
    const page = await fetchRemote(productUrl, "text/html,image/*");
    const type = (page.headers.get("content-type") || "").split(";")[0].toLowerCase();
    const imageUrl = TYPES[type] ? productUrl.toString() : imageFromHtml(await page.text(), productUrl);
    if (!imageUrl) throw new Error("No product image was found on that page");

    const image = await fetchRemote(remoteUrl(imageUrl), "image/*");
    const imageType = (image.headers.get("content-type") || "").split(";")[0].toLowerCase();
    const ext = TYPES[imageType];
    if (!ext) throw new Error("The product image is not a supported PNG, JPEG, WebP or GIF");

    const length = Number(image.headers.get("content-length"));
    if (Number.isFinite(length) && length > MAX_BYTES) {
      throw new Error("The product image is larger than 2MB");
    }
    const bytes = Buffer.from(await image.arrayBuffer());
    if (bytes.length > MAX_BYTES) throw new Error("The product image is larger than 2MB");

    const name = `${crypto.randomBytes(8).toString("hex")}.${ext}`;
    const savedUrl = await saveIcon(name, bytes, imageType);
    return Response.json({ url: savedUrl }, { headers: { "Cache-Control": "no-store" } });
  } catch (err) {
    console.error("Product image fetch failed:", err);
    return Response.json({ error: err.message || "Could not fetch product image" }, { status: 400 });
  }
}
