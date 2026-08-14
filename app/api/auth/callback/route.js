import {
  clearStateCookie,
  consumeState,
  envTrimmed,
  isAllowed,
  missingAuthConfig,
  sessionCookie,
} from "@/lib/auth";

// Messages embed values from Discord (error text, usernames), so escape rather
// than interpolating them into the markup raw.
function escapeHtml(value) {
  return String(value).replace(
    /[&<>"']/g,
    (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]
  );
}

// Rendered instead of a bare status code so a failed login explains itself.
function fail(request, status, message) {
  return new Response(
    `<!DOCTYPE html><meta charset="utf-8">` +
      `<title>admin — sign in failed</title>` +
      `<body style="background:#000;color:#e8e8e8;font-family:ui-monospace,monospace;padding:40px;line-height:1.6">` +
      `<p>${escapeHtml(message)}</p><p><a href="/admin" style="color:#4ade80">back to admin</a></p>`,
    {
      status,
      headers: {
        "Content-Type": "text/html; charset=utf-8",
        // Always burn the state cookie, whatever the outcome.
        "Set-Cookie": clearStateCookie(request),
      },
    }
  );
}

export async function GET(request) {
  const missing = missingAuthConfig();
  if (missing.length) {
    return fail(
      request,
      500,
      `Not configured on this deployment — missing ${missing.join(", ")}. ` +
        `Set ${missing.length === 1 ? "it" : "them"} in Vercel → Settings → Environment ` +
        `Variables, then redeploy (env changes only reach a new deployment).`
    );
  }

  const url = new URL(request.url);
  const code = url.searchParams.get("code");
  const state = url.searchParams.get("state");
  const error = url.searchParams.get("error");

  if (error) {
    return fail(request, 400, `Discord returned an error: ${url.searchParams.get("error_description") || error}`);
  }
  if (!code) return fail(request, 400, "Missing authorization code.");

  if (!consumeState(request, state)) {
    return fail(request, 400, "Login session expired or invalid. Please try again.");
  }

  const host = request.headers.get("host") || "";
  const protocol = host.startsWith("localhost") ? "http" : "https";

  const tokenRes = await fetch("https://discord.com/api/oauth2/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      client_id: envTrimmed("DISCORD_CLIENT_ID"),
      client_secret: envTrimmed("DISCORD_CLIENT_SECRET"),
      grant_type: "authorization_code",
      code,
      redirect_uri: `${protocol}://${host}/api/auth/callback`,
    }),
  });

  const tokenData = await tokenRes.json().catch(() => ({}));
  if (!tokenData.access_token) {
    // Discord names the actual cause here; without it every failure looks the
    // same. "invalid_client" means the client secret is wrong for this client
    // id; "invalid_grant" means the code expired, was reused, or the
    // redirect_uri differs from the one sent to /authorize.
    const reason = tokenData.error_description || tokenData.error || `HTTP ${tokenRes.status}`;
    return fail(
      request,
      401,
      `Discord rejected the token exchange: ${reason}. ` +
        `(client_id ${envTrimmed("DISCORD_CLIENT_ID")}, redirect_uri ${protocol}://${host}/api/auth/callback)`
    );
  }

  const userRes = await fetch("https://discord.com/api/users/@me", {
    headers: { Authorization: `Bearer ${tokenData.access_token}` },
  });
  if (!userRes.ok) return fail(request, 401, "Could not read your Discord profile.");

  const user = await userRes.json();
  if (!isAllowed(user.id)) {
    return fail(
      request,
      403,
      `This Discord account (${user.username} — ${user.id}) is not on the admin allowlist.`
    );
  }

  const headers = new Headers({ Location: "/admin" });
  headers.append("Set-Cookie", sessionCookie(request, user));
  headers.append("Set-Cookie", clearStateCookie(request));

  return new Response(null, { status: 302, headers });
}
