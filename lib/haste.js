// lib/haste.js
// Storage for the public pastebin (/haste). Each paste is one small JSON file
// at haste/<id>.json in Vercel Blob (see lib/blobStore.js).

import crypto from "crypto";
import { isConfigured as blobConfigured, writeJson, readJson, removeJson, listNames } from "./blobStore.js";

export const MAX_BYTES = 256 * 1024;
export const ID_PATTERN = /^[a-z0-9]{6}$/;
// No look-alike characters (0/o, 1/l/i), so links are easy to read out.
const ID_ALPHABET = "abcdefghjkmnpqrstuvwxyz23456789";

export const EXPIRY_OPTIONS = {
  "1h": { label: "1 hour", ms: 60 * 60 * 1000 },
  "1d": { label: "1 day", ms: 24 * 60 * 60 * 1000 },
  "7d": { label: "7 days", ms: 7 * 24 * 60 * 60 * 1000 },
  "30d": { label: "30 days", ms: 30 * 24 * 60 * 60 * 1000 },
};
export const DEFAULT_EXPIRY = "7d";

export const LANGUAGES = {
  auto: "Auto-detect",
  plaintext: "Plain text",
  javascript: "JavaScript",
  typescript: "TypeScript",
  json: "JSON",
  python: "Python",
  lua: "Lua",
  bash: "Bash / shell",
  xml: "HTML / XML",
  css: "CSS",
  csharp: "C#",
  cpp: "C++",
  java: "Java",
  go: "Go",
  rust: "Rust",
  sql: "SQL",
  yaml: "YAML",
  ini: "INI / TOML",
  markdown: "Markdown",
};

// Whether pastes can be saved on this deployment.
export const isConfigured = () => blobConfigured();

export function newId() {
  const bytes = crypto.randomBytes(6);
  return Array.from(bytes, (b) => ID_ALPHABET[b % ID_ALPHABET.length]).join("");
}

// A visitor fingerprint that can't be turned back into an IP address, kept
// with each paste so abuse from one source can be spotted and removed.
export function hashIp(ip) {
  const salt = process.env.SESSION_SECRET || "haste";
  return crypto.createHash("sha256").update(`haste:${salt}:${ip}`).digest("hex").slice(0, 12);
}

const writeFile = (id, record) => writeJson(`haste/${id}.json`, record, { overwrite: false });
const readFile = (id) => readJson(`haste/${id}.json`);
const removeFile = (id) => removeJson(`haste/${id}.json`);

/* ---------- pastes ---------- */

// Saves a paste and returns its id.
export async function createPaste({ content, language = "auto", expiry = DEFAULT_EXPIRY, ipHash = "" }) {
  const text = String(content ?? "").replace(/\r\n/g, "\n");
  if (!text.trim()) throw new Error("The paste is empty");
  if (Buffer.byteLength(text) > MAX_BYTES) throw new Error(`Pastes can be up to ${MAX_BYTES / 1024} KB`);
  const lang = Object.hasOwn(LANGUAGES, language) ? language : "auto";
  const ttl = EXPIRY_OPTIONS[expiry] || EXPIRY_OPTIONS[DEFAULT_EXPIRY];

  const now = Date.now();
  const record = {
    content: text,
    language: lang,
    createdAt: new Date(now).toISOString(),
    expiresAt: new Date(now + ttl.ms).toISOString(),
    ipHash,
  };

  for (let attempt = 0; attempt < 5; attempt++) {
    const id = newId();
    if (await readFile(id)) continue; // taken (rare)
    await writeFile(id, record);
    return id;
  }
  throw new Error("Could not pick a free paste id, try again");
}

// The paste, or null when it doesn't exist or has expired (expired ones are
// deleted on the way out).
export async function getPaste(id) {
  if (!ID_PATTERN.test(String(id))) return null;
  const record = await readFile(id);
  if (!record) return null;
  if (Date.parse(record.expiresAt) <= Date.now()) {
    removeFile(id).catch(() => {});
    return null;
  }
  return { id, ...record };
}

export async function deletePaste(id) {
  if (!ID_PATTERN.test(String(id))) throw new Error("Invalid paste id");
  await removeFile(id);
}

// Newest first, for the admin panel: [{ id, size, createdAt, expiresAt,
// preview, language, ipHash }]. Expired pastes are cleaned up as they're seen.
export async function listPastes({ limit = 100 } = {}) {
  const ids = (await listNames("haste/")).map((n) => n.replace(/^haste\/|\.json$/g, ""));

  const records = await Promise.all(
    ids.filter((id) => ID_PATTERN.test(id)).map(async (id) => {
      const r = await readFile(id).catch(() => null);
      return r ? { id, ...r } : null;
    })
  );
  const now = Date.now();
  const live = [];
  for (const r of records.filter(Boolean)) {
    if (Date.parse(r.expiresAt) <= now) {
      removeFile(r.id).catch(() => {});
      continue;
    }
    live.push({
      id: r.id,
      size: Buffer.byteLength(r.content),
      lines: r.content.split("\n").length,
      createdAt: r.createdAt,
      expiresAt: r.expiresAt,
      language: r.language,
      ipHash: r.ipHash,
      preview: r.content.trim().split("\n")[0].slice(0, 120),
    });
  }
  return live.sort((a, b) => b.createdAt.localeCompare(a.createdAt)).slice(0, limit);
}

/* ---------- rate limiting ---------- */

// Per server instance, in memory: enough to stop one visitor flooding the
// store from a script. Each key may create `max` pastes per `windowMs`.
const hits = new Map();
export function rateLimited(key, { max = 8, windowMs = 10 * 60 * 1000 } = {}) {
  const now = Date.now();
  const recent = (hits.get(key) || []).filter((t) => now - t < windowMs);
  if (recent.length >= max) {
    hits.set(key, recent);
    return Math.ceil((recent[0] + windowMs - now) / 1000);
  }
  recent.push(now);
  hits.set(key, recent);
  if (hits.size > 5000) hits.clear();
  return 0;
}

export function clientIp(request) {
  const forwarded = request.headers.get("x-forwarded-for") || "";
  return forwarded.split(",")[0].trim() || request.headers.get("x-real-ip") || "unknown";
}
