import { requireAuth } from "@/lib/auth";
import { isConfigured, viewStats } from "@/lib/views";

const NO_STORE = { "Cache-Control": "no-store" };

export async function GET(request) {
  const denied = requireAuth(request);
  if (denied) return denied;
  if (!isConfigured()) return Response.json({ configured: false }, { headers: NO_STORE });
  try {
    return Response.json({ configured: true, ...(await viewStats()) }, { headers: NO_STORE });
  } catch (err) {
    console.error("Reading visitor stats failed:", err);
    return Response.json({ configured: true, error: err.message }, { status: 500, headers: NO_STORE });
  }
}
