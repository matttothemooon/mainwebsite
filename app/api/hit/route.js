// Records one page view. Called by components/site/ViewTracker in the
// browser, so link previews and crawlers (which don't run scripts) aren't
// counted; known bots and the signed-in owner are skipped too.
import { getSession } from "@/lib/auth";
import { clientIp, rateLimited } from "@/lib/haste";
import { isConfigured, normalizePath, isBot, referrerHost, visitorHash, recordView } from "@/lib/views";

const done = () => new Response(null, { status: 204, headers: { "Cache-Control": "no-store" } });

export async function POST(request) {
  if (!isConfigured()) return done();
  const ua = request.headers.get("user-agent") || "";
  // Your own visits don't count. ("dev-local" is the local-development
  // admin bypass, which would otherwise make every visit look like yours.)
  const owner = getSession(request);
  if (isBot(ua) || (owner && owner !== "dev-local")) return done();

  let body;
  try {
    body = JSON.parse(await request.text());
  } catch {
    return done();
  }
  const path = normalizePath(body?.path);
  if (!path) return done();

  const ip = clientIp(request);
  // A generous cap per visitor so one script can't run the numbers up.
  if (rateLimited(`hit:${ip}`, { max: 60, windowMs: 10 * 60 * 1000 })) return done();

  try {
    await recordView({
      path,
      referrer: referrerHost(body?.referrer, request.headers.get("host")),
      visitor: visitorHash(ip, ua),
    });
  } catch (err) {
    console.error("Recording a view failed:", err.message);
  }
  return done();
}
