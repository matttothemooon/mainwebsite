import { ogImage, OG_SIZE } from "@/lib/og";

export const alt = "Twitch chat raffle — mattothemoon";
export const size = OG_SIZE;
export const contentType = "image/png";

export default function Image() {
  return ogImage({ eyebrow: "Free mod tool", title: "Twitch chat raffle", subtitle: "Type !enter in chat, draw a winner. Works with any channel." });
}
