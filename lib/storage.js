// lib/storage.js
import fs from "fs/promises";
import path from "path";

const DEFAULT_GEAR = [
  { name: "Gaming PC", items: [{ label: "Example", value: "Add a product in the admin panel" }] },
  { name: "Streaming PC", items: [] },
  { name: "Peripherals", items: [] },
  { name: "Video Equipment", items: [] },
  { name: "Office Equipment", items: [] },
  { name: "Audio Equipment", items: [] },
];
const LOCAL_FILE = path.join(process.cwd(), ".dev-profile.json");
const UPLOAD_DIR = path.join(process.cwd(), "public", "uploads");
const GITHUB_API = "https://api.github.com";
const GITHUB_TOKEN = process.env.GITHUB_TOKEN;
const GITHUB_REPOSITORY = process.env.GITHUB_REPOSITORY || "matttothemooon/mainwebsite";
const GITHUB_BRANCH = process.env.GITHUB_BRANCH || "main";
const PROFILE_PATH = process.env.GITHUB_PROFILE_PATH || "data/profile.json";

const hasGitHub = () => Boolean(GITHUB_TOKEN && GITHUB_REPOSITORY);

export const useLocalFile = () => !hasGitHub() && !process.env.VERCEL;

function requireGitHub() {
  if (!hasGitHub()) {
    throw new Error(
      "GitHub storage is not configured. Set GITHUB_TOKEN in Vercel, then redeploy."
    );
  }
}

async function githubRequest(endpoint, options = {}) {
  requireGitHub();
  const response = await fetch(`${GITHUB_API}${endpoint}`, {
    ...options,
    headers: {
      Accept: "application/vnd.github+json",
      Authorization: `Bearer ${GITHUB_TOKEN}`,
      "X-GitHub-Api-Version": "2022-11-28",
      ...(options.headers || {}),
    },
  });
  if (!response.ok) {
    const detail = await response.text();
    throw new Error(`GitHub request failed (${response.status}): ${detail}`);
  }
  return response;
}

// Shipped as the seed value and as the fallback whenever GitHub is missing
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
  gear: DEFAULT_GEAR,
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

function cleanGear(raw) {
  return {
    name: str(raw?.name, 80),
    items: Array.isArray(raw?.items)
      ? raw.items.slice(0, 50).map((item) => ({
          label: str(item?.label, 80),
          value: str(item?.value, 200),
        })).filter((item) => item.label && item.value)
      : [],
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
    gear: Array.isArray(raw.gear)
      ? raw.gear.slice(0, 50).map(cleanGear).filter((category) => category.name)
      : DEFAULT_GEAR,
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

/* ---------- GitHub access ---------- */

function repositoryPath(pathname) {
  return `/repos/${GITHUB_REPOSITORY}/contents/${pathname}`;
}

async function readGitHubProfile({ fresh = false } = {}) {
  const response = await fetch(
    `https://raw.githubusercontent.com/${GITHUB_REPOSITORY}/${encodeURIComponent(GITHUB_BRANCH)}/${PROFILE_PATH}`,
    fresh ? { cache: "no-store" } : { next: { revalidate: 60 } }
  );
  if (!response.ok) {
    throw new Error(`GitHub profile read failed (${response.status})`);
  }
  return response.json();
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
    const current = await readGitHubProfile({ fresh });
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

  const endpoint = repositoryPath(PROFILE_PATH);
  let sha;
  try {
    const existing = await githubRequest(`${endpoint}?ref=${encodeURIComponent(GITHUB_BRANCH)}`);
    sha = (await existing.json()).sha;
  } catch (err) {
    if (!String(err.message).includes("(404)")) throw err;
  }

  await githubRequest(endpoint, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      message: "Update site profile",
      content: Buffer.from(`${JSON.stringify(profile, null, 2)}\n`).toString("base64"),
      branch: GITHUB_BRANCH,
      ...(sha ? { sha } : {}),
    }),
  });
}

/* ---------- custom link icons ---------- */

export async function saveIcon(filename, bytes, contentType) {
  if (useLocalFile()) {
    await fs.mkdir(UPLOAD_DIR, { recursive: true });
    await fs.writeFile(path.join(UPLOAD_DIR, filename), bytes);
    return `/uploads/${filename}`;
  }

  const path = `public/uploads/${filename}`;
  await githubRequest(repositoryPath(path), {
    method: "PUT",
    headers: { "Content-Type": contentType },
    body: JSON.stringify({
      message: "Add site icon",
      content: bytes.toString("base64"),
      branch: GITHUB_BRANCH,
    }),
  });
  return `https://raw.githubusercontent.com/${GITHUB_REPOSITORY}/${GITHUB_BRANCH}/${path}`;
}
