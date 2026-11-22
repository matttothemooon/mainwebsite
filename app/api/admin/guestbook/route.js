// Admin: the guestbook review queue.
import { revalidatePath } from "next/cache";
import { requireAuth } from "@/lib/auth";
import { pendingEntries, adminApproved, approve, remove, isConfigured } from "@/lib/guestbook";

const NO_STORE = { "Cache-Control": "no-store" };

export async function GET(request) {
  const denied = requireAuth(request);
  if (denied) return denied;
  if (!isConfigured()) return Response.json({ configured: false }, { headers: NO_STORE });
  try {
    const [pending, approved] = await Promise.all([pendingEntries(), adminApproved()]);
    return Response.json({ configured: true, pending, approved }, { headers: NO_STORE });
  } catch (err) {
    console.error("Guestbook read failed:", err);
    return Response.json({ error: err.message }, { status: 500, headers: NO_STORE });
  }
}

// { action: "approve" | "delete", id }
export async function POST(request) {
  const denied = requireAuth(request);
  if (denied) return denied;
  try {
    const { action, id } = await request.json();
    if (action === "approve") await approve(id);
    else if (action === "delete") await remove(id);
    else throw new Error("Unknown action");
    revalidatePath("/guestbook");
    return Response.json({ ok: true }, { headers: NO_STORE });
  } catch (err) {
    return Response.json({ error: err.message }, { status: 400, headers: NO_STORE });
  }
}
