// lib/auth.js
// Signed, HttpOnly session cookie. No extra dependencies — uses Node's
// built-in crypto for HMAC signing instead of a JWT library.

import crypto from "crypto";

const COOKIE_NAME = "admin_session";
const SESSION_TTL_MS = 1000 * 60 * 60 * 12; // 12 hours

function sign(value) {
  const hmac = crypto
    .createHmac("sha256", process.env.SESSION_SECRET)
    .update(value)
    .digest("hex");
  return `${value}.${hmac}`;
}

function verify(signed) {
  const dot = signed.lastIndexOf(".");
  if (dot === -1) return null;

  const value = signed.slice(0, dot);
  const hmac = signed.slice(dot + 1);

  const expected = crypto
    .createHmac("sha256", process.env.SESSION_SECRET)
    .update(value)
    .digest("hex");

  if (hmac !== expected) return null;
  return value;
}

function parseCookies(req) {
  const header = req.headers.cookie || "";
  return Object.fromEntries(
    header
      .split(";")
      .filter(Boolean)
      .map((pair) => {
        const [k, ...v] = pair.trim().split("=");
        return [k, v.join("=")];
      })
  );
}

export function setSessionCookie(res, githubUsername) {
  const payload = `${githubUsername}:${Date.now() + SESSION_TTL_MS}`;
  const signed = sign(payload);
  res.setHeader(
    "Set-Cookie",
    `${COOKIE_NAME}=${signed}; HttpOnly; Secure; SameSite=Lax; Path=/; Max-Age=${SESSION_TTL_MS / 1000}`
  );
}

export function clearSessionCookie(res) {
  res.setHeader(
    "Set-Cookie",
    `${COOKIE_NAME}=; HttpOnly; Secure; SameSite=Lax; Path=/; Max-Age=0`
  );
}

// Returns true/false — does NOT send a response, callers decide what to do.
export function isAuthenticated(req) {
  const cookies = parseCookies(req);
  const signed = cookies[COOKIE_NAME];
  if (!signed) return false;

  const payload = verify(signed);
  if (!payload) return false;

  const lastColon = payload.lastIndexOf(":");
  const username = payload.slice(0, lastColon);
  const expiresAt = Number(payload.slice(lastColon + 1));

  if (Date.now() > expiresAt) return false;
  if (username !== process.env.GITHUB_ALLOWED_USER) return false;

  return true;
}
