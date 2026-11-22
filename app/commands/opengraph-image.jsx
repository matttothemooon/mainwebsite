import { ogImage, OG_SIZE } from "@/lib/og";

export const alt = "Mod command cheat sheet — mattothemoon";
export const size = OG_SIZE;
export const contentType = "image/png";

export default function Image() {
  return ogImage({ eyebrow: "Free mod tool", title: "Mod command cheat sheet", subtitle: "Twitch, Fossabot and Nightbot commands, searchable, with copy buttons." });
}
