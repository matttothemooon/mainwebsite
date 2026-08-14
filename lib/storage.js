// lib/storage.js
import { put, list } from "@vercel/blob";
import fs from "fs/promises";
import path from "path";

const BLOB_PATH = "admin/profile.json";

// Vercel Blob needs a token that only exists in the deployed environment. With
// no token — i.e. `npm run dev` — edits persist to a gitignored file instead,
// so the admin panel is fully usable offline.
//
// Gated on VERCEL as well, because the deployed filesystem is read-only. Taking
// this branch there turns "no Blob store attached" into an EROFS failure from
// inside fs.writeFile, which reads like a broken save rather than missing
// setup. Mirrors how isDevAuthBypass refuses to trust a dev-only flag on Vercel.
const LOCAL_FILE = path.join(process.cwd(), ".dev-profile.json");

// Two credential models work, and Vercel picks which one a store gets:
//   - BLOB_READ_WRITE_TOKEN            a static token, older stores
//   - BLOB_STORE_ID + VERCEL_OIDC_TOKEN  OIDC, what Vercel provisions now
// The SDK resolves both itself, including the OIDC token it is handed at
// runtime, so this only has to spot the case where neither exists.
const hasBlobStore = () =>
  Boolean(process.env.BLOB_READ_WRITE_TOKEN || process.env.BLOB_STORE_ID);

export const useLocalFile = () => !hasBlobStore() && !process.env.VERCEL;

// Writes need a Blob store; reads fall back to DEFAULT_PROFILE on their own.
function requireBlobStore() {
  if (!hasBlobStore()) {
    throw new Error(
      "Vercel Blob is not configured (neither BLOB_READ_WRITE_TOKEN nor " +
        "BLOB_STORE_ID is set). Attach a Blob store to this project in " +
        "Vercel → Storage, then redeploy."
    );
  }
}

// Shipped as the seed value and as the fallback whenever the blob is missing
// or unreadable — the page always has something real to render.
//
// `label` is no longer displayed: links render as icons only, so it serves as
// the accessible name (aria-label / tooltip) and as the platform hint for
// relative URLs like /discord that have no hostname to detect from.
export const DEFAULT_PROFILE = {
  name: "mattothemoon",
  bio: "community mod & streamer.",
  links: [
    { label: "twitch", url: "https://twitch.tv/mattothemoon", iconUrl: "" },
    { label: "x", url: "https://x.com/mattothemoon", iconUrl: "" },
    { label: "github", url: "https://github.com/mattothemoon", iconUrl: "" },
    { label: "discord", url: "/discord", iconUrl: "" },
    { label: "discord profile", url: "https://discord.com/users/436300903927119873", iconUrl: "" },
    { label: "email", url: "mailto:mattothemoon06@gmail.com", iconUrl: "" },
  ],
  experience: {
    active: [
      { role: "Admin", name: "ChubsC", url: "https://twitch.tv/chubsc", date: "present", twitch: "chubsc", avatar: "", followers: null },
      { role: "CM", name: "Sinnski", url: "https://twitch.tv/sinnski", date: "present", twitch: "sinnski", avatar: "", followers: null },
      { role: "Admin", name: "TenacityTV", url: "https://twitch.tv/tenacitytv", date: "present", twitch: "tenacitytv", avatar: "", followers: null },
      { role: "Mod", name: "Cizzorz", url: "https://twitch.tv/cizzorz", date: "present", twitch: "cizzorz", avatar: "", followers: null },
    ],
    past: [
      { role: "Head Mod", name: "Flynn", url: "", date: "Oct 2021 – Jan 2025", twitch: "", avatar: "", followers: null },
      { role: "Community Manager", name: "The Reapers", url: "", date: "Jun 2019 – Jan 2025", twitch: "", avatar: "", followers: null },
    ],
  },
};

/* ---------- validation ---------- */

const str = (v, max) => (typeof v === "string" ? v.trim().slice(0, max) : "");

// Blocks javascript: and data: URLs — these values are written straight into
// href and src attributes on the public page.
function safeUrl(value) {
  const url = str(value, 500);
  if (!url) return "";
  if (/^(https?:|mailto:|\/)/i.test(url)) return url;
  return "";
}

function cleanLink(raw) {
  return {
    label: str(raw?.label, 60),
    url: safeUrl(raw?.url),
    // Optional custom icon, used when the URL matches no known platform.
    iconUrl: safeUrl(raw?.iconUrl),
  };
}

