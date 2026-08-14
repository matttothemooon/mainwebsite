// Public read endpoint. The homepage renders on the server and no longer needs
// this, but it stays as the documented public shape of the profile.
import { getProfile, DEFAULT_PROFILE } from "@/lib/storage";

export async function GET() {
  try {
    return Response.json(await getProfile(), {
      headers: { "Cache-Control": "s-maxage=60, stale-while-revalidate=300" },
    });
  } catch (err) {
    console.error("Profile fetch failed:", err);
    return Response.json(DEFAULT_PROFILE); // the page should still render
  }
}
