import { revalidatePath } from "next/cache";
import { requireAuth } from "@/lib/auth";
import { disconnect } from "@/lib/discordConnect";

export async function POST(request) {
  const denied = requireAuth(request);
  if (denied) return denied;
  try {
    await disconnect();
    revalidatePath("/");
    revalidatePath("/work");
    return Response.json({ ok: true });
  } catch (err) {
    console.error("Discord disconnect failed:", err);
    return Response.json({ error: err.message }, { status: 500 });
  }
}