// "no follower count" must stay null rather than becoming 0 — Number(null) is
// 0, which would render a bogus "0 followers" on the hover card.
function cleanFollowers(value) {
  if (value === null || value === undefined || value === "") return null;
  const n = Number(value);
  return Number.isFinite(n) && n >= 0 ? Math.floor(n) : null;
}

// Twitch logins are alphanumeric + underscore. A full channel URL pasted in
// here is the likely mistake, so pull the login out of it rather than mashing
// the whole thing into one string.
function cleanTwitch(value) {
  let login = str(value, 200);
  const match = login.match(/twitch\.tv\/([^/?#\s]+)/i);
  if (match) login = match[1];
  return login.replace(/[^a-zA-Z0-9_]/g, "").slice(0, 25).toLowerCase();
}

function cleanEntry(raw) {
  return {
    role: str(raw?.role, 60),
    name: str(raw?.name, 60),
    url: safeUrl(raw?.url),
    date: str(raw?.date, 60),
    twitch: cleanTwitch(raw?.twitch),
    avatar: safeUrl(raw?.avatar),
    followers: cleanFollowers(raw?.followers),
  };
}

// Throws on a payload that isn't shaped like a profile; otherwise returns a
// normalised copy containing only known fields.
export function validateProfile(raw) {
  if (!raw || typeof raw !== "object") throw new Error("Profile must be an object");
  if (!Array.isArray(raw.links)) throw new Error("links must be an array");
  if (!raw.experience || typeof raw.experience !== "object") {
    throw new Error("experience must be an object");
  }
  const { active, past } = raw.experience;
  if (!Array.isArray(active) || !Array.isArray(past)) {
    throw new Error("experience.active and experience.past must be arrays");
  }

  return {
    name: str(raw.name, 60) || DEFAULT_PROFILE.name,
    bio: str(raw.bio, 280),
    links: raw.links.slice(0, 20).map(cleanLink).filter((l) => l.label && l.url),
    experience: {
      active: active.slice(0, 50).map(cleanEntry).filter((e) => e.name),
      past: past.slice(0, 50).map(cleanEntry).filter((e) => e.name),
    },
  };
}

/* ---------- blob access ---------- */

export async function getProfile() {
  if (useLocalFile()) {
    try {
      return validateProfile(JSON.parse(await fs.readFile(LOCAL_FILE, "utf8")));
    } catch {
      return DEFAULT_PROFILE; // nothing saved locally yet
    }
  }

  try {
    const { blobs } = await list({ prefix: BLOB_PATH, limit: 1 });
    const existing = blobs.find((b) => b.pathname === BLOB_PATH);
    if (!existing) return DEFAULT_PROFILE;

    // Blob URLs sit behind a CDN; the cache buster keeps the admin panel from
    // loading back a stale copy right after a save.
    const res = await fetch(`${existing.url}?t=${Date.now()}`, { cache: "no-store" });
    if (!res.ok) return DEFAULT_PROFILE;

    return validateProfile(await res.json());
  } catch (err) {
    console.error("Profile read failed, serving defaults:", err);
    return DEFAULT_PROFILE;
  }
}

export async function saveProfile(profile) {
  if (useLocalFile()) {
    await fs.writeFile(LOCAL_FILE, JSON.stringify(profile, null, 2));
    return;
  }

  requireBlobStore();
  await put(BLOB_PATH, JSON.stringify(profile, null, 2), {
    access: "public",
    contentType: "application/json",
    addRandomSuffix: false,
    allowOverwrite: true,
    cacheControlMaxAge: 60,
  });
}

/* ---------- custom link icons ---------- */

const UPLOAD_DIR = path.join(process.cwd(), "public", "uploads");

// Stores an uploaded icon and returns the URL to render it from. Mirrors the
// profile storage split: Vercel Blob when deployed, public/uploads locally.
export async function saveIcon(filename, bytes, contentType) {
  if (useLocalFile()) {
    await fs.mkdir(UPLOAD_DIR, { recursive: true });
    await fs.writeFile(path.join(UPLOAD_DIR, filename), bytes);
    return `/uploads/${filename}`;
  }

  requireBlobStore();
  const { url } = await put(`admin/icons/${filename}`, bytes, {
    access: "public",
    contentType,
    addRandomSuffix: false,
    allowOverwrite: true,
  });
  return url;
}
