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
    headers: { Accept: accept },
    redirect: "follow",
    signal: AbortSignal.timeout(10000),
  });
  if (!response.ok) throw new Error(`Product page returned ${response.status}`);
  return response;
}

function imageFromHtml(html, pageUrl) {
  const tags = html.match(/<meta\b[^>]*>/gi) || [];
  for (const tag of tags) {
    const property = tag.match(/\b(?:property|name)\s*=\s*["']([^"']+)["']/i)?.[1].toLowerCase();
    if (!["og:image", "twitter:image", "twitter:image:src"].includes(property)) continue;
    const content = tag.match(/\bcontent\s*=\s*["']([^"']+)["']/i)?.[1];
    if (content) {
      try {
        return new URL(content, pageUrl).toString();
      } catch {
        // Try the next image metadata tag.
      }
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
