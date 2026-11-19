import { revalidatePath } from "next/cache";
import { requireAuth, isDevAuthBypass } from "@/lib/auth";
import { getProfile, saveProfile, validateProfile } from "@/lib/storage";
import { isConfigured } from "@/lib/twitch";
import { getConnection, getFollowerCounts, callbackUrl } from "@/lib/twitchAuth";
import { getConnection as getDiscordConnection, getStaffServers } from "@/lib/discordConnect";

const NO_STORE = { "Cache-Control": "no-store" };

export async function GET(request) {
  // The admin page uses this 401 to decide whether to show the editor or the
  // sign-in button.
  const denied = requireAuth(request);
  if (denied) return denied;

  try {
    const profile = await getProfile({ fresh: true });
    const connection = isConfigured() ? await getConnection() : null;
    const followerCounts = connection
      ? await getFollowerCounts(
          [...profile.experience.active, ...profile.experience.past].map((e) => e.twitch)
        )
      : null;
    const discord = await getDiscordConnection();
    const discordServers = discord ? await getStaffServers() : null;
    return Response.json(
      {
        profile,
        discordConnection: discord ? { username: discord.username, connectedAt: discord.connectedAt } : null,
        discordServers,
        twitchEnabled: isConfigured(),
        twitchConnection: connection ? { login: connection.login, connectedAt: connection.connectedAt } : null,
        // Shown in the admin panel so it can be compared with the Twitch app's
        // OAuth Redirect URLs, which must contain it exactly.
        twitchCallbackUrl: callbackUrl(request),
        followerCounts,
        devAuthBypass: isDevAuthBypass(request),
      },
      { headers: NO_STORE }
    );
  } catch (err) {
    console.error("Admin profile read failed:", err);
    return Response.json({ error: "Failed to read profile" }, { status: 500 });
  }
}

export async function PUT(request) {
  const denied = requireAuth(request);
  if (denied) return denied;

  let profile;
  try {
    profile = validateProfile(await request.json());
  } catch (err) {
    return Response.json({ error: err.message }, { status: 400 });
  }

  try {
    await saveProfile(profile);
    revalidatePath("/");
    revalidatePath("/pages");
    revalidatePath("/work");
    revalidatePath("/what-i-use");
    revalidatePath("/pages/[slug]", "page");
    return Response.json({ profile }, { headers: NO_STORE });
  } catch (err) {
    console.error("Admin profile write failed:", err);
    // Behind requireAuth, so the reason is safe to show — and without it a
    // missing storage configuration is indistinguishable from a transient
    // write failure to an authenticated admin, so include the server detail.
    return Response.json(
      { error: `Failed to save profile — ${err.message}` },
      { status: 500 }
    );
  }
}
