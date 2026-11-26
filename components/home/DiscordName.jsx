"use client";

import { usePresence } from "../PresenceProvider";

// Name and @handle beside the avatar, from Lanyard. Falls back to the site
// name while Discord hasn't answered.
export default function DiscordName({ fallback }) {
  const user = usePresence()?.discord_user;
  const name = user?.global_name || user?.username || fallback;
  return (
    <span className="hero-card__name">
      <strong>{name}</strong>
      {user?.username && <span>@{user.username}</span>}
    </span>
  );
}
