import { requireAuth } from "@/lib/auth";
import { clearConnection } from "@/lib/spotify";

export async function POST(request) {
  const denied = requireAuth(request);
  if (denied) return denied;
  try {
    await clearConnection();
    return Response.json({ ok: true });
  } catch (err) {
    console.error("Spotify disconnect failed:", err);
    return Response.json({ error: err.message }, { status: 500 });
  }
}
