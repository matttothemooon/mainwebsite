import { revalidatePath } from "next/cache";
import { requireAuth, isDevAuthBypass } from "@/lib/auth";
import { getProfile, saveProfile, validateProfile } from "@/lib/storage";
import { isConfigured } from "@/lib/twitch";

const NO_STORE = { "Cache-Control": "no-store" };

export async function GET(request) {
  // The admin page uses this 401 to decide whether to show the editor or the
  // sign-in button.
  const denied = requireAuth(request);
  if (denied) return denied;

  try {
    return Response.json(
      {
        profile: await getProfile(),
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
    await saveProfile(profile);
    // Drop the cached homepage so edits are live straight away.
    revalidatePath("/");
    return Response.json({ profile }, { headers: NO_STORE });
  } catch (err) {
    console.error("Admin profile write failed:", err);
    // Behind requireAuth, so the reason is safe to show — and without it a
    // missing Blob store is indistinguishable from a transient write failure.
    return Response.json(
      { error: `Failed to save profile — ${err.message}` },
      { status: 500 }
    );
  }
}
