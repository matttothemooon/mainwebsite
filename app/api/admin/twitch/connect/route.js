// Starts the owner's Twitch sign-in (for follower counts). Admin only.
import { requireAuth, createState } from "@/lib/auth";
import { isConfigured } from "@/lib/twitch";
import { STATE_COOKIE, callbackUrl } from "@/lib/twitchAuth";

export async function GET(request) {
  const denied = requireAuth(request);
  if (denied) return denied;
  if (!isConfigured()) {
    return new Response(null, { status: 302, headers: { Location: "/admin?twitch=not-configured#mods-active" } });
  }

  const { nonce, cookie } = createState(request, STATE_COOKIE);
  const params = new URLSearchParams({
    client_id: process.env.TWITCH_CLIENT_ID,
    redirect_uri: callbackUrl(request),
    response_type: "code",
    scope: "moderator:read:followers",
    state: nonce,
  });
  return new Response(null, {
    status: 302,
    headers: { Location: `https://id.twitch.tv/oauth2/authorize?${params}`, "Set-Cookie": cookie },
  });
}
