// lib/discordConnect.js
// The owner's Discord account connected with the "guilds" scope, to list the
// servers they own or moderate along with approximate member/online counts.
//
// Discord rotates refresh tokens on every refresh, so the whole token set
// (access token included, valid ~7 days) is stored sealed in
// data/discord-connection.json and only refreshed when the access token has
// expired, which keeps writes to roughly one a week.

import { readDataFile, writeDataFile } from "./storage.js";
import { seal, unseal } from "./seal.js";

const FILE = "discord-connection.json";
const PURPOSE = "discord-connection";
const API = "https://discord.com/api/v10";
const SERVERS_TTL_MS = 60 * 60 * 1000;
export const CONNECT_STATE_COOKIE = "discord_connect_state";
export const CONNECT_STATE_PREFIX = "connect.";

// Permission bits that count as "helps run this server".
const P = {
  KICK_MEMBERS: 1n << 1n,
  BAN_MEMBERS: 1n << 2n,
  ADMINISTRATOR: 1n << 3n,
  MANAGE_CHANNELS: 1n << 4n,
  MANAGE_GUILD: 1n << 5n,
  MANAGE_MESSAGES: 1n << 13n,
  MANAGE_ROLES: 1n << 28n,
  MODERATE_MEMBERS: 1n << 40n,
};

// "owner", "admin", "manager", "mod" or null for servers the owner can't moderate.
export function staffRole(guild) {
  if (guild.owner) return "owner";
  let perms;
  try {
    perms = BigInt(guild.permissions || "0");
  } catch {
    return null;
  }
  if (perms & P.ADMINISTRATOR) return "admin";
  if (perms & (P.MANAGE_GUILD | P.MANAGE_ROLES | P.MANAGE_CHANNELS)) return "manager";
  if (perms & (P.KICK_MEMBERS | P.BAN_MEMBERS | P.MODERATE_MEMBERS | P.MANAGE_MESSAGES)) return "mod";
  return null;
}

let connectionCache = null; // { at, value }
let serversCache = null; // { at, value }

function clientCreds() {
  return {
    client_id: (process.env.DISCORD_CLIENT_ID || "").trim(),
    client_secret: (process.env.DISCORD_CLIENT_SECRET || "").trim(),
  };
}

// { username, userId, connectedAt, accessToken, refreshToken, expiresAt } or null.
export async function getConnection({ fresh = false } = {}) {
  const ttl = connectionCache?.value ? 5 * 60 * 1000 : 60 * 1000;
  if (!fresh && connectionCache && Date.now() - connectionCache.at < ttl) return connectionCache.value;
  let value = null;
  try {
    const raw = await readDataFile(FILE);
    if (raw) {
      const saved = JSON.parse(raw);
      value = { username: saved.username, userId: saved.userId, connectedAt: saved.connectedAt, ...JSON.parse(unseal(saved.tokens, PURPOSE)) };
    }
  } catch (err) {
    console.error("Discord connection read failed:", err.message);
  }
  connectionCache = { at: Date.now(), value };
  return value;
}

async function store(conn) {
  const { username, userId, connectedAt, accessToken, refreshToken, expiresAt } = conn;
  const record = {
    username,
    userId,
    connectedAt,
    tokens: seal(JSON.stringify({ accessToken, refreshToken, expiresAt }), PURPOSE),
  };
  await writeDataFile(FILE, `${JSON.stringify(record, null, 2)}\n`, "Update Discord connection");
  connectionCache = { at: Date.now(), value: conn };
}

function tokensFrom(data) {
  return {
    accessToken: data.access_token,
    refreshToken: data.refresh_token,
    expiresAt: Date.now() + ((data.expires_in || 604800) - 3600) * 1000,
  };
}

