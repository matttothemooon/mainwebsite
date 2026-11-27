// Starts the owner's Spotify sign-in (for the now-playing card). Admin only.
import { requireAuth, createState } from "@/lib/auth";
import { isConfigured, STATE_COOKIE, callbackUrl, SPOTIFY_SCOPES } from "@/lib/spotify";

export async function GET(request) {
  const denied = requireAuth(request);
  if (denied) return denied;
  if (!isConfigured()) {
    return new Response(null, { status: 302, headers: { Location: "/admin?spotify=not-configured#profile" } });
  }

  const { nonce, cookie } = createState(request, STATE_COOKIE);
  const params = new URLSearchParams({
    client_id: process.env.SPOTIFY_CLIENT_ID,
    redirect_uri: callbackUrl(request),
    response_type: "code",
    scope: SPOTIFY_SCOPES.join(" "),
    state: nonce,
  });
  return new Response(null, {
    status: 302,
    headers: { Location: `https://accounts.spotify.com/authorize?${params}`, "Set-Cookie": cookie },
  });
}
