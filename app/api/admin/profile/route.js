import { revalidatePath } from "next/cache";
import { requireAuth, isDevAuthBypass } from "@/lib/auth";
import { getProfile, saveProfile, validateProfile } from "@/lib/storage";
import { isConfigured } from "@/lib/twitch";
import { postChangelogEntry } from "@/lib/discord";

const NO_STORE = { "Cache-Control": "no-store" };

export async function GET(request) {
  // The admin page uses this 401 to decide whether to show the editor or the
  // sign-in button.
  const denied = requireAuth(request);
  if (denied) return denied;

  try {
    return Response.json(
      {
        profile: await getProfile({ fresh: true }),
        twitchEnabled: isConfigured(),
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
    const current = await getProfile({ fresh: true });
    const existingIds = new Set(current.changelog.map((entry) => entry.id));
    const newEntries = profile.changelog.filter((entry) => !existingIds.has(entry.id));
    for (const entry of newEntries) await postChangelogEntry(entry);
    await saveProfile(profile);
    // Drop the cached homepage so edits are live straight away.
    revalidatePath("/");
    revalidatePath("/changelog");
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
