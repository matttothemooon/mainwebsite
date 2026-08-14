// lib/twitch.js
// Optional convenience layer for the admin panel: looks up a channel's display
// name and avatar so they don't have to be pasted by hand.
//
// Requires TWITCH_CLIENT_ID / TWITCH_CLIENT_SECRET. When those are unset every
// field in the admin panel still works — it just has to be filled in manually.

let cachedToken = null; // { value, expiresAt } — reused across warm invocations

export function isConfigured() {
  return Boolean(process.env.TWITCH_CLIENT_ID && process.env.TWITCH_CLIENT_SECRET);
}

async function appToken() {
  if (cachedToken && Date.now() < cachedToken.expiresAt) return cachedToken.value;

  const params = new URLSearchParams({
    client_id: process.env.TWITCH_CLIENT_ID,
    client_secret: process.env.TWITCH_CLIENT_SECRET,
    grant_type: "client_credentials",
  });

  const res = await fetch("https://id.twitch.tv/oauth2/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: params,
  });
  if (!res.ok) throw new Error(`Twitch token request failed: ${res.status}`);

  const data = await res.json();
  if (!data.access_token) throw new Error("Twitch returned no access token");

  cachedToken = {
    value: data.access_token,
    // Refresh a minute early rather than racing the expiry.
    expiresAt: Date.now() + (data.expires_in - 60) * 1000,
  };
  return cachedToken.value;
}

function helix(path, token) {
  return fetch(`https://api.twitch.tv/helix/${path}`, {
    headers: {
      "Client-Id": process.env.TWITCH_CLIENT_ID,
      Authorization: `Bearer ${token}`,
    },
  });
}

// Returns { twitch, name, avatar, followers } or null when the channel doesn't
// exist. `followers` is null when Twitch won't serve the count (see below).
export async function lookupChannel(login) {
  const token = await appToken();

  const userRes = await helix(`users?login=${encodeURIComponent(login)}`, token);
  if (!userRes.ok) throw new Error(`Twitch user lookup failed: ${userRes.status}`);

  const user = (await userRes.json()).data?.[0];
  if (!user) return null;

  return {
    twitch: user.login,
    name: user.display_name,
    avatar: user.profile_image_url || "",
    followers: await followerCount(user.id, token),
  };
}

// Twitch locked follower counts behind a *user* token carrying the
// moderator:read:followers scope for that specific channel (June 2023). An app
// token can't satisfy that for someone else's channel, so this returns null far
// more often than not — the admin panel falls back to the number you type in.
async function followerCount(broadcasterId, token) {
  try {
    const res = await helix(`channels/followers?broadcaster_id=${broadcasterId}&first=1`, token);
    if (!res.ok) return null;

    const total = (await res.json()).total;
    return Number.isFinite(total) ? total : null;
  } catch {
    return null;
  }
}
