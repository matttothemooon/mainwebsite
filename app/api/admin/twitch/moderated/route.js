// Admin: the channels the owner moderates on Twitch, for syncing the mod list.
import { requireAuth } from "@/lib/auth";
import { getModeratedChannels, getFollowerCounts } from "@/lib/twitchAuth";
import { getLiveStatus } from "@/lib/twitch";

const NO_STORE = { "Cache-Control": "no-store" };

export async function GET(request) {
  const denied = requireAuth(request);
  if (denied) return denied;
  try {
    const result = await getModeratedChannels();
    if (!result) return Response.json({ connected: false }, { headers: NO_STORE });
    if (result.needsReconnect) return Response.json({ connected: true, needsReconnect: true }, { headers: NO_STORE });

    const logins = result.map((c) => c.login);
    const [live, followers] = await Promise.all([getLiveStatus(logins), getFollowerCounts(logins)]);
    const channels = result.map((c) => ({
      ...c,
      avatar: live?.[c.login]?.avatar || "",
      followers: Number.isFinite(followers?.[c.login]) ? followers[c.login] : null,
    }));
    return Response.json({ connected: true, channels }, { headers: NO_STORE });
  } catch (err) {
    console.error("Moderated channels failed:", err);
    return Response.json({ error: err.message }, { status: 500, headers: NO_STORE });
  }
}
