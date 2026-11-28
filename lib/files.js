// lib/files.js
// Settings files shared on the Tools page (Chatterino, FFZ, ...). Each is kept
// in Vercel Blob as files/<id>.json holding the bytes in base64, and served
// as a download by app/files/[id]/[name].

import crypto from "crypto";
import { writeJson, readJson, removeJson } from "./blobStore.js";

export const MAX_BYTES = 3 * 1024 * 1024;
export const ID_PATTERN = /^[a-z0-9]{10}$/;

// Keys that hold logins in settings files, e.g. Chatterino keeps every signed-in
// account (with its OAuth token) under "accounts" in settings.json.
const SECRET_KEY = /^(accounts|.*(oauth|token|password|secret|client_?id|cookie|session).*)$/i;

// A JSON settings file with any login details removed. Returns the bytes as
// they were when the file isn't JSON, and how many keys were removed.
export function stripSecrets(bytes) {
  let data;
  try {
    data = JSON.parse(Buffer.from(bytes).toString("utf8"));
  } catch {
    return { bytes: Buffer.from(bytes), removed: 0 };
  }
  let removed = 0;
  const walk = (value) => {
    if (Array.isArray(value)) return value.map(walk);
    if (!value || typeof value !== "object") return value;
    const out = {};
    for (const [k, v] of Object.entries(value)) {
      if (SECRET_KEY.test(k)) removed++;
      else out[k] = walk(v);
    }
    return out;
  };
  const cleaned = walk(data);
  return removed ? { bytes: Buffer.from(JSON.stringify(cleaned, null, 4)), removed } : { bytes: Buffer.from(bytes), removed: 0 };
}

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
