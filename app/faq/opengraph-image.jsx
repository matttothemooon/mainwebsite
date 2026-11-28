import { ogImage, OG_SIZE } from "@/lib/og";

export const alt = "FAQ — mattothemoon";
export const size = OG_SIZE;
export const contentType = "image/png";

export default function Image() {
  return ogImage({ eyebrow: "FAQ", title: "Questions people ask", subtitle: "Modding, bots, apps and my setup." });
}
