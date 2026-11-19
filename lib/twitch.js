// lib/twitch.js
// Optional convenience layer for the admin panel: looks up a channel's display
// name and avatar so they don't have to be pasted by hand.
//
// Requires TWITCH_CLIENT_ID / TWITCH_CLIENT_SECRET. When those are unset every
// field in the admin panel still works — it just has to be filled in manually.

let cachedToken = null; // { value, expiresAt } — reused across warm invocations

export function isConfigured() {
  return Boolean(process.env.TWITCH_CLIENT_ID && process.env.TWITCH_CLIENT_SECRET);
}

async function appToken() {
  if (cachedToken && Date.now() < cachedToken.expiresAt) return cachedToken.value;

  const params = new URLSearchParams({
    client_id: process.env.TWITCH_CLIENT_ID,
    client_secret: process.env.TWITCH_CLIENT_SECRET,
    grant_type: "client_credentials",
  });

  const res = await fetch("https://id.twitch.tv/oauth2/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: params,
  });
  if (!res.ok) throw new Error(`Twitch token request failed: ${res.status}`);

  const data = await res.json();
  if (!data.access_token) throw new Error("Twitch returned no access token");

  cachedToken = {
    value: data.access_token,
    // Refresh a minute early rather than racing the expiry.
    expiresAt: Date.now() + (data.expires_in - 60) * 1000,
  };
  return cachedToken.value;
}

function helix(path, token) {
  return fetch(`https://api.twitch.tv/helix/${path}`, {
    headers: {
      "Client-Id": process.env.TWITCH_CLIENT_ID,
      Authorization: `Bearer ${token}`,
    },
  });
}

// Returns { twitch, name, avatar, followers } or null when the channel doesn't
// exist. `followers` is null when Twitch won't serve the count (see below).
export async function lookupChannel(login) {
  const token = await appToken();

  const userRes = await helix(`users?login=${encodeURIComponent(login)}`, token);
  if (!userRes.ok) throw new Error(`Twitch user lookup failed: ${userRes.status}`);

  const user = (await userRes.json()).data?.[0];
  if (!user) return null;

  return {
    twitch: user.login,
    name: user.display_name,
    avatar: user.profile_image_url || "",
    followers: await followerCount(user.id, token),
  };
}

// Twitch locked follower counts behind a *user* token carrying the
// moderator:read:followers scope for that specific channel (June 2023). An app
// token can't satisfy that for someone else's channel, so this returns null far
// more often than not — the admin panel falls back to the number you type in.
async function followerCount(broadcasterId, token) {
  try {
    const res = await helix(`channels/followers?broadcaster_id=${broadcasterId}&first=1`, token);
    if (!res.ok) return null;

    const total = (await res.json()).total;
    return Number.isFinite(total) ? total : null;
  } catch {
    return null;
  }
}

// ---------- live status for the homepage ----------
//
// Public pages call this, so results are cached per server instance for a
// minute: however many people load the page, Twitch sees at most one pair of
// requests per minute per instance.
const LIVE_TTL_MS = 60_000;
let liveCache = null; // { key, at, value, pending }

const cleanLogin = (s) => String(s || "").toLowerCase().replace(/[^a-z0-9_]/g, "");

async function fetchLive(logins, token) {
  const query = (param) => logins.map((l) => `${param}=${encodeURIComponent(l)}`).join("&");
  const [usersRes, streamsRes] = await Promise.all([
    helix(`users?${query("login")}`, token),
    helix(`streams?${query("user_login")}&first=100`, token),
  ]);
  if (!usersRes.ok || !streamsRes.ok) {
    throw new Error(`Twitch live lookup failed: ${usersRes.status}/${streamsRes.status}`);
  }

  const users = (await usersRes.json()).data || [];
  const streams = (await streamsRes.json()).data || [];
  const channels = {};
  for (const u of users) {
    channels[u.login] = { avatar: u.profile_image_url || "", live: false };
  }
  for (const s of streams) {
    const login = s.user_login;
    channels[login] = {
      ...(channels[login] || { avatar: "" }),
      live: s.type === "live",
      title: s.title || "",
      game: s.game_name || "",
      viewers: s.viewer_count ?? null,
    };
  }
  return channels;
}

// Returns { [login]: { avatar, live, title?, game?, viewers? } }, or null when
// Twitch isn't configured or can't be reached (the page then renders without it).
export async function getLiveStatus(rawLogins = []) {
  if (!isConfigured()) return null;
  const logins = [...new Set(rawLogins.map(cleanLogin).filter(Boolean))].sort().slice(0, 100);
  if (!logins.length) return {};

  const key = logins.join(",");
  const now = Date.now();
  if (liveCache?.key === key) {
    if (liveCache.value && now - liveCache.at < LIVE_TTL_MS) return liveCache.value;
    if (liveCache.pending) return liveCache.pending;
  }

  const pending = appToken()
    .then((token) => fetchLive(logins, token))
    .then((value) => {
      liveCache = { key, at: Date.now(), value, pending: null };
      return value;
    })
    .catch((err) => {
      console.error("Twitch live status failed:", err);
      // Serve the last good answer for this list if there is one.
      const stale = liveCache?.key === key ? liveCache.value : null;
      liveCache = stale ? { key, at: Date.now() - LIVE_TTL_MS / 2, value: stale, pending: null } : null;
      return stale;
    });

  liveCache = { ...(liveCache?.key === key ? liveCache : { key, at: 0, value: null }), pending };
  return pending;
}

// The site owner's own channel: the first twitch.tv link in their socials.
export function ownLogin(profile) {
  for (const link of profile?.links || []) {
    const match = String(link.url || "").match(/^https?:\/\/(?:www\.)?twitch\.tv\/([a-z0-9_]+)/i);
    if (match) return match[1].toLowerCase();
  }
  return "";
}

// Every channel the homepage shows live status for: the owner's own, the mod
// list (active and past) and testimonial authors (for their avatars).
export function profileLogins(profile) {
  const exp = profile?.experience || {};
  return [
    ownLogin(profile),
    ...[...(exp.active || []), ...(exp.past || [])].map((e) => e.twitch),
    ...(profile?.testimonials || []).map((t) => t.twitch),
  ].filter(Boolean);
}
