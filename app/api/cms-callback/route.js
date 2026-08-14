// Decap CMS (/cms) OAuth callback.
const html = (body) =>
  new Response(body, { headers: { "Content-Type": "text/html; charset=utf-8" } });

export async function GET(request) {
  const url = new URL(request.url);
  const code = url.searchParams.get("code");
  const error = url.searchParams.get("error");

  if (error) {
    return new Response(
      `GitHub OAuth error: ${url.searchParams.get("error_description") || error}`,
      { status: 400 }
    );
  }

  try {
    const tokenRes = await fetch("https://github.com/login/oauth/access_token", {
      method: "POST",
      headers: { "Content-Type": "application/json", Accept: "application/json" },
      body: JSON.stringify({
        client_id: process.env.OAUTH_CLIENT_ID,
        client_secret: process.env.OAUTH_CLIENT_SECRET,
        code,
        redirect_uri: `https://${request.headers.get("host")}/api/cms-callback`,
      }),
    });
    const data = await tokenRes.json();

    if (data.error) {
      return new Response(`Error: ${data.error_description || data.error}`, { status: 400 });
    }

    const payload = JSON.stringify({ token: data.access_token, provider: "github" });

    return html(`
      <script>
        (function() {
          function receiveMessage(e) {
            window.opener.postMessage(
              'authorization:github:success:${payload}',
              e.origin
            );
            window.removeEventListener("message", receiveMessage, false);
          }
          window.addEventListener("message", receiveMessage, false);
          window.opener.postMessage("authorizing:github", "*");
        })();
      </script>
    `);
  } catch (err) {
    return new Response(`OAuth error: ${err.message}`, { status: 500 });
  }
}
