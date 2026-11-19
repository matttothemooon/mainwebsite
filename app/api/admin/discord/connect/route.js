// Starts connecting the owner's Discord server list. Admin only. Uses the same
// return address as the admin login (already registered with the Discord app);
// the "connect." prefix on state tells the callback which flow it is.
import { requireAuth, createState, authConfigProblems, envTrimmed } from "@/lib/auth";
import { CONNECT_STATE_COOKIE, CONNECT_STATE_PREFIX, loginCallbackUrl } from "@/lib/discordConnect";

export async function GET(request) {
  const denied = requireAuth(request);
  if (denied) return denied;
  if (authConfigProblems().length) {
    return new Response(null, { status: 302, headers: { Location: "/admin?discord=not-configured#discord" } });
  }

  const { nonce, cookie } = createState(request, CONNECT_STATE_COOKIE);
  const params = new URLSearchParams({
    client_id: envTrimmed("DISCORD_CLIENT_ID"),
    redirect_uri: loginCallbackUrl(request),
    response_type: "code",
    scope: "identify guilds",
    state: `${CONNECT_STATE_PREFIX}${nonce}`,
    prompt: "consent",
  });
  return new Response(null, {
    status: 302,
    headers: { Location: `https://discord.com/oauth2/authorize?${params}`, "Set-Cookie": cookie },
  });
}
