// Upload or delete a settings file for the Tools page. Admin only.
import { requireAuth } from "@/lib/auth";
import { isConfigured } from "@/lib/blobStore";
import { cleanFileName } from "@/lib/storage";
import { MAX_BYTES, saveFile, removeFile } from "@/lib/files";

export async function POST(request) {
  const denied = requireAuth(request);
  if (denied) return denied;
  if (!isConfigured()) return Response.json({ error: "File storage (Vercel Blob) isn't set up." }, { status: 503 });

  let file;
  try {
    file = (await request.formData()).get("file");
  } catch {
    return Response.json({ error: "Expected a file upload" }, { status: 400 });
  }
  if (!file || typeof file === "string") return Response.json({ error: "No file provided" }, { status: 400 });
  if (file.size > MAX_BYTES) return Response.json({ error: "Files can be up to 3 MB." }, { status: 413 });

  try {
    const saved = await saveFile({ name: cleanFileName(file.name), type: file.type, bytes: await file.arrayBuffer() });
    return Response.json(saved);
  } catch (err) {
    console.error("File upload failed:", err);
    return Response.json({ error: "Upload failed" }, { status: 500 });
  }
}

export async function DELETE(request) {
  const denied = requireAuth(request);
  if (denied) return denied;
  const id = new URL(request.url).searchParams.get("id") || "";
  try {
    await removeFile(id);
    return Response.json({ ok: true });
  } catch (err) {
    console.error("File delete failed:", err);
    return Response.json({ error: "Delete failed" }, { status: 500 });
  }
}
