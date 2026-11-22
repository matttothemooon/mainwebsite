// Admin: recent pastes, and deleting them.
import { requireAuth } from "@/lib/auth";
import { listPastes, deletePaste, isConfigured } from "@/lib/haste";

const NO_STORE = { "Cache-Control": "no-store" };

export async function GET(request) {
  const denied = requireAuth(request);
  if (denied) return denied;
  if (!isConfigured()) return Response.json({ configured: false, pastes: [] }, { headers: NO_STORE });
  try {
    return Response.json({ configured: true, pastes: await listPastes() }, { headers: NO_STORE });
  } catch (err) {
    console.error("Listing pastes failed:", err);
    return Response.json({ error: err.message }, { status: 500, headers: NO_STORE });
  }
}

export async function DELETE(request) {
  const denied = requireAuth(request);
  if (denied) return denied;
  const ids = new URL(request.url).searchParams.getAll("id");
  try {
    for (const id of ids) await deletePaste(id);
    return Response.json({ deleted: ids.length }, { headers: NO_STORE });
  } catch (err) {
    return Response.json({ error: err.message }, { status: 400, headers: NO_STORE });
  }
}
