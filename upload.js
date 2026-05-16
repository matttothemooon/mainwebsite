import { put } from "@vercel/blob";
import { kv } from "@vercel/kv";
import { nanoid } from "nanoid";

export const config = {
  api: {
    bodyParser: false,
  },
};

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  // Optional: simple API key auth to prevent abuse
  const authHeader = req.headers["x-api-key"];
  if (process.env.UPLOAD_API_KEY && authHeader !== process.env.UPLOAD_API_KEY) {
    return res.status(401).json({ error: "Unauthorized" });
  }

  try {
    const chunks = [];
    for await (const chunk of req) {
      chunks.push(chunk);
    }
    const buffer = Buffer.concat(chunks);

    // Parse multipart form data manually
    const contentType = req.headers["content-type"] || "";
    if (!contentType.includes("multipart/form-data")) {
      return res.status(400).json({ error: "Must be multipart/form-data" });
    }

    const boundary = contentType.split("boundary=")[1];
    if (!boundary) {
      return res.status(400).json({ error: "No boundary found" });
    }

    // Extract file from multipart
    const boundaryBuffer = Buffer.from("--" + boundary);
    const parts = splitBuffer(buffer, boundaryBuffer);

    let fileBuffer = null;
    let fileName = "upload";
    let mimeType = "application/octet-stream";

    for (const part of parts) {
      const headerEnd = part.indexOf("\r\n\r\n");
      if (headerEnd === -1) continue;

      const headerStr = part.slice(0, headerEnd).toString();
      const body = part.slice(headerEnd + 4);

      if (headerStr.includes('name="file"')) {
        const nameMatch = headerStr.match(/filename="([^"]+)"/);
        if (nameMatch) fileName = nameMatch[1];

        const mimeMatch = headerStr.match(/Content-Type:\s*([^\r\n]+)/i);
        if (mimeMatch) mimeType = mimeMatch[1].trim();

        // Remove trailing \r\n
        fileBuffer = body.slice(0, body.length - 2);
        break;
      }
    }

    if (!fileBuffer || fileBuffer.length === 0) {
      return res.status(400).json({ error: "No file found in request" });
    }

    // Validate it's an image
    const allowedTypes = ["image/jpeg", "image/png", "image/gif", "image/webp", "image/svg+xml"];
    if (!allowedTypes.includes(mimeType)) {
      return res.status(400).json({ error: "Only image files are allowed" });
    }

    // File size limit: 10MB
    if (fileBuffer.length > 10 * 1024 * 1024) {
      return res.status(400).json({ error: "File too large (max 10MB)" });
    }

    // Generate short ID
    const id = nanoid(8);

    // Get file extension
    const ext = fileName.split(".").pop() || "jpg";
    const blobPath = `images/${id}.${ext}`;

    // Upload to Vercel Blob
    const blob = await put(blobPath, fileBuffer, {
      access: "public",
      contentType: mimeType,
    });

    // Store mapping in KV: id -> { url, originalName, uploadedAt, size }
    await kv.set(`img:${id}`, {
      url: blob.url,
      originalName: fileName,
      uploadedAt: new Date().toISOString(),
      size: fileBuffer.length,
      mimeType,
    });

    const shortUrl = `${process.env.NEXT_PUBLIC_BASE_URL || "https://mattothemoon.xyz"}/i/${id}`;

    return res.status(200).json({
      id,
      shortUrl,
      directUrl: blob.url,
    });
  } catch (err) {
    console.error("Upload error:", err);
    return res.status(500).json({ error: "Upload failed", detail: err.message });
  }
}

function splitBuffer(buf, delimiter) {
  const parts = [];
  let start = 0;
  let idx;
  while ((idx = buf.indexOf(delimiter, start)) !== -1) {
    parts.push(buf.slice(start, idx));
    start = idx + delimiter.length;
  }
  parts.push(buf.slice(start));
  return parts.filter((p) => p.length > 4);
}
