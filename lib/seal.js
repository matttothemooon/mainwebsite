// Encrypts small secrets (OAuth refresh tokens) for storage in the public repo.
// AES-256-GCM with a key derived from SESSION_SECRET and a per-use label, so
// tokens for different services use different keys.
import crypto from "crypto";

function key(purpose) {
  const secret = process.env.SESSION_SECRET;
  if (!secret) throw new Error("SESSION_SECRET is not set");
  return crypto.createHash("sha256").update(`${purpose}:${secret}`).digest();
}

export function seal(text, purpose) {
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv("aes-256-gcm", key(purpose), iv);
  const data = Buffer.concat([cipher.update(text, "utf8"), cipher.final()]);
  return [iv, cipher.getAuthTag(), data].map((b) => b.toString("base64url")).join(".");
}

export function unseal(sealed, purpose) {
  const [iv, tag, data] = String(sealed).split(".").map((p) => Buffer.from(p, "base64url"));
  const decipher = crypto.createDecipheriv("aes-256-gcm", key(purpose), iv);
  decipher.setAuthTag(tag);
  return Buffer.concat([decipher.update(data), decipher.final()]).toString("utf8");
}
