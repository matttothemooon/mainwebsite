// lib/views.js
// Page view counts in Upstash Redis (Vercel → Storage → Upstash for Redis),
// over its REST API so no extra package is needed. Without a database the
// counter is off on the live site and kept in memory during development.
//
// Keys:
//   views:paths            hash  path -> all-time views
//   views:day:<YYYY-MM-DD> hash  path -> views that day       (kept 120 days)
//   uv:day:<YYYY-MM-DD>    HyperLogLog of daily visitor hashes (kept 120 days)
//   ref:day:<YYYY-MM-DD>   hash  referring site -> visits       (kept 120 days)

import crypto from "crypto";

const KEEP_SECONDS = 120 * 24 * 60 * 60;

function creds() {
  const url = process.env.UPSTASH_REDIS_REST_URL || process.env.KV_REST_API_URL;
  const token = process.env.UPSTASH_REDIS_REST_TOKEN || process.env.KV_REST_API_TOKEN;
  return url && token ? { url: url.replace(/\/$/, ""), token } : null;
}

const useMemory = () => !creds() && !process.env.VERCEL;
export const isConfigured = () => Boolean(creds()) || useMemory();

/* ---------- a tiny Redis: REST, or memory for development ---------- */

// On globalThis so every route in the dev server shares one store.
const mem = (globalThis.__viewsMemory ||= new Map());
function memRun([cmd, key, ...args]) {
  const hash = () => {
    if (!mem.has(key)) mem.set(key, new Map());
    return mem.get(key);
  };
  switch (cmd) {
    case "HINCRBY": {
      const h = hash();
      h.set(args[0], (h.get(args[0]) || 0) + Number(args[1]));
      return h.get(args[0]);
    }
    case "HGETALL": {
      const h = mem.get(key);
      return h ? [...h.entries()].flat().map(String) : [];
    }
    case "PFADD": {
      if (!mem.has(key)) mem.set(key, new Set());
      args.forEach((v) => mem.get(key).add(v));
      return 1;
    }
    case "PFCOUNT": {
      const all = new Set();
      for (const k of [key, ...args]) for (const v of mem.get(k) || []) all.add(v);
      return all.size;
    }
    case "EXPIRE":
      return 1;
    default:
      throw new Error(`memory redis: ${cmd} not supported`);
  }
}

async function pipeline(commands) {
  if (useMemory()) return commands.map(memRun);
  const c = creds();
  if (!c) throw new Error("Visit counter is not configured");
  const res = await fetch(`${c.url}/pipeline`, {
    method: "POST",
    headers: { Authorization: `Bearer ${c.token}`, "Content-Type": "application/json" },
    body: JSON.stringify(commands),
    cache: "no-store",
  });
  if (!res.ok) throw new Error(`Redis request failed (${res.status})`);
  const out = await res.json();
  return out.map((r) => {
    if (r.error) throw new Error(r.error);
    return r.result;
  });
}

const toObject = (flat) => {
  const o = {};
  for (let i = 0; i < (flat || []).length; i += 2) o[flat[i]] = Number(flat[i + 1]);
  return o;
};

/* ---------- what gets counted ---------- */

export const day = (d = new Date()) => d.toISOString().slice(0, 10);

