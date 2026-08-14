// lib/icons.js
// Resolves a link to a brand icon. Paths come from `simple-icons` (the real
// brand artwork) rather than being hand-drawn, so the glyphs are accurate.
//
// Everything renders in white on the page — the brand hex values are ignored.

import {
  siBluesky, siDiscord, siFacebook, siGithub, siInstagram, siKick, siKofi,
  siMastodon, siPatreon, siReddit, siSnapchat, siSoundcloud,
  siSpotify, siSteam, siTelegram, siThreads, siTiktok, siTwitch, siX,
  siYoutube,
} from "simple-icons";

// Hand-drawn glyphs for the two cases with no brand behind them.
const ENVELOPE = {
  title: "Email",
  path: "M1.5 4h21A1.5 1.5 0 0 1 24 5.5v13a1.5 1.5 0 0 1-1.5 1.5h-21A1.5 1.5 0 0 1 0 18.5v-13A1.5 1.5 0 0 1 1.5 4Zm.9 2 9.6 6.55L21.6 6H2.4ZM22 7.72l-9.44 6.44a1 1 0 0 1-1.12 0L2 7.72V18h20V7.72Z",
};

const GENERIC_LINK = {
  title: "Link",
  path: "M10.6 13.4a1 1 0 0 1 0-1.42l1.38-1.38a1 1 0 0 1 1.42 1.42l-1.38 1.38a1 1 0 0 1-1.42 0Zm-.7 4.95-1.77 1.77a2.5 2.5 0 0 1-3.54-3.54l3.54-3.53a2.5 2.5 0 0 1 3.53 0 1 1 0 0 0 1.42-1.42 4.5 4.5 0 0 0-6.37 0l-3.54 3.54a4.5 4.5 0 0 0 6.37 6.36l1.77-1.76a1 1 0 1 0-1.41-1.42Zm10.6-14.14a4.5 4.5 0 0 0-6.36 0l-1.77 1.77a1 1 0 0 0 1.41 1.41l1.77-1.76a2.5 2.5 0 0 1 3.54 3.53l-3.54 3.54a2.5 2.5 0 0 1-3.53 0 1 1 0 1 0-1.42 1.41 4.5 4.5 0 0 0 6.36 0l3.54-3.53a4.5 4.5 0 0 0 0-6.37Z",
};

// Hostname (without a leading www.) -> icon.
const BY_HOST = {
  "twitch.tv": siTwitch,
  "x.com": siX,
  "twitter.com": siX,
  "github.com": siGithub,
  "discord.com": siDiscord,
  "discord.gg": siDiscord,
  "discordapp.com": siDiscord,
  "youtube.com": siYoutube,
  "youtu.be": siYoutube,
  "instagram.com": siInstagram,
  "tiktok.com": siTiktok,
  "open.spotify.com": siSpotify,
  "spotify.com": siSpotify,
  "kick.com": siKick,
  "steamcommunity.com": siSteam,
  "store.steampowered.com": siSteam,
  "reddit.com": siReddit,
  "bsky.app": siBluesky,
  "t.me": siTelegram,
  "telegram.me": siTelegram,
  "facebook.com": siFacebook,
  "patreon.com": siPatreon,
  "ko-fi.com": siKofi,
  "snapchat.com": siSnapchat,
  "soundcloud.com": siSoundcloud,
  "threads.net": siThreads,
  "threads.com": siThreads,
  "mastodon.social": siMastodon,
};

// Fallback for URLs with no hostname to inspect — the seeded "/discord" link,
// for instance. Matched against the link's label.
const BY_LABEL = {
  twitch: siTwitch,
  x: siX,
  twitter: siX,
  github: siGithub,
  discord: siDiscord,
  youtube: siYoutube,
  yt: siYoutube,
  instagram: siInstagram,
  insta: siInstagram,
  ig: siInstagram,
  tiktok: siTiktok,
  spotify: siSpotify,
  kick: siKick,
  steam: siSteam,
  reddit: siReddit,
  bluesky: siBluesky,
  telegram: siTelegram,
  facebook: siFacebook,
  patreon: siPatreon,
  kofi: siKofi,
  "ko-fi": siKofi,
  snapchat: siSnapchat,
  soundcloud: siSoundcloud,
  threads: siThreads,
  mastodon: siMastodon,
  email: ENVELOPE,
  mail: ENVELOPE,
  contact: ENVELOPE,
};

function hostIcon(url) {
  try {
    // Relative URLs ("/discord") need a base to parse; the base host is then
    // not a platform, so lookup misses and we fall through to the label.
    const { hostname } = new URL(url, "https://placeholder.invalid");
    return BY_HOST[hostname.replace(/^www\./, "")] || null;
  } catch {
    return null;
  }
}

/**
 * Picks the icon for a link.
 *
 * Order: explicit custom upload, then mailto, then hostname, then label,
 * then the generic link glyph — so a link always renders something.
 *
 * Returns either { type: "image", src, title } or { type: "path", path, title }.
 */
export function resolveIcon(link) {
  const { url = "", label = "", iconUrl = "" } = link || {};
  const title = label || "link";

  if (iconUrl) return { type: "image", src: iconUrl, title };
  if (/^mailto:/i.test(url)) return { type: "path", path: ENVELOPE.path, title };

  const icon = hostIcon(url) || BY_LABEL[label.trim().toLowerCase()];
  return { type: "path", path: (icon || GENERIC_LINK).path, title };
}

// Whether resolveIcon would fall back to the generic glyph — the admin panel
// uses this to point out which links would benefit from a custom upload.
export function hasKnownIcon(link) {
  const { url = "", label = "", iconUrl = "" } = link || {};
  if (iconUrl) return true;
  if (/^mailto:/i.test(url)) return true;
  return Boolean(hostIcon(url) || BY_LABEL[label.trim().toLowerCase()]);
}
