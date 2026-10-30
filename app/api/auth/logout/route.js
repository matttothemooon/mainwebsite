import { clearIdentityCookie, clearSessionCookie } from "@/lib/auth";

export async function GET(request) {
  const headers = new Headers({ Location: "/admin" });
  headers.append("Set-Cookie", clearSessionCookie(request));
  headers.append("Set-Cookie", clearIdentityCookie(request));
  return new Response(null, { status: 302, headers });
}
