// Spotify sends the owner back here after signing in. Admin only.
import { requireAuth, consumeState, clearStateCookie } from "@/lib/auth";
import { exchangeCode, saveConnection, STATE_COOKIE, callbackUrl } from "@/lib/spotify";

// Relative Location: request.url can be the server's internal address on Vercel.
function back(request, outcome, detail = "") {
  const query = new URLSearchParams({ spotify: outcome });
  if (detail) query.set("detail", String(detail).slice(0, 200));
  return new Response(null, {
    status: 302,
    headers: { Location: `/admin?${query}#profile`, "Set-Cookie": clearStateCookie(request, STATE_COOKIE) },
  });
}

export async function GET(request) {
  const denied = requireAuth(request);
  if (denied) return denied;

  const url = new URL(request.url);
  if (url.searchParams.get("error")) return back(request, "cancelled", url.searchParams.get("error"));
  if (!consumeState(request, url.searchParams.get("state"), STATE_COOKIE)) return back(request, "expired");

  try {
    await saveConnection(await exchangeCode(url.searchParams.get("code"), callbackUrl(request)));
    return back(request, "connected");
  } catch (err) {
    console.error("Spotify connect failed:", err);
    return back(request, "error", err.message);
  }
}
