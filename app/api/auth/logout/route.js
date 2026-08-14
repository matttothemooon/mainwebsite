import { clearSessionCookie } from "@/lib/auth";

export async function GET(request) {
  return new Response(null, {
    status: 302,
    headers: {
      Location: "/admin",
      "Set-Cookie": clearSessionCookie(request),
    },
  });
}