// Only the site's own pages, with pastes grouped so each one doesn't become
// its own row. Anything else (admin, API, typos) isn't counted.
export function normalizePath(raw) {
  let p = String(raw || "").split(/[?#]/)[0];
  if (p.length > 1) p = p.replace(/\/+$/, "");
  if (["/", "/pages", "/what-i-use", "/work", "/haste", "/guestbook", "/blocked-terms"].includes(p)) return p;
  if (/^\/pages\/[a-z0-9-]{1,80}$/.test(p)) return p;
  if (/^\/haste\/[a-z0-9]{6}$/.test(p)) return "/haste/*";
  return null;
}

const BOT = /bot|crawl|spider|slurp|preview|embed|discord|twitter|facebook|slack|whatsapp|telegram|skype|curl|wget|python|httpclient|headless|lighthouse|monitor/i;
export const isBot = (ua) => !ua || BOT.test(ua);

// The site the visitor came from, if it's not this one.
export function referrerHost(ref, ownHost) {
  try {
    const host = new URL(ref).hostname.replace(/^www\./, "");
    const own = String(ownHost || "").split(":")[0].replace(/^www\./, "");
    return host && host !== own ? host.slice(0, 80) : null;
  } catch {
    return null;
  }
}

// Counts the same visitor once a day without storing who they are: the hash
// changes every day, so visits can't be linked across days.
export function visitorHash(ip, ua, date = day()) {
  const salt = process.env.SESSION_SECRET || "views";
  return crypto.createHash("sha256").update(`${salt}:${date}:${ip}:${ua}`).digest("hex").slice(0, 16);
}

export async function recordView({ path, referrer, visitor, date = day() }) {
  const commands = [
    ["HINCRBY", "views:paths", path, 1],
    ["HINCRBY", `views:day:${date}`, path, 1],
    ["EXPIRE", `views:day:${date}`, KEEP_SECONDS],
    ["PFADD", `uv:day:${date}`, visitor],
    ["EXPIRE", `uv:day:${date}`, KEEP_SECONDS],
  ];
  if (referrer) {
    commands.push(["HINCRBY", `ref:day:${date}`, referrer, 1], ["EXPIRE", `ref:day:${date}`, KEEP_SECONDS]);
  }
  await pipeline(commands);
  totalCache = null;
}

/* ---------- reading ---------- */

let totalCache = null; // { at, value }

// All-time views across the site, for the public counter. Cached a minute.
export async function totalViews() {
  if (!isConfigured()) return null;
  if (totalCache && Date.now() - totalCache.at < 60 * 1000) return totalCache.value;
  try {
    const [paths] = await pipeline([["HGETALL", "views:paths"]]);
    const value = Object.values(toObject(paths)).reduce((a, b) => a + b, 0);
    totalCache = { at: Date.now(), value };
    return value;
  } catch (err) {
    console.error("Reading total views failed:", err.message);
    return totalCache?.value ?? null;
  }
}

// Everything the admin panel's Visitors section shows.
export async function viewStats({ days = 30, now = new Date() } = {}) {
  const dates = Array.from({ length: days }, (_, i) => day(new Date(now.getTime() - (days - 1 - i) * 86400000)));
  const last = (n) => dates.slice(-n).map((d) => `uv:day:${d}`);
  const commands = [
    ["HGETALL", "views:paths"],
    ...dates.map((d) => ["HGETALL", `views:day:${d}`]),
    ...dates.map((d) => ["HGETALL", `ref:day:${d}`]),
    ...dates.map((d) => ["PFCOUNT", `uv:day:${d}`]),
    ["PFCOUNT", ...last(7)],
    ["PFCOUNT", ...last(days)],
  ];
  const out = await pipeline(commands);
  const allTime = toObject(out[0]);
  const dayHashes = out.slice(1, 1 + days).map(toObject);
  const refHashes = out.slice(1 + days, 1 + 2 * days).map(toObject);
  const dayVisitors = out.slice(1 + 2 * days, 1 + 3 * days).map(Number);
  const [visitors7, visitorsAll] = out.slice(1 + 3 * days).map(Number);

  const sum = (o) => Object.values(o).reduce((a, b) => a + b, 0);
  const merge = (list) =>
    list.reduce((acc, o) => {
      for (const [k, v] of Object.entries(o)) acc[k] = (acc[k] || 0) + v;
      return acc;
    }, {});
  const top = (o, n = 10) =>
    Object.entries(o)
      .sort((a, b) => b[1] - a[1])
      .slice(0, n)
      .map(([name, count]) => ({ name, count }));

  const daily = dates.map((d, i) => ({ date: d, views: sum(dayHashes[i]), visitors: dayVisitors[i] }));
  return {
    daily,
    views: {
      today: daily[daily.length - 1].views,
      last7: daily.slice(-7).reduce((a, d) => a + d.views, 0),
      last30: daily.reduce((a, d) => a + d.views, 0),
      allTime: sum(allTime),
    },
    visitors: { today: daily[daily.length - 1].visitors, last7: visitors7, last30: visitorsAll },
    topPages: top(merge(dayHashes)),
    topReferrers: top(merge(refHashes)),
  };
}
