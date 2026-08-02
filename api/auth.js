module.exports = (req, res) => {
  const clientId = process.env.OAUTH_CLIENT_ID;
  const redirectUri = `https://${req.headers.host}/api/callback`;

  const params = new URLSearchParams({
    client_id: clientId,
    redirect_uri: redirectUri,
    scope: "repo,user",
    state: "decap-cms",
  });

  res.writeHead(302, {
    Location: `https://github.com/login/oauth/authorize?${params.toString()}`,
  });
  res.end();
};
