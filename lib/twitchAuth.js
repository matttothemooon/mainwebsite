// lib/twitchAuth.js
// The site owner's own Twitch sign-in, used to read follower counts.
//
// Twitch only gives follower totals to *user* tokens, not to app tokens. The
// owner signs in once from the admin panel; the refresh token is stored
// encrypted (AES-256-GCM, key derived from SESSION_SECRET) in
// data/twitch-connection.json, because the repo is public. Access tokens are
// minted from it on demand and kept only in memory.

import { readDataFile, writeDataFile } from "./storage.js";
import { seal, unseal } from "./seal.js";

const FILE = "twitch-connection.json";
const FOLLOWERS_TTL_MS = 60 * 60 * 1000;
const CONNECTION_TTL_MS = 5 * 60 * 1000;

// Same key as before the helper moved to lib/seal.js, so the saved
// connection keeps decrypting.
export const encrypt = (text) => seal(text, "twitch-connection");
export const decrypt = (sealed) => unseal(sealed, "twitch-connection");

let connectionCache = null; // { at, value }
let accessCache = null; // { token, expiresAt }
let followersCache = null; // { key, at, value }

// { login, userId, connectedAt, refreshToken } or null.
export async function getConnection() {
  // "Not connected" is re-checked sooner, so a new connection shows up fast.
  const ttl = connectionCache?.value ? CONNECTION_TTL_MS : 60 * 1000;
  if (connectionCache && Date.now() - connectionCache.at < ttl) return connectionCache.value;
  let value = null;
  try {
    const raw = await readDataFile(FILE);
    if (raw) {
      const saved = JSON.parse(raw);
      value = { login: saved.login, userId: saved.userId, connectedAt: saved.connectedAt, refreshToken: decrypt(saved.refresh) };
    }
  } catch (err) {
    console.error("Twitch connection read failed:", err.message);
  }
  connectionCache = { at: Date.now(), value };
  return value;
}

export async function saveConnection({ login, userId, refreshToken, accessToken, expiresIn }) {
  const record = { login, userId, connectedAt: new Date().toISOString(), refresh: encrypt(refreshToken) };
  await writeDataFile(FILE, `${JSON.stringify(record, null, 2)}\n`, "Connect Twitch for follower counts");
  connectionCache = { at: Date.now(), value: { login, userId, connectedAt: record.connectedAt, refreshToken } };
  accessCache = accessToken ? { token: accessToken, expiresAt: Date.now() + (expiresIn - 60) * 1000 } : null;
  followersCache = null;
}

export async function clearConnection() {
  const current = await getConnection();
  await writeDataFile(FILE, null, "Disconnect Twitch");
  connectionCache = { at: Date.now(), value: null };
  accessCache = null;
  followersCache = null;
  if (current?.refreshToken) {
    // Best effort: tell Twitch to forget the token too.
    fetch("https://id.twitch.tv/oauth2/revoke", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({ client_id: process.env.TWITCH_CLIENT_ID, token: current.refreshToken }),
    }).catch(() => {});
  }
}

export async function exchangeCode(code, redirectUri) {
  const res = await fetch("https://id.twitch.tv/oauth2/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      client_id: process.env.TWITCH_CLIENT_ID,
      client_secret: process.env.TWITCH_CLIENT_SECRET,
      code,
      grant_type: "authorization_code",
      redirect_uri: redirectUri,
    }),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok || !data.access_token) {
    throw new Error(`Twitch rejected the sign-in (${res.status}${data.message ? `: ${data.message}` : ""})`);
  }

  const who = await fetch("https://id.twitch.tv/oauth2/validate", {
    headers: { Authorization: `OAuth ${data.access_token}` },
  }).then((r) => r.json());
  if (!who?.login) throw new Error("Could not read the Twitch account");

  return {
    login: who.login,
    userId: who.user_id,
    refreshToken: data.refresh_token,
    accessToken: data.access_token,
    expiresIn: data.expires_in,
  };
}

