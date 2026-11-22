import { ogImage, OG_SIZE } from "@/lib/og";
import { getProfile } from "@/lib/storage";

export const alt = "Guide — mattothemoon";
export const size = OG_SIZE;
export const contentType = "image/png";

export default async function Image({ params }) {
  const { slug } = await params;
  const { pages } = await getProfile();
  const page = pages.find((p) => p.slug === slug && p.published);
  if (!page) return ogImage({ eyebrow: "Guide", title: "Streamer & Mod Guide" });
  return ogImage({ eyebrow: page.category || "Guide", title: page.title, subtitle: page.description });
}
