// Decap CMS (/cms) sign-in — separate from the Discord-gated /admin panel.
export async function GET(request) {
  const host = request.headers.get("host") || "";

  const params = new URLSearchParams({
    client_id: process.env.OAUTH_CLIENT_ID,
    redirect_uri: `https://${host}/api/cms-callback`,
    scope: "repo,user",
    state: "decap-cms",
  });

  return new Response(null, {
    status: 302,
    headers: { Location: `https://github.com/login/oauth/authorize?${params}` },
  });
}
