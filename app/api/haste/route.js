// Creates a paste. Public, so it's size-capped and rate-limited.
import { createPaste, isConfigured, rateLimited, clientIp, hashIp, MAX_BYTES } from "@/lib/haste";

const json = (body, status = 200, headers = {}) =>
  Response.json(body, { status, headers: { "Cache-Control": "no-store", ...headers } });

export async function POST(request) {
  if (!isConfigured()) return json({ error: "Pastes aren't switched on for this site yet." }, 503);

  const length = Number(request.headers.get("content-length"));
  if (Number.isFinite(length) && length > MAX_BYTES * 2) return json({ error: "That paste is too big." }, 413);

  let body;
  try {
    body = await request.json();
  } catch {
    return json({ error: "Invalid request" }, 400);
  }
  // Honeypot field the page never fills in; bots tend to.
  if (body?.website) return json({ error: "Invalid request" }, 400);

  const ip = clientIp(request);
  const wait = rateLimited(`ip:${ip}`) || rateLimited("all", { max: 300, windowMs: 60 * 60 * 1000 });
  if (wait) {
    return json({ error: `Too many pastes. Try again in ${Math.ceil(wait / 60)} min.` }, 429, { "Retry-After": String(wait) });
  }

  try {
    const id = await createPaste({
      content: body?.content,
      language: body?.language,
      expiry: body?.expiry,
      ipHash: hashIp(ip),
    });
    return json({ id, url: `/haste/${id}` }, 201);
  } catch (err) {
    const userError = /empty|up to|free paste id/.test(err.message);
    if (!userError) console.error("Paste save failed:", err);
    return json({ error: userError ? err.message : "Could not save the paste. Try again." }, userError ? 400 : 500);
  }
}
