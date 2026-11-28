// Downloads a settings file shared on the Tools page.
import { readFile } from "@/lib/files";

export async function GET(request, { params }) {
  const { id } = await params;
  const file = await readFile(id).catch(() => null);
  if (!file) return new Response("Not found", { status: 404 });
  return new Response(file.bytes, {
    headers: {
      // Always a download, never shown inline, so an uploaded HTML or SVG file can't run here.
      "Content-Type": "application/octet-stream",
      "Content-Disposition": `attachment; filename="${file.name.replace(/"/g, "")}"`,
      "X-Content-Type-Options": "nosniff",
      "Cache-Control": "public, max-age=300",
    },
  });
}
