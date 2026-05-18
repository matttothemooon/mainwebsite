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

    const boundaryMatch = contentType.match(/boundary=(.*)$/i);
    if (!boundaryMatch) {
      return res.status(400).json({ error: "No boundary found" });
    }

    const boundary = boundaryMatch[1].trim();
    const boundaryBuffer = Buffer.from(`--${boundary}`);
    const parts = splitBuffer(buffer, boundaryBuffer);

    let fileBuffer = null;
    let fileName = "upload";
    let mimeType = "application/octet-stream";

    for (const part of parts) {
      const headerEnd = part.indexOf("\r\n\r\n");
      if (headerEnd === -1) continue;

      const headerStr = part.slice(0, headerEnd).toString("utf8");
      const body = part.slice(headerEnd + 4);
      const dispositionMatch = headerStr.match(/Content-Disposition:\s*form-data;\s*name="([^"]+)"(?:;\s*filename="([^"]+)")?/i);
      if (!dispositionMatch) continue;

      const fieldName = dispositionMatch[1];
      const filenameMatch = dispositionMatch[2];
      if (!filenameMatch) {
        if (fieldName !== "file" && fieldName !== "image" && fieldName !== "img") {
          continue;
        }
      }

      if (fieldName === "file" || fieldName === "image" || fieldName === "img") {
        if (filenameMatch) fileName = filenameMatch;
        const mimeMatch = headerStr.match(/Content-Type:\s*([^\r\n]+)/i);
        if (mimeMatch) mimeType = mimeMatch[1].trim();

        fileBuffer = body;
        if (fileBuffer.length >= 2 && fileBuffer.slice(fileBuffer.length - 2).equals(Buffer.from("\r\n"))) {
          fileBuffer = fileBuffer.slice(0, fileBuffer.length - 2);
        }
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

    const forwardedProto = req.headers["x-forwarded-proto"];
    const proto = forwardedProto ? forwardedProto.split(",")[0].trim() : "http";
    const host = req.headers.host || "localhost:3000";
    const base = process.env.NEXT_PUBLIC_BASE_URL || `${proto}://${host}`;
    const shortUrl = `${base}/i/${id}`;
    const directUrl = blob.url;

    if ((req.headers.accept || "").includes("text/plain") || req.query?.plain === "1" || req.query?.text === "1") {
      return res.status(200).send(directUrl);
    }

    return res.status(200).json({ id, shortUrl, directUrl, url: directUrl });
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
