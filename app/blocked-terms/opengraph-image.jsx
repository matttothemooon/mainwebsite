import { ogImage, OG_SIZE } from "@/lib/og";

export const alt = "Blocked-terms generator — mattothemoon";
export const size = OG_SIZE;
export const contentType = "image/png";

export default function Image() {
  return ogImage({ eyebrow: "Free mod tool", title: "Blocked-terms generator", subtitle: "sc4m · s c a m · ѕсаm. Every dodge, ready for Twitch & Discord." });
}
