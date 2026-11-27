// lib/spotify.js
// What the owner is listening to on Spotify, straight from Spotify's API, so
// it shows even when Discord is closed.
//
// The owner signs in once from the admin panel. The refresh token is stored
// encrypted (key derived from SESSION_SECRET) in data/spotify-connection.json,
// because the repo is public. Access tokens live only in memory.

import { readDataFile, writeDataFile } from "./storage.js";
import { seal, unseal } from "./seal.js";

const FILE = "spotify-connection.json";
const PURPOSE = "spotify-connection";
const NOW_TTL_MS = 10 * 1000;
const CONNECTION_TTL_MS = 5 * 60 * 1000;

export const SPOTIFY_SCOPES = ["user-read-currently-playing", "user-read-recently-played"];
export const STATE_COOKIE = "spotify_state";

export const isConfigured = () => Boolean(process.env.SPOTIFY_CLIENT_ID && process.env.SPOTIFY_CLIENT_SECRET);

let connectionCache = null; // { at, value }
let accessCache = null; // { token, expiresAt }
let nowCache = null; // { at, value }

// { name, userId, connectedAt, refreshToken } or null.
export async function getConnection() {
  const ttl = connectionCache?.value ? CONNECTION_TTL_MS : 60 * 1000;
  if (connectionCache && Date.now() - connectionCache.at < ttl) return connectionCache.value;
  let value = null;
  try {
    const raw = await readDataFile(FILE);
    if (raw) {
      const saved = JSON.parse(raw);
      value = { name: saved.name, userId: saved.userId, connectedAt: saved.connectedAt, refreshToken: unseal(saved.refresh, PURPOSE) };
    }
  } catch (err) {
    console.error("Spotify connection read failed:", err.message);
  }
  connectionCache = { at: Date.now(), value };
  return value;
}

export async function saveConnection({ name, userId, refreshToken, accessToken, expiresIn, connectedAt }) {
  const record = { name, userId, connectedAt: connectedAt || new Date().toISOString(), refresh: seal(refreshToken, PURPOSE) };
  await writeDataFile(FILE, `${JSON.stringify(record, null, 2)}\n`, "Connect Spotify");
  connectionCache = { at: Date.now(), value: { name, userId, connectedAt: record.connectedAt, refreshToken } };
  accessCache = accessToken ? { token: accessToken, expiresAt: Date.now() + ((expiresIn || 3600) - 60) * 1000 } : null;
  nowCache = null;
}

export async function clearConnection() {
  await writeDataFile(FILE, null, "Disconnect Spotify");
  connectionCache = { at: Date.now(), value: null };
  accessCache = null;
  nowCache = null;
}

function tokenRequest(params) {
  const basic = Buffer.from(`${process.env.SPOTIFY_CLIENT_ID}:${process.env.SPOTIFY_CLIENT_SECRET}`).toString("base64");
  return fetch("https://accounts.spotify.com/api/token", {
    method: "POST",
    headers: { Authorization: `Basic ${basic}`, "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams(params),
    cache: "no-store",
  });
}

export async function exchangeCode(code, redirectUri) {
  const res = await tokenRequest({ grant_type: "authorization_code", code, redirect_uri: redirectUri });
  const data = await res.json().catch(() => ({}));
  if (!res.ok || !data.access_token) {
    throw new Error(`Spotify rejected the sign-in (${res.status}${data.error_description ? `: ${data.error_description}` : ""})`);
  }
  const me = await fetch("https://api.spotify.com/v1/me", { headers: { Authorization: `Bearer ${data.access_token}` } });
  const who = await me.json().catch(() => ({}));
  if (!me.ok || !who.id) throw new Error(`Could not read the Spotify account (${me.status})`);
  return {
    name: who.display_name || who.id,
    userId: who.id,
    refreshToken: data.refresh_token,
    accessToken: data.access_token,
    expiresIn: data.expires_in,
  };
}

async function accessToken() {
  if (accessCache && Date.now() < accessCache.expiresAt) return accessCache.token;
  const conn = await getConnection();
  if (!conn) return null;
  const res = await tokenRequest({ grant_type: "refresh_token", refresh_token: conn.refreshToken });
  const data = await res.json().catch(() => ({}));
  if (!res.ok || !data.access_token) {
    console.error("Spotify token refresh failed:", res.status, data.error_description || data.error);
    return null;
  }
  accessCache = { token: data.access_token, expiresAt: Date.now() + ((data.expires_in || 3600) - 60) * 1000 };
  if (data.refresh_token && data.refresh_token !== conn.refreshToken) {
    // Spotify can hand out a new refresh token; keep the newest.
    saveConnection({ ...conn, refreshToken: data.refresh_token, accessToken: data.access_token, expiresIn: data.expires_in })
      .catch((err) => console.error("Saving rotated Spotify token failed:", err.message));
  }
  return accessCache.token;
}

// Spotify's track object -> the small shape the site uses.
export function toTrack(item) {
  if (!item?.name) return null;
  const images = item.album?.images || [];
  return {
    title: item.name,
    artist: (item.artists || []).map((a) => a.name).filter(Boolean).join(", "),
    album: item.album?.name || "",
    // Smallest picture that is still at least 64px, for the 40px slot.
    art: ([...images].reverse().find((i) => (i.width || 0) >= 64) || images[0])?.url || "",
    url: item.external_urls?.spotify || "",
    durationMs: item.duration_ms || 0,
  };
}

// { playing: true, track, progressMs } while something plays,
// { playing: false, track, playedAt } with the last song otherwise,
// or null when Spotify isn't connected or can't be reached.
export async function nowPlaying() {
  if (!isConfigured()) return null;
  if (nowCache && Date.now() - nowCache.at < NOW_TTL_MS) return nowCache.value;
  try {
    const token = await accessToken();
    if (!token) return null;
    const auth = { headers: { Authorization: `Bearer ${token}` }, cache: "no-store" };

    let value = null;
    const cur = await fetch("https://api.spotify.com/v1/me/player/currently-playing", auth);
    if (cur.status === 200) {
      const data = await cur.json().catch(() => null);
      const track = toTrack(data?.item);
      if (track && data.is_playing) value = { playing: true, track, progressMs: data.progress_ms || 0 };
    } else if (cur.status !== 204) {
      throw new Error(`currently playing ${cur.status}`);
    }

    if (!value) {
      const recent = await fetch("https://api.spotify.com/v1/me/player/recently-played?limit=1", auth);
      if (!recent.ok) throw new Error(`recently played ${recent.status}`);
      const last = (await recent.json()).items?.[0];
      const track = toTrack(last?.track);
      value = track ? { playing: false, track, playedAt: last.played_at } : { playing: false, track: null };
    }

    nowCache = { at: Date.now(), value };
    return value;
  } catch (err) {
    if (typeof err?.digest === "string") throw err;
    console.error("Spotify now playing failed:", err.message);
    return nowCache?.value ?? null;
  }
}

// Where Spotify sends the owner back to. Must be listed under the Spotify
// app's Redirect URIs (developer.spotify.com/dashboard).
export function callbackUrl(request) {
  const host = (request.headers.get("x-forwarded-host") || request.headers.get("host") || "").split(",")[0].trim();
  // Spotify only allows http for loopback addresses, and not "localhost".
  const local = /^(localhost|127\.0\.0\.1|\[::1\])(:|$)/.test(host);
  return `${local ? "http" : "https"}://${local ? host.replace(/^localhost/, "127.0.0.1") : host}/api/admin/spotify/callback`;
}
