// lib/haste.js
// Storage for the public pastebin (/haste). Each paste is one small JSON file
// in Vercel Blob at haste/<id>.json. Without a Blob store (local development)
// pastes go in .dev-haste/ instead.

import crypto from "crypto";
import fs from "fs/promises";
import path from "path";

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

const hasBlob = () => Boolean(process.env.BLOB_READ_WRITE_TOKEN || process.env.BLOB_STORE_ID);
const useLocal = () => !hasBlob() && !process.env.VERCEL;
const LOCAL_DIR = () => path.join(process.cwd(), ".dev-haste");

// Whether pastes can be saved on this deployment.
export const isConfigured = () => hasBlob() || useLocal();

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

/* ---------- Vercel Blob ---------- */

// A Blob store is either private or public, chosen when it's created. Try
// private first and remember whichever the store accepts.
let access = "private";
async function withAccess(run) {
  try {
    return await run(access);
  } catch (err) {
    if (!/access|public|private/i.test(String(err?.message))) throw err;
    access = access === "private" ? "public" : "private";
    return run(access);
  }
}

async function blob() {
  return import("@vercel/blob");
}

async function writeFile(id, record) {
  const body = JSON.stringify(record);
  if (useLocal()) {
    await fs.mkdir(LOCAL_DIR(), { recursive: true });
    await fs.writeFile(path.join(LOCAL_DIR(), `${id}.json`), body);
    return;
  }
  const { put } = await blob();
  await withAccess((a) =>
    put(`haste/${id}.json`, body, {
      access: a,
      contentType: "application/json",
      addRandomSuffix: false,
      allowOverwrite: false,
      cacheControlMaxAge: 60,
    })
  );
}

async function readFile(id) {
  if (useLocal()) {
    try {
      return JSON.parse(await fs.readFile(path.join(LOCAL_DIR(), `${id}.json`), "utf8"));
    } catch (err) {
      if (err.code === "ENOENT") return null;
      throw err;
    }
  }
  const { get } = await blob();
  const res = await withAccess((a) => get(`haste/${id}.json`, { access: a }));
  if (!res || res.statusCode !== 200) return null;
  return JSON.parse(await new Response(res.stream).text());
}

async function removeFile(id) {
  if (useLocal()) {
    await fs.rm(path.join(LOCAL_DIR(), `${id}.json`), { force: true });
    return;
  }
  const { del } = await blob();
  await del(`haste/${id}.json`);
}

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
  let ids = [];
  if (useLocal()) {
    try {
      ids = (await fs.readdir(LOCAL_DIR())).filter((f) => f.endsWith(".json")).map((f) => f.slice(0, -5));
    } catch (err) {
      if (err.code !== "ENOENT") throw err;
    }
  } else {
    const { list } = await blob();
    let cursor;
    do {
      const page = await list({ prefix: "haste/", limit: 1000, cursor });
      ids.push(...page.blobs.map((b) => b.pathname.replace(/^haste\/|\.json$/g, "")));
      cursor = page.hasMore ? page.cursor : undefined;
    } while (cursor && ids.length < 5000);
  }

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
