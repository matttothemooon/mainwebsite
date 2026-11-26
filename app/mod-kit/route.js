// /mod-kit sends people to the mod-help Discord server set in the admin
// panel (Dashboard), or to the Tools page while none is set.
import { getProfile } from "@/lib/storage";

export async function GET() {
  const { modServer } = await getProfile();
  return new Response(null, { status: 307, headers: { Location: modServer || "/what-i-use" } });
}
