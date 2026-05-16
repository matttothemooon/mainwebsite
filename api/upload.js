import { put } from "@vercel/blob";

export const config = {
  api: {
    bodyParser: false,
  },
};

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

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

    const contentType = req.headers["content-type"] || "";
    if (!contentType.includes("multipart/form-data")) {
      return res.status(400).json({ error: "Must be multipart/form-data" });
    }

    const boundary = contentType.split("boundary=")[1];
    if (!boundary) {
      return res.status(400).json({ error: "No boundary found" });
    }

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
        fileBuffer = body.slice(0, body.length - 2);
        break;
      }
    }

    if (!fileBuffer || fileBuffer.length === 0) {
      return res.status(400).json({ error: "No file found in request" });
    }

    const allowedTypes = ["image/jpeg", "image/png", "image/gif", "image/webp", "image/svg+xml"];
    if (!allowedTypes.includes(mimeType)) {
      return res.status(400).json({ error: "Only image files are allowed" });
    }

    if (fileBuffer.length > 10 * 1024 * 1024) {
      return res.status(400).json({ error: "File too large (max 10MB)" });
    }

    const id = randomId(8);
    const ext = fileName.split(".").pop() || "jpg";

    const blob = await put(`i/${id}.${ext}`, fileBuffer, {
      access: "public",
      contentType: mimeType,
    });

    const base = process.env.NEXT_PUBLIC_BASE_URL || "https://mattothemoon.xyz";
    const shortUrl = `${base}/i/${id}`;

    return res.status(200).json({ id, shortUrl, directUrl: blob.url });
  } catch (err) {
    console.error("Upload error:", err);
    return res.status(500).json({ error: "Upload failed", detail: err.message });
  }
}

function randomId(length) {
  const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
  let result = "";
  for (let i = 0; i < length; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
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
