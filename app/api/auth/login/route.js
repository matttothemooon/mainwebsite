import { createState, envTrimmed, missingAuthConfig } from "@/lib/auth";

// Matches the callback route: a failed sign-in explains itself rather than
// returning a bare status code.
function configError(missing) {
  return new Response(
    `<!DOCTYPE html><meta charset="utf-8">` +
      `<title>admin — sign in unavailable</title>` +
      `<body style="background:#000;color:#e8e8e8;font-family:ui-monospace,monospace;padding:40px;line-height:1.6">` +
      `<p>Discord login is not configured on this deployment.</p>` +
      `<p>Missing environment ${missing.length === 1 ? "variable" : "variables"}: ` +
      `<strong>${missing.join(", ")}</strong></p>` +
      `<p>Set ${missing.length === 1 ? "it" : "them"} in Vercel → Settings → Environment Variables, then redeploy.</p>`,
    { status: 500, headers: { "Content-Type": "text/html; charset=utf-8" } }
  );
}

export async function GET(request) {
  // Checked before createState, which throws on a missing SESSION_SECRET.
  const missing = missingAuthConfig();
  if (missing.length) return configError(missing);

  const { host, protocol } = originOf(request);
  const { nonce, cookie } = createState(request);

  const params = new URLSearchParams({
    client_id: envTrimmed("DISCORD_CLIENT_ID"),
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
