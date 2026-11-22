import { ogImage, OG_SIZE } from "@/lib/og";
import { getPaste } from "@/lib/haste";

export const alt = "A paste on mattothemoon";
export const size = OG_SIZE;
export const contentType = "image/png";

export default async function Image({ params }) {
  const { id } = await params;
  const paste = await getPaste(id);
  if (!paste) return ogImage({ eyebrow: "Haste", title: "Paste not found", subtitle: "It may have expired." });
  const lines = paste.content.split("\n");
  return ogImage({
    eyebrow: `Paste · ${lines.length} line${lines.length === 1 ? "" : "s"}`,
    title: `haste/${paste.id}`,
    code: lines.slice(0, 5).map((l) => l.replace(/\t/g, "  ")),
  });
}
