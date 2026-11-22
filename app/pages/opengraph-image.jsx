import { ogImage, OG_SIZE } from "@/lib/og";

export const alt = "Streamer & Mod Guide — mattothemoon";
export const size = OG_SIZE;
export const contentType = "image/png";

export default async function Image() {
  return ogImage({ eyebrow: "Notes from the stream", title: "Streamer & Mod Guide", subtitle: "Field notes on moderation, stream setup and community life." });
}