async function userToken() {
  if (accessCache && Date.now() < accessCache.expiresAt) return accessCache.token;
  const conn = await getConnection();
  if (!conn) return null;

  const res = await fetch("https://id.twitch.tv/oauth2/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      client_id: process.env.TWITCH_CLIENT_ID,
      client_secret: process.env.TWITCH_CLIENT_SECRET,
      grant_type: "refresh_token",
      refresh_token: conn.refreshToken,
    }),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok || !data.access_token) {
    console.error("Twitch token refresh failed:", res.status, data.message);
    return null;
  }
  accessCache = { token: data.access_token, expiresAt: Date.now() + ((data.expires_in || 3600) - 60) * 1000 };
  if (data.refresh_token && data.refresh_token !== conn.refreshToken) {
    // Twitch can rotate it; keep the newest so the next cold start still works.
    saveConnection({ ...conn, refreshToken: data.refresh_token, accessToken: data.access_token, expiresIn: data.expires_in })
      .catch((err) => console.error("Saving rotated Twitch token failed:", err.message));
  }
  return accessCache.token;
}

function helix(pathAndQuery, token) {
  return fetch(`https://api.twitch.tv/helix/${pathAndQuery}`, {
    headers: { "Client-Id": process.env.TWITCH_CLIENT_ID, Authorization: `Bearer ${token}` },
  });
}

// { [login]: followerTotal } for the given channels, or null when Twitch isn't
// connected. Cached for an hour per server instance.
export async function getFollowerCounts(rawLogins = []) {
  if (!process.env.TWITCH_CLIENT_ID || !process.env.TWITCH_CLIENT_SECRET) return null;
  const logins = [...new Set(rawLogins.map((l) => String(l || "").toLowerCase()).filter(Boolean))].sort().slice(0, 100);
  if (!logins.length) return {};
  const cacheKey = logins.join(",");
  if (followersCache?.key === cacheKey && Date.now() - followersCache.at < FOLLOWERS_TTL_MS) return followersCache.value;

  try {
    const token = await userToken();
    if (!token) return null;
    const usersRes = await helix(`users?${logins.map((l) => `login=${encodeURIComponent(l)}`).join("&")}`, token);
    if (!usersRes.ok) throw new Error(`users lookup ${usersRes.status}`);
    const users = (await usersRes.json()).data || [];
    const pairs = await Promise.all(
      users.map(async (u) => {
        const r = await helix(`channels/followers?broadcaster_id=${u.id}&first=1`, token);
        if (!r.ok) return [u.login, null];
        const total = (await r.json()).total;
        return [u.login, Number.isFinite(total) ? total : null];
      })
    );
    const value = Object.fromEntries(pairs.filter(([, n]) => n !== null));
    followersCache = { key: cacheKey, at: Date.now(), value };
    return value;
  } catch (err) {
    if (typeof err?.digest === "string") throw err;
    console.error("Twitch follower counts failed:", err.message);
    return followersCache?.key === cacheKey ? followersCache.value : null;
  }
}

// The profile with each mod-list entry's follower count replaced by Twitch's
// current number where one is available.
export async function withLiveFollowers(profile) {
  const exp = profile?.experience || {};
  const counts = await getFollowerCounts([...(exp.active || []), ...(exp.past || [])].map((e) => e.twitch));
  if (!counts) return profile;
  const apply = (e) => (e.twitch && Number.isFinite(counts[e.twitch]) ? { ...e, followers: counts[e.twitch] } : e);
  return {
    ...profile,
    experience: { ...exp, active: (exp.active || []).map(apply), past: (exp.past || []).map(apply) },
  };
}

export const STATE_COOKIE = "twitch_state";

// Where Twitch sends the owner back to. Must also be listed under the Twitch
// app's OAuth Redirect URLs (dev.twitch.tv/console).
export function callbackUrl(request) {
  // Vercel passes the public host in x-forwarded-host; prefer it over Host.
  const host = (request.headers.get("x-forwarded-host") || request.headers.get("host") || "").split(",")[0].trim();
  const protocol = /^(localhost|127\.0\.0\.1|\[::1\])(:|$)/.test(host) ? "http" : "https";
  return `${protocol}://${host}/api/admin/twitch/callback`;
}
