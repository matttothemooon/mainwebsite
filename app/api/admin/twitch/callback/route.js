// Twitch sends the owner back here after signing in. Admin only.
import { revalidatePath } from "next/cache";
import { requireAuth, consumeState, clearStateCookie } from "@/lib/auth";
import { exchangeCode, saveConnection, STATE_COOKIE, callbackUrl } from "@/lib/twitchAuth";

// A relative Location: request.url can carry the server's internal address
// (http://localhost:3000) on Vercel, which sent people to localhost.
function back(request, outcome, detail = "") {
  const query = new URLSearchParams({ twitch: outcome });
  if (detail) query.set("detail", String(detail).slice(0, 200));
  return new Response(null, {
    status: 302,
    headers: {
      Location: `/admin?${query}#mods-active`,
      "Set-Cookie": clearStateCookie(request, STATE_COOKIE),
    },
  });
}

export async function GET(request) {
  const denied = requireAuth(request);
  if (denied) return denied;

  const url = new URL(request.url);
  if (url.searchParams.get("error")) {
    return back(request, "cancelled", url.searchParams.get("error_description") || url.searchParams.get("error"));
  }
  if (!consumeState(request, url.searchParams.get("state"), STATE_COOKIE)) return back(request, "expired");

  try {
    const account = await exchangeCode(url.searchParams.get("code"), callbackUrl(request));
    await saveConnection(account);
    revalidatePath("/");
    revalidatePath("/work");
    return back(request, "connected");
  } catch (err) {
    console.error("Twitch connect failed:", err);
    return back(request, "error", err.message);
  }
}
