import { ogImage, OG_SIZE } from "@/lib/og";

export const alt = "Work with me — mattothemoon";
export const size = OG_SIZE;
export const contentType = "image/png";

export default async function Image() {
  return ogImage({ eyebrow: "Work with me", title: "Moderation & community management", subtitle: "Twitch moderation, Discord setup and bots for streamers." });
}
