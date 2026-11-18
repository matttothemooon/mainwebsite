// Live status for the homepage's streamer grid. Public, but it only ever asks
// Twitch about the channels on the saved profile, and results are cached.
import { getProfile } from "@/lib/storage";
import { getLiveStatus, profileLogins } from "@/lib/twitch";

export async function GET() {
  const profile = await getProfile();
  const channels = await getLiveStatus(profileLogins(profile));
  return Response.json(
    { channels },
    { headers: { "Cache-Control": "public, max-age=30, s-maxage=60, stale-while-revalidate=60" } }
  );
}
