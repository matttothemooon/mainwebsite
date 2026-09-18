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

// Env vars the Discord login flow cannot work without. The deployed
// environment is configured in the Vercel dashboard rather than in the repo, so
// a missing value is the one failure mode that survives a green build — checked
// up front by the routes below so it surfaces as a readable message instead of
// an opaque 500. Names only; no values are ever rendered.
export function missingAuthConfig() {
  return ["DISCORD_CLIENT_ID", "DISCORD_CLIENT_SECRET", "SESSION_SECRET"].filter(
    (name) => !envTrimmed(name)
  );
}

// Everything wrong with the current auth config, as readable sentences.
//
// The client id check matters for more than diagnostics: it is the one env var
// that gets copied into a public redirect URL, so a client secret pasted into
// it by mistake is broadcast to anyone who hits /api/auth/login. Discord's own
// answer to a non-numeric client id is a bare "Invalid Form Body" at the
// authorize step, which gives no hint that a credential just leaked. Refusing
// to build the URL at all is the only response that actually contains it.
export function authConfigProblems() {
  const problems = missingAuthConfig().map((name) => `${name} is not set`);

  // Discord ids are numeric snowflakes; secrets are mixed-case alphanumeric.
  const id = envTrimmed("DISCORD_CLIENT_ID");
  if (id && !/^\d{15,25}$/.test(id)) {
    problems.push(
      "DISCORD_CLIENT_ID is not a Discord id — it should be 15-25 digits. " +
        "A client secret pasted into this field would look like this; if that " +
        "is what happened, reset the secret in Discord, because this value is " +
        "sent to the browser in a redirect URL and must be treated as public"
    );
  }

  return problems;
}

// Vercel's dashboard stores whatever you paste, and a trailing newline or space
// picked up while copying a credential is invisible in the UI but makes Discord
// reject the token exchange with a bare "invalid_client".
export function envTrimmed(name) {
  return (process.env[name] || "").trim();
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

// Site owner. Acts as the fallback so a fresh deploy is never locked out of its
// own admin panel. Not a secret — this ID is already public in StatusBlock and
// in the default profile links.
//
// CAVEAT: because this is a fallback, *clearing* DISCORD_ALLOWED_IDS does not
// lock everyone out — it reverts to this ID. To revoke this account, set
// DISCORD_ALLOWED_IDS to some other ID, or change this constant.
const OWNER_ID = "436300903927119873";

// Comma-separated Discord user IDs. Checked on every request rather than only
// at login, so removing an ID from the env var revokes access immediately.
export function allowedIds() {
  const configured = (process.env.DISCORD_ALLOWED_IDS || "")
    .split(",")
    .map((id) => id.trim())
    .filter(Boolean);

  return configured.length ? configured : [OWNER_ID];
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

  // Without a secret no cookie could ever have been signed validly, so this is
  // simply "not logged in". Returning null beats letting secret() throw a 500
  // out of every route guarded by requireAuth.
  if (!process.env.SESSION_SECRET) return null;

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
