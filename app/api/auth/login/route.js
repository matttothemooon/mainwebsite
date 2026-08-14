import { authConfigProblems, createState, envTrimmed } from "@/lib/auth";

// Matches the callback route: a failed sign-in explains itself rather than
// returning a bare status code. The problems are built from env var *names*, so
// there is no external input here to escape.
function configError(problems) {
  return new Response(
    `<!DOCTYPE html><meta charset="utf-8">` +
      `<title>admin — sign in unavailable</title>` +
      `<body style="background:#000;color:#e8e8e8;font-family:ui-monospace,monospace;padding:40px;line-height:1.6">` +
      `<p>Discord login is not configured correctly on this deployment.</p>` +
      `<ul>${problems.map((p) => `<li>${p}</li>`).join("")}</ul>` +
      `<p>Fix in Vercel → Settings → Environment Variables, then redeploy.</p>`,
    { status: 500, headers: { "Content-Type": "text/html; charset=utf-8" } }
  );
}

export async function GET(request) {
  // Before createState, which throws on a missing SESSION_SECRET, and before
  // client_id reaches a redirect URL the browser gets to see.
  const problems = authConfigProblems();
  if (problems.length) return configError(problems);

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
