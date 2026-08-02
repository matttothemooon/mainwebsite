module.exports = async (req, res) => {
  const { code, error, error_description } = req.query;

  if (error) {
    res.status(400).send(`GitHub OAuth error: ${error_description || error}`);
    return;
  }

  const clientId = process.env.OAUTH_CLIENT_ID;
  const clientSecret = process.env.OAUTH_CLIENT_SECRET;
  const redirectUri = `https://${req.headers.host}/api/callback`;

  try {
    const tokenRes = await fetch("https://github.com/login/oauth/access_token", {
      method: "POST",
      headers: { "Content-Type": "application/json", Accept: "application/json" },
      body: JSON.stringify({
        client_id: clientId,
        client_secret: clientSecret,
        code,
        redirect_uri: redirectUri,
      }),
    });
    const data = await tokenRes.json();

    if (data.error) {
      res.status(400).send(`Error: ${data.error_description || data.error}`);
      return;
    }

    const payload = JSON.stringify({ token: data.access_token, provider: "github" });

    res.setHeader("Content-Type", "text/html");
    res.status(200).send(`
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
    res.status(500).send("OAuth error: " + err.message);
  }
};
