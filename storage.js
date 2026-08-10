// lib/storage.js
import { put, list } from "@vercel/blob";

const BLOB_PATH = "admin/social-links.json";

const DEFAULT_LINKS = [
  { label: "twitch", url: "https://twitch.tv/mattothemoon" },
  { label: "x", url: "https://x.com/mattothemoon" },
  { label: "github", url: "https://github.com/mattothemoon" },
  { label: "discord", url: "/discord" },
  { label: "discord profile", url: "https://discord.com/users/436300903927119873" },
  { label: "email", url: "mailto:mattothemoon06@gmail.com" },
];

export async function getLinks() {
  const { blobs } = await list({ prefix: BLOB_PATH });
  const existing = blobs.find((b) => b.pathname === BLOB_PATH);
  if (!existing) return DEFAULT_LINKS;

  const res = await fetch(existing.url);
  return res.json();
}

export async function saveLinks(links) {
  await put(BLOB_PATH, JSON.stringify(links, null, 2), {
    access: "public",
    contentType: "application/json",
    allowOverwrite: true,
  });
}
