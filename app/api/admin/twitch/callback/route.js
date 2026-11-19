// Twitch sends the owner back here after signing in. Admin only.
import { revalidatePath } from "next/cache";
import { requireAuth, consumeState, clearStateCookie } from "@/lib/auth";
import { exchangeCode, saveConnection, STATE_COOKIE, callbackUrl } from "@/lib/twitchAuth";

function back(request, outcome) {
  return new Response(null, {
    status: 302,
    headers: {
      Location: new URL(`/admin?twitch=${outcome}#mods-active`, request.url).toString(),
      "Set-Cookie": clearStateCookie(request, STATE_COOKIE),
    },
  });
}

export async function GET(request) {
  const denied = requireAuth(request);
  if (denied) return denied;

  const url = new URL(request.url);
  if (url.searchParams.get("error")) return back(request, "cancelled");
  if (!consumeState(request, url.searchParams.get("state"), STATE_COOKIE)) return back(request, "expired");

  try {
    const account = await exchangeCode(url.searchParams.get("code"), callbackUrl(request));
    await saveConnection(account);
    revalidatePath("/");
    revalidatePath("/work");
    return back(request, "connected");
  } catch (err) {
    console.error("Twitch connect failed:", err);
    return back(request, "error");
  }
}
