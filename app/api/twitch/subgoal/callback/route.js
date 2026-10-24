import {
  clearStateCookie,
  consumeState,
} from "@/lib/auth";
import {
  fetchActiveSubscribers,
  readSubgoalStateById,
  registerSubgoalSubscriptions,
  subgoalClientId,
  subgoalClientSecret,
  subgoalPublicUrl,
  twitchSubgoalConfigProblems,
  validateTwitchAccessToken,
  writeSubgoalState,
} from "@/lib/twitch-subgoal";

function escapeHtml(value) {
  return String(value).replace(
    /[&<>"']/g,
    (character) =>
      ({
        "&": "&amp;",
        "<": "&lt;",
        ">": "&gt;",
        '"': "&quot;",
        "'": "&#39;",
      })[character]
  );
}

function fail(request, status, message) {
  return new Response(
    `<!doctype html><meta charset="utf-8"><title>Twitch connection failed</title>` +
      `<body style="background:#08080d;color:#eeedf4;font-family:ui-monospace,monospace;padding:32px;line-height:1.65">` +
      `<h1>Twitch connection failed</h1><p>${escapeHtml(message)}</p>` +
      `<p><a style="color:#c4c2ff" href="/stream-overlays">Return to the overlay setup</a></p></body>`,
    {
      status,
      headers: {
        "Content-Type": "text/html; charset=utf-8",
        "Cache-Control": "no-store",
        "Set-Cookie": clearStateCookie(request, "twitch_subgoal_state"),
      },
    }
  );
}

export async function GET(request) {
  const problems = twitchSubgoalConfigProblems();
  if (problems.length) return fail(request, 503, problems.join("; "));

  const url = new URL(request.url);
  const code = url.searchParams.get("code");
  const state = url.searchParams.get("state");
  if (url.searchParams.has("error")) {
    return fail(request, 400, url.searchParams.get("error_description") || "Twitch authorization was denied.");
  }
  if (!code) return fail(request, 400, "Twitch did not return an authorization code.");
  if (!consumeState(request, state, "twitch_subgoal_state")) {
    return fail(request, 400, "The Twitch authorization expired or did not match. Try connecting again.");
  }

  const redirectUri = subgoalPublicUrl("/api/twitch/subgoal/callback", request.url);
  let connectedLogin = "";
  let tokenResponse;
  let token;
  try {
    tokenResponse = await fetch("https://id.twitch.tv/oauth2/token", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        client_id: subgoalClientId(),
        client_secret: subgoalClientSecret(),
        grant_type: "authorization_code",
        code,
        redirect_uri: redirectUri,
      }),
    });
    token = await tokenResponse.json().catch(() => ({}));
  } catch (error) {
    console.error("Twitch sub-goal token exchange request failed:", error.message);
    return fail(request, 502, "Could not contact Twitch to complete authorization. Try again.");
  }
  if (!tokenResponse.ok || !token.access_token || !token.refresh_token) {
    console.error("Twitch sub-goal token exchange failed:", token.error || tokenResponse.status);
    return fail(request, 401, "Twitch could not complete the authorization. Check the Twitch app callback URL and try again.");
  }

  try {
    const validation = await validateTwitchAccessToken(token.access_token);
    const userResponse = await fetch("https://api.twitch.tv/helix/users", {
      headers: {
        "Client-Id": subgoalClientId(),
        Authorization: `Bearer ${token.access_token}`,
      },
      cache: "no-store",
    });
    if (!userResponse.ok) throw new Error(`Twitch account lookup failed (${userResponse.status})`);
    const user = (await userResponse.json()).data?.[0];
    if (!user || user.id !== validation.user_id) {
      throw new Error("Twitch returned an inconsistent broadcaster identity");
    }

    connectedLogin = user.login;
    const previousState = await readSubgoalStateById(user.id);
    const count = Number.isSafeInteger(previousState?.count)
      ? previousState.count
      : await fetchActiveSubscribers({
          broadcasterId: user.id,
          accessToken: token.access_token,
        });
    const saved = {
      broadcasterId: user.id,
      login: user.login,
      accessToken: token.access_token,
      refreshToken: token.refresh_token,
      expiresAt: Date.now() + token.expires_in * 1000,
      goal: previousState?.broadcasterId === user.id ? previousState.goal : 100,
      count,
      recentEventIds: previousState?.recentEventIds || [],
    };
    await writeSubgoalState(saved);
    await registerSubgoalSubscriptions(
      saved,
      subgoalPublicUrl("/api/twitch/subgoal/eventsub", request.url)
    );
  } catch (error) {
    console.error("Twitch sub-goal setup failed:", error.message);
    return fail(
      request,
      502,
      `Twitch authorization succeeded, but the overlay could not be set up: ${error.message}`
    );
  }

  return new Response(null, {
    status: 302,
    headers: {
      Location: `/stream-overlays?connected=${encodeURIComponent(connectedLogin)}`,
      "Cache-Control": "no-store",
      "Set-Cookie": clearStateCookie(request, "twitch_subgoal_state"),
    },
  });
}
