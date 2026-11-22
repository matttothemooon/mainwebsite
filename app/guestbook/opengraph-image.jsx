import { ogImage, OG_SIZE } from "@/lib/og";

export const alt = "Guestbook — mattothemoon";
export const size = OG_SIZE;
export const contentType = "image/png";

export default function Image() {
  return ogImage({ eyebrow: "Guestbook", title: "Sign the guestbook", subtitle: "Say hi. Every message goes through the mod queue first." });
}
