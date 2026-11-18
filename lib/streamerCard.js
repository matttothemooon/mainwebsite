// Text for the streamer preview in the admin panel's mod list.

export function formatFollowers(count) {
  if (!Number.isFinite(count)) return "";
  if (count >= 1e6) return `${(count / 1e6).toFixed(1).replace(/\.0$/, "")}M followers`;
  if (count >= 1e3) return `${(count / 1e3).toFixed(1).replace(/\.0$/, "")}K followers`;
  return `${count} follower${count === 1 ? "" : "s"}`;
}

// Every name gets a card — hovering one and getting nothing reads as broken,
// even when the entry genuinely has no Twitch data behind it.
//
// What sits under the name: the follower count when there is one, otherwise the
// entry's own role and date, so a card without Twitch data still says something
// instead of echoing the name back.
export function cardMeta(entry) {
  if (Number.isFinite(entry.followers)) return formatFollowers(entry.followers);
  return [entry.role, entry.date].filter(Boolean).join(" · ");
}

// The card's heading: the Twitch handle when known, else the entry name.
export function cardTitle(entry) {
  return entry.twitch ? `@${entry.twitch}` : entry.name;
}
