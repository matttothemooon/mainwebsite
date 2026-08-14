// Custom link-icon upload, used when a URL matches no known platform.
import crypto from "crypto";
import { requireAuth } from "@/lib/auth";
import { saveIcon } from "@/lib/storage";

const MAX_BYTES = 512 * 1024; // icons are tiny; this is already generous

// SVG is allowed because it's the right format for an icon. Uploads are served
// with a locked-down CSP (see next.config.mjs) so a script inside one cannot
// run, and in production they live on a separate Blob origin anyway.
const TYPES = {
  "image/png": "png",
  "image/jpeg": "jpg",
  "image/webp": "webp",
  "image/gif": "gif",
  "image/svg+xml": "svg",
};

export async function POST(request) {
  const denied = requireAuth(request);
  if (denied) return denied;

  let file;
  try {
    file = (await request.formData()).get("file");
  } catch {
    return Response.json({ error: "Expected a multipart form upload" }, { status: 400 });
  }

  if (!file || typeof file === "string") {
    return Response.json({ error: "No file provided" }, { status: 400 });
  }

  const ext = TYPES[file.type];
  if (!ext) {
    return Response.json(
      { error: `Unsupported type "${file.type || "unknown"}" — use PNG, JPEG, WebP, GIF or SVG.` },
      { status: 415 }
    );
  }

  if (file.size > MAX_BYTES) {
    return Response.json(
      { error: `Too large (${Math.ceil(file.size / 1024)}KB) — the limit is ${MAX_BYTES / 1024}KB.` },
      { status: 413 }
    );
  }

  try {
    const bytes = Buffer.from(await file.arrayBuffer());
    // Random name: the uploaded filename is untrusted, and this avoids one
    // icon silently overwriting another.
    const name = `${crypto.randomBytes(8).toString("hex")}.${ext}`;
    const url = await saveIcon(name, bytes, file.type);

    return Response.json({ url }, { headers: { "Cache-Control": "no-store" } });
  } catch (err) {
    console.error("Icon upload failed:", err);
    return Response.json({ error: `Upload failed — ${err.message}` }, { status: 500 });
  }
}
