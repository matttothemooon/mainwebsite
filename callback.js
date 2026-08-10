// api/auth/callback.js
import { setSessionCookie } from "../../lib/auth.js";

export default async function handler(req, res) {
  const { code } = req.query;
  if (!code) return res.status(400).send("Missing code");

  const tokenRes = await fetch("https://github.com/login/oauth/access_token", {
    method: "POST",
    headers: { "Content-Type": "application/json", Accept: "application/json" },
    body: JSON.stringify({
      client_id: process.env.GITHUB_CLIENT_ID,
      client_secret: process.env.GITHUB_CLIENT_SECRET,
      code,
    }),
  });
  const tokenData = await tokenRes.json();

  if (!tokenData.access_token) {
    return res.status(401).send("GitHub authentication failed");
  }

  const userRes = await fetch("https://api.github.com/user", {
    headers: { Authorization: `Bearer ${tokenData.access_token}` },
  });
  const user = await userRes.json();

  if (user.login !== process.env.GITHUB_ALLOWED_USER) {
    return res.status(403).send("This GitHub account is not authorized for admin access.");
  }

  setSessionCookie(res, user.login);
  res.writeHead(302, { Location: "/admin" });
  res.end();
}
