// What's playing on Spotify right now (or the last song), for the homepage.
// Cached briefly at the edge so visitors don't each hit Spotify.
import { nowPlaying } from "@/lib/spotify";

export const dynamic = "force-dynamic";

export async function GET() {
  const now = await nowPlaying();
  return Response.json(now ?? { connected: false }, {
    headers: { "Cache-Control": "public, max-age=0, s-maxage=10, stale-while-revalidate=20" },
  });
}
