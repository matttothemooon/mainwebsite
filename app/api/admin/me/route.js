import { getIdentity, requireAuth } from "@/lib/auth";

// Who is signed in, for the admin bar. Display only.
export async function GET(request) {
  const denied = requireAuth(request);
  if (denied) return denied;
  return Response.json({ me: getIdentity(request) }, { headers: { "Cache-Control": "no-store" } });
}
