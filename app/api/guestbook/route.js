// A visitor signs the guestbook. Messages wait for the owner's approval.
import { submitEntry, isConfigured } from "@/lib/guestbook";
import { clientIp, hashIp, rateLimited } from "@/lib/haste";

const json = (body, status = 200) => Response.json(body, { status, headers: { "Cache-Control": "no-store" } });

export async function POST(request) {
  if (!isConfigured()) return json({ error: "The guestbook isn't switched on yet." }, 503);
  let body;
  try {
    body = await request.json();
  } catch {
    return json({ error: "Invalid request" }, 400);
  }
  if (body?.website) return json({ error: "Invalid request" }, 400); // honeypot

  const ip = clientIp(request);
  if (rateLimited(`gb:${ip}`, { max: 3, windowMs: 10 * 60 * 1000 }) || rateLimited("gb:all", { max: 100, windowMs: 60 * 60 * 1000 })) {
    return json({ error: "Too many messages for now. Try again later." }, 429);
  }
  try {
    await submitEntry({ name: body?.name, message: body?.message, ipHash: hashIp(ip) });
    return json({ ok: true }, 201);
  } catch (err) {
    const userError = /Add your|Write a|up to|Links/.test(err.message);
    if (!userError) console.error("Guestbook save failed:", err);
    return json({ error: userError ? err.message : "Could not send your message. Try again." }, userError ? 400 : 500);
  }
}
