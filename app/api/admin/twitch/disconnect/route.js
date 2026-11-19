import { revalidatePath } from "next/cache";
import { requireAuth } from "@/lib/auth";
import { clearConnection } from "@/lib/twitchAuth";

export async function POST(request) {
  const denied = requireAuth(request);
  if (denied) return denied;
  try {
    await clearConnection();
    revalidatePath("/");
    revalidatePath("/work");
    return Response.json({ ok: true });
  } catch (err) {
    console.error("Twitch disconnect failed:", err);
    return Response.json({ error: err.message }, { status: 500 });
  }
}
