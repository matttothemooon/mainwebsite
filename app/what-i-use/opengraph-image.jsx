import { ogImage, OG_SIZE } from "@/lib/og";

export const alt = "What I use — mattothemoon";
export const size = OG_SIZE;
export const contentType = "image/png";

export default async function Image() {
  return ogImage({ eyebrow: "Tools", title: "What I use", subtitle: "My stream setup, gear and the mod tools I recommend." });
}
