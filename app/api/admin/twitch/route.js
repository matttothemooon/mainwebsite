// Looks up a channel so the admin panel can autofill. Protected: it burns the
// site's Twitch API quota, so it isn't public.
import { requireAuth } from "@/lib/auth";
import { isConfigured, lookupChannel } from "@/lib/twitch";

export async function GET(request) {
  const denied = requireAuth(request);
  if (denied) return denied;

  if (!isConfigured()) {
    return Response.json(
      { error: "Twitch lookup is not configured — set TWITCH_CLIENT_ID and TWITCH_CLIENT_SECRET." },
      { status: 501 }
    );
  }

  const raw = new URL(request.url).searchParams.get("login") || "";
  const login = raw.replace(/[^a-zA-Z0-9_]/g, "");
  if (!login) return Response.json({ error: "Missing twitch username" }, { status: 400 });

  try {
    const channel = await lookupChannel(login);
    if (!channel) {
      return Response.json({ error: `No Twitch channel called "${login}"` }, { status: 404 });
    }
    return Response.json(channel, { headers: { "Cache-Control": "no-store" } });
  } catch (err) {
    console.error("Twitch lookup failed:", err);
    return Response.json({ error: "Twitch lookup failed" }, { status: 502 });
  }
}
