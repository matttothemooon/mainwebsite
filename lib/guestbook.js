// lib/guestbook.js
// Guestbook messages, held for review like a mod queue.
//
// New messages each get their own file (guestbook/pending/<id>.json), so
// visitors writing at the same time can't overwrite each other. Approved
// messages live together in guestbook/approved.json, which only the owner
// changes, and which the public page reads in one go.

import crypto from "crypto";
import { isConfigured as blobConfigured, writeJson, readJson, removeJson, listNames } from "./blobStore.js";

export const MAX_NAME = 40;
export const MAX_MESSAGE = 280;
const MAX_APPROVED = 500;
const APPROVED = "guestbook/approved.json";
const ID = /^[a-f0-9]{12}$/;

export const isConfigured = () => blobConfigured();

const LINK = /(https?:\/\/|www\.|discord\.gg\/|\b[a-z0-9-]+\.(com|net|org|gg|xyz|io|co|me|tv|ru|cn|link|click)\b)/i;

// Checks and tidies a visitor's entry. Throws a message meant for them.
export function cleanEntry({ name, message }) {
  const n = String(name ?? "").replace(/\s+/g, " ").trim();
  const m = String(message ?? "").replace(/\r\n/g, "\n").replace(/\n{3,}/g, "\n\n").trim();
  if (!n) throw new Error("Add your name");
  if (!m) throw new Error("Write a message");
  if (n.length > MAX_NAME) throw new Error(`Names can be up to ${MAX_NAME} characters`);
  if (m.length > MAX_MESSAGE) throw new Error(`Messages can be up to ${MAX_MESSAGE} characters`);
  if (LINK.test(n) || LINK.test(m)) throw new Error("Links aren't allowed in the guestbook");
  return { name: n, message: m };
}

export async function submitEntry({ name, message, ipHash = "" }) {
  const entry = cleanEntry({ name, message });
  const id = crypto.randomBytes(6).toString("hex");
  await writeJson(`guestbook/pending/${id}.json`, { id, ...entry, createdAt: new Date().toISOString(), ipHash }, { overwrite: false });
  return id;
}

async function readApproved({ fresh = false } = {}) {
  return (await readJson(APPROVED, { fresh })) || [];
}

let publicCache = null; // { at, value }

// Approved messages, newest first, for the public page. Cached a minute.
export async function approvedEntries() {
  if (publicCache && Date.now() - publicCache.at < 60 * 1000) return publicCache.value;
  const value = (await readApproved()).map(({ id, name, message, createdAt }) => ({ id, name, message, createdAt }));
  publicCache = { at: Date.now(), value };
  return value;
}

// The review queue, oldest first.
export async function pendingEntries() {
  const names = await listNames("guestbook/pending/");
  const entries = await Promise.all(names.map((n) => readJson(n).catch(() => null)));
  return entries.filter(Boolean).sort((a, b) => a.createdAt.localeCompare(b.createdAt));
}

export async function approve(id) {
  if (!ID.test(String(id))) throw new Error("Invalid id");
  const entry = await readJson(`guestbook/pending/${id}.json`);
  if (!entry) throw new Error("That message is no longer waiting");
  const approved = (await readApproved({ fresh: true })).filter((e) => e.id !== id);
  approved.unshift({ ...entry, approvedAt: new Date().toISOString() });
  await writeJson(APPROVED, approved.slice(0, MAX_APPROVED));
  await removeJson(`guestbook/pending/${id}.json`);
  publicCache = null;
}

// Deletes a waiting or an approved message.
export async function remove(id) {
  if (!ID.test(String(id))) throw new Error("Invalid id");
  await removeJson(`guestbook/pending/${id}.json`);
  const approved = await readApproved({ fresh: true });
  if (approved.some((e) => e.id === id)) {
    await writeJson(APPROVED, approved.filter((e) => e.id !== id));
  }
  publicCache = null;
}

// All approved messages with their details, for the admin panel.
export const adminApproved = () => readApproved({ fresh: true });
