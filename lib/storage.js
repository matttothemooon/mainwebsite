// lib/storage.js
import fs from "fs/promises";
import path from "path";

const LOCAL_FILE = path.join(process.cwd(), ".dev-profile.json");
const UPLOAD_DIR = path.join(process.cwd(), "public", "uploads");
const SUPABASE_URL = process.env.SUPABASE_URL?.replace(/\/$/, "");
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
const SUPABASE_BUCKET = "site-icons";

const hasSupabase = () => Boolean(SUPABASE_URL && SUPABASE_SERVICE_ROLE_KEY);

export const useLocalFile = () => !hasSupabase() && !process.env.VERCEL;

function requireSupabase() {
  if (!hasSupabase()) {
    throw new Error(
      "Supabase is not configured. Set SUPABASE_URL and " +
        "SUPABASE_SERVICE_ROLE_KEY in Vercel, then redeploy."
    );
  }
}

async function supabaseRequest(endpoint, options = {}) {
  requireSupabase();
  const response = await fetch(`${SUPABASE_URL}/rest/v1/${endpoint}`, {
    ...options,
    headers: {
      apikey: SUPABASE_SERVICE_ROLE_KEY,
      Authorization: `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`,
      "Content-Type": "application/json",
      ...(options.headers || {}),
    },
  });
  if (!response.ok) {
    const detail = await response.text();
    throw new Error(`Supabase request failed (${response.status}): ${detail}`);
  }
  return response;
}

// Shipped as the seed value and as the fallback whenever Supabase is missing
// or unreadable — the page always has something real to render.
//
// `label` is no longer displayed: links render as icons only, so it serves as
// the accessible name (aria-label / tooltip) and as the platform hint for
// relative URLs like /discord that have no hostname to detect from.
export const DEFAULT_PROFILE = {
  name: "mattothemoon",
  bio: "community mod & streamer.",
  links: [
    { label: "twitter", url: "https://x.com/matttttothemoon", iconUrl: "" },
    { label: "discord", url: "https://discord.gg/vtw6v6KG2v", iconUrl: "" },
    { label: "twitch", url: "https://www.twitch.tv/mattothemoon", iconUrl: "" },
    { label: "youtube", url: "https://www.youtube.com/@MatttToTheMoon", iconUrl: "" },
    { label: "github", url: "https://github.com/mattothemoon", iconUrl: "" },
    { label: "discord profile", url: "https://discord.com/users/436300903927119873", iconUrl: "" },
    { label: "email", url: "mailto:mattothemoon06@gmail.com", iconUrl: "" },
  ],
  experience: {
    active: [
      { role: "Mod", name: "Jasontheween", url: "https://twitch.tv/jasontheween", date: "present", twitch: "jasontheween", avatar: "", followers: null },
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

function restoreBaseline(profile) {
  const correctedUrls = new Map([
    ["https://twitch.tv/mattothemoon", "https://www.twitch.tv/mattothemoon"],
    ["https://x.com/mattothemoon", "https://x.com/matttttothemoon"],
    ["/discord", "https://discord.gg/vtw6v6KG2v"],
  ]);
  const existingLinks = profile.links.map((link) => ({
    ...link,
    url: correctedUrls.get(link.url) || link.url,
  }));
  const links = [
    ...existingLinks,
    ...DEFAULT_PROFILE.links.filter(
      (defaultLink) => !existingLinks.some((link) => link.url === defaultLink.url)
    ),
  ];
  const hasJason = [...profile.experience.active, ...profile.experience.past].some(
    (entry) => entry.twitch === "jasontheween"
  );

  return {
    ...profile,
    links,
    experience: hasJason
      ? profile.experience
      : {
          ...profile.experience,
          active: [DEFAULT_PROFILE.experience.active[0], ...profile.experience.active],
        },
  };
}

/* ---------- Supabase access ---------- */

async function readSupabaseProfile({ fresh = false } = {}) {
  const response = await supabaseRequest("site_profile?id=eq.main&select=profile&limit=1", {
    ...(fresh ? { cache: "no-store" } : { next: { revalidate: 60 } }),
  });
  const rows = await response.json();
  return rows[0]?.profile || null;
}

export async function getProfile({ fresh = false } = {}) {
  if (useLocalFile()) {
    try {
      return restoreBaseline(validateProfile(JSON.parse(await fs.readFile(LOCAL_FILE, "utf8"))));
    } catch {
      return DEFAULT_PROFILE; // nothing saved locally yet
    }
  }

  try {
    const current = await readSupabaseProfile({ fresh });
    return current ? restoreBaseline(validateProfile(current)) : DEFAULT_PROFILE;
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

  await supabaseRequest("site_profile", {
    method: "POST",
    headers: { Prefer: "resolution=merge-duplicates,return=minimal" },
    body: JSON.stringify({ id: "main", profile }),
  });
}

/* ---------- custom link icons ---------- */

export async function saveIcon(filename, bytes, contentType) {
  if (useLocalFile()) {
    await fs.mkdir(UPLOAD_DIR, { recursive: true });
    await fs.writeFile(path.join(UPLOAD_DIR, filename), bytes);
    return `/uploads/${filename}`;
  }

  requireSupabase();
  const path = `admin/icons/${filename}`;
  const response = await fetch(
    `${SUPABASE_URL}/storage/v1/object/${SUPABASE_BUCKET}/${path}`,
    {
      method: "POST",
      headers: {
        apikey: SUPABASE_SERVICE_ROLE_KEY,
        Authorization: `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`,
        "Content-Type": contentType,
        "x-upsert": "true",
      },
      body: bytes,
    }
  );
  if (!response.ok) {
    throw new Error(`Supabase icon upload failed (${response.status}): ${await response.text()}`);
  }
  return `${SUPABASE_URL}/storage/v1/object/public/${SUPABASE_BUCKET}/${path}`;
}
