// The paste as plain text.
import { getPaste } from "@/lib/haste";

export async function GET(request, { params }) {
  const { id } = await params;
  const paste = await getPaste(id);
  if (!paste) return new Response("Paste not found (it may have expired).\n", { status: 404, headers: { "Content-Type": "text/plain; charset=utf-8" } });
  return new Response(paste.content, {
    headers: {
      "Content-Type": "text/plain; charset=utf-8",
      "X-Robots-Tag": "noindex",
      "X-Content-Type-Options": "nosniff",
      "Cache-Control": "public, max-age=60",
    },
  });
}
