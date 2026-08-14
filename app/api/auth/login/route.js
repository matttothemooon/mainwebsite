import { createState } from "@/lib/auth";

export async function GET(request) {
  const { host, protocol } = originOf(request);
  const { nonce, cookie } = createState(request);

  const params = new URLSearchParams({
    client_id: process.env.DISCORD_CLIENT_ID,
    redirect_uri: `${protocol}://${host}/api/auth/callback`,
    response_type: "code",
    scope: "identify",
    prompt: "none",
    state: nonce,
  });

  return new Response(null, {
    status: 302,
    headers: {
      Location: `https://discord.com/oauth2/authorize?${params}`,
      "Set-Cookie": cookie,
    },
  });
}

function originOf(request) {
  const host = request.headers.get("host") || "";
  return { host, protocol: host.startsWith("localhost") ? "http" : "https" };
}