// Swaps the code from Discord's sign-in for tokens and saves them.
export async function connectWithCode(code, redirectUri, { isAllowed = () => true } = {}) {
  const res = await fetch("https://discord.com/api/oauth2/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({ ...clientCreds(), grant_type: "authorization_code", code, redirect_uri: redirectUri }),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok || !data.access_token) {
    throw new Error(`Discord rejected the sign-in (${data.error_description || data.error || res.status})`);
  }
  if (!String(data.scope || "").split(" ").includes("guilds")) {
    throw new Error("Discord didn't grant access to your server list");
  }
  const me = await fetch(`${API}/users/@me`, { headers: { Authorization: `Bearer ${data.access_token}` } }).then((r) => r.json());
  if (!me?.id) throw new Error("Could not read your Discord account");
  if (!isAllowed(me.id)) throw new Error(`${me.username} isn't on the admin allowlist`);

  const conn = { username: me.username, userId: me.id, connectedAt: new Date().toISOString(), ...tokensFrom(data) };
  await store(conn);
  serversCache = null;
  return conn;
}

export async function disconnect() {
  const conn = await getConnection({ fresh: true });
  await writeDataFile(FILE, null, "Disconnect Discord");
  connectionCache = { at: Date.now(), value: null };
  serversCache = null;
  if (conn?.refreshToken) {
    fetch("https://discord.com/api/oauth2/token/revoke", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({ ...clientCreds(), token: conn.refreshToken, token_type_hint: "refresh_token" }),
    }).catch(() => {});
  }
}

async function accessToken() {
  let conn = await getConnection();
  if (!conn) return null;
  if (Date.now() < conn.expiresAt) return conn.accessToken;

  // Another server instance may already have refreshed (and rotated) it.
  conn = await getConnection({ fresh: true });
  if (!conn) return null;
  if (Date.now() < conn.expiresAt) return conn.accessToken;

  const res = await fetch("https://discord.com/api/oauth2/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({ ...clientCreds(), grant_type: "refresh_token", refresh_token: conn.refreshToken }),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok || !data.access_token) {
    console.error("Discord token refresh failed:", res.status, data.error);
    return null;
  }
  const next = { ...conn, ...tokensFrom(data) };
  try {
    await store(next);
  } catch (err) {
    console.error("Saving refreshed Discord token failed:", err.message);
  }
  return next.accessToken;
}

async function fetchGuilds(token) {
  const all = [];
  let after = "";
  for (let page = 0; page < 5; page++) {
    const res = await fetch(`${API}/users/@me/guilds?with_counts=true&limit=200${after ? `&after=${after}` : ""}`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    if (!res.ok) throw new Error(`Discord server list failed (${res.status})`);
    const batch = await res.json();
    all.push(...batch);
    if (batch.length < 200) break;
    after = batch[batch.length - 1].id;
  }
  return all;
}

// Servers the owner owns or moderates:
// [{ id, name, icon, role, members, online }], biggest first. Null when
// Discord isn't connected. Cached for an hour per server instance.
export async function getStaffServers() {
  if (serversCache && Date.now() - serversCache.at < SERVERS_TTL_MS) return serversCache.value;
  try {
    const token = await accessToken();
    if (!token) return null;
    const value = (await fetchGuilds(token))
      .map((g) => ({
        id: g.id,
        name: g.name,
        icon: g.icon ? `https://cdn.discordapp.com/icons/${g.id}/${g.icon}.${g.icon.startsWith("a_") ? "gif" : "webp"}?size=96` : "",
        role: staffRole(g),
        members: Number.isFinite(g.approximate_member_count) ? g.approximate_member_count : null,
        online: Number.isFinite(g.approximate_presence_count) ? g.approximate_presence_count : null,
      }))
      .filter((g) => g.role)
      .sort((a, b) => (b.members || 0) - (a.members || 0));
    serversCache = { at: Date.now(), value };
    return value;
  } catch (err) {
    if (typeof err?.digest === "string") throw err;
    console.error("Discord servers failed:", err.message);
    return serversCache?.value ?? null;
  }
}

// The servers to show on the site: all staff servers minus the ones hidden in
// the admin panel.
export async function shownServers(profile) {
  const servers = await getStaffServers();
  if (!servers) return [];
  const hidden = new Set(profile?.discord?.hidden || []);
  return servers.filter((s) => !hidden.has(s.id));
}

// Must be the same address the admin login sends, which is the one registered
// with the Discord app.
export function loginCallbackUrl(request) {
  const host = request.headers.get("host") || "";
  const protocol = host.startsWith("localhost") ? "http" : "https";
  return `${protocol}://${host}/api/auth/callback`;
}
