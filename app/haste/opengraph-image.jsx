import { ogImage, OG_SIZE } from "@/lib/og";

export const alt = "Haste — mattothemoon";
export const size = OG_SIZE;
export const contentType = "image/png";

export default async function Image() {
  return ogImage({ eyebrow: "Haste", title: "Paste & share", subtitle: "Paste text or code and get a short link." });
}
