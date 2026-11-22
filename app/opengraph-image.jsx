import { ogImage, OG_SIZE } from "@/lib/og";

export const alt = "mattothemoon — community mod and streamer";
export const size = OG_SIZE;
export const contentType = "image/png";

export default function Image() {
  return ogImage({ eyebrow: "Community mod & streamer", title: "Matt", subtitle: "Moderation, community management and streaming. Guides, tools and how to work with me." });
}
