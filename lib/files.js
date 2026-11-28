// lib/files.js
// Settings files shared on the Tools page (Chatterino, FFZ, ...). Each is kept
// in Vercel Blob as files/<id>.json holding the bytes in base64, and served
// as a download by app/files/[id]/[name].

import crypto from "crypto";
import { writeJson, readJson, removeJson } from "./blobStore.js";

export const MAX_BYTES = 3 * 1024 * 1024;
export const ID_PATTERN = /^[a-z0-9]{10}$/;

const newId = () => crypto.randomBytes(8).toString("hex").slice(0, 10);

export async function saveFile({ name, type, bytes }) {
  const id = newId();
  await writeJson(`files/${id}.json`, {
    name,
    type: type || "application/octet-stream",
    data: Buffer.from(bytes).toString("base64"),
    savedAt: new Date().toISOString(),
  });
  return { id, name, size: bytes.byteLength };
}

// { name, type, bytes } or null.
export async function readFile(id) {
  if (!ID_PATTERN.test(id)) return null;
  const rec = await readJson(`files/${id}.json`);
  return rec ? { name: rec.name, type: rec.type, bytes: Buffer.from(rec.data, "base64") } : null;
}

export async function removeFile(id) {
  if (ID_PATTERN.test(id)) await removeJson(`files/${id}.json`);
}
