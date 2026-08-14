// lib/auth.js
// Signed, HttpOnly session cookie. No extra dependencies — uses Node's built-in
// crypto for HMAC signing instead of a JWT library.
//
// These helpers take/return plain Web Request + Set-Cookie strings rather than
// using next/headers, so they stay framework-light and directly unit-testable.

import crypto from "crypto";

const COOKIE_NAME = "admin_session";
const STATE_COOKIE = "oauth_state";
const SESSION_TTL_MS = 1000 * 60 * 60 * 12; // 12 hours
const STATE_TTL_S = 600; // 10 minutes to complete the OAuth round trip

function secret() {
  const value = process.env.SESSION_SECRET;
  if (!value) throw new Error("SESSION_SECRET is not set");
  return value;
}

function hmac(value) {
  return crypto.createHmac("sha256", secret()).update(value).digest("hex");
}

function sign(value) {
  return `${value}.${hmac(value)}`;
}

function verify(signed) {
  const dot = signed.lastIndexOf(".");
  if (dot === -1) return null;

  const value = signed.slice(0, dot);
  const given = Buffer.from(signed.slice(dot + 1));
  const expected = Buffer.from(hmac(value));

  // Constant-time compare — timingSafeEqual throws on length mismatch.
  if (given.length !== expected.length) return null;
  if (!crypto.timingSafeEqual(given, expected)) return null;

  return value;
}

function readCookie(request, name) {
  const header = request.headers.get("cookie") || "";
  for (const pair of header.split(";")) {
    const [k, ...v] = pair.trim().split("=");
    if (k === name) return decodeURIComponent(v.join("="));
  }
  return null;
}

function hostOf(request) {
  // "[::1]:3000" -> "::1", "localhost:3000" -> "localhost"
  const raw = request.headers.get("host") || "";
  return raw.startsWith("[") ? raw.slice(1, raw.indexOf("]")) : raw.split(":")[0];
}

// Vercel serves everything over https; localhost needs Secure dropped or the
// browser silently discards the cookie.
function isLocal(request) {
  const host = hostOf(request);
  return host === "localhost" || host === "127.0.0.1" || host === "::1";
}

function cookie(request, name, value, maxAgeSeconds) {
  const flags = [
    `${name}=${encodeURIComponent(value)}`,
    "HttpOnly",
    "SameSite=Lax",
    "Path=/",
    `Max-Age=${maxAgeSeconds}`,
  ];
  if (!isLocal(request)) flags.push("Secure");
  return flags.join("; ");
}

/* ---------- allowlist ---------- */

// Comma-separated Discord user IDs. Checked on every request rather than only
// at login, so removing an ID from the env var revokes access immediately.
export function allowedIds() {
  return (process.env.DISCORD_ALLOWED_IDS || "")
    .split(",")
    .map((id) => id.trim())
    .filter(Boolean);
}

export function isAllowed(discordId) {
  return allowedIds().includes(String(discordId));
}

/* ---------- local development bypass ---------- */

// Lets `npm run dev` open the admin panel without registering a Discord app.
//
// Deliberately gated three ways — the flag on its own does nothing. It also
// requires that we are NOT running on Vercel (which always sets VERCEL=1) and
// that the request was addressed to a loopback host. So setting
// ADMIN_DEV_NO_AUTH in the deployed environment, by accident or otherwise,
// cannot unlock the live admin panel, and neither can spoofing a Host header.
export function isDevAuthBypass(request) {
  if (process.env.ADMIN_DEV_NO_AUTH !== "1") return false;
  if (process.env.VERCEL) return false;
  return isLocal(request);
}

/* ---------- OAuth state (CSRF) ---------- */

export function createState(request) {
  const nonce = crypto.randomBytes(16).toString("hex");
  return { nonce, cookie: cookie(request, STATE_COOKIE, sign(nonce), STATE_TTL_S) };
}

export function clearStateCookie(request) {
  return cookie(request, STATE_COOKIE, "", 0);
}

export function consumeState(request, given) {
  const signed = readCookie(request, STATE_COOKIE);
  if (!signed || !given) return false;

  const nonce = verify(signed);
  if (!nonce) return false;

  const a = Buffer.from(nonce);
  const b = Buffer.from(String(given));
  return a.length === b.length && crypto.timingSafeEqual(a, b);
}

/* ---------- session ---------- */

export function sessionCookie(request, user) {
  const payload = `${user.id}:${Date.now() + SESSION_TTL_MS}`;
  return cookie(request, COOKIE_NAME, sign(payload), SESSION_TTL_MS / 1000);
}

export function clearSessionCookie(request) {
  return cookie(request, COOKIE_NAME, "", 0);
}

// Returns the Discord user id, or null.
export function getSession(request) {
  if (isDevAuthBypass(request)) return "dev-local";

  const signed = readCookie(request, COOKIE_NAME);
  if (!signed) return null;

  const payload = verify(signed);
  if (!payload) return null;

  const colon = payload.lastIndexOf(":");
  if (colon === -1) return null;

  const id = payload.slice(0, colon);
  const expiresAt = Number(payload.slice(colon + 1));

  if (!Number.isFinite(expiresAt) || Date.now() > expiresAt) return null;
  if (!isAllowed(id)) return null;

  return id;
}

// Guard for protected route handlers. Returns a 401 Response when
// unauthorised, or null when the caller may proceed.
export function requireAuth(request) {
  if (getSession(request)) return null;
  return Response.json({ error: "Not authenticated" }, { status: 401 });
}
