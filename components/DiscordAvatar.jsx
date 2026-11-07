"use client";

import { usePresence } from "./PresenceProvider";
import DiscordPresence from "./DiscordPresence";

const USER_ID = "436300903927119873";

export default function DiscordAvatar() {
  const data = usePresence();
  const discordUser = data?.discord_user;
  const avatarUrl = discordUser?.avatar
    ? `https://cdn.discordapp.com/avatars/${USER_ID}/${discordUser.avatar}.${discordUser.avatar.startsWith("a_") ? "gif" : "webp"}?size=128`
    : `https://cdn.discordapp.com/embed/avatars/${Number(USER_ID) % 6}.png`;
  const name = discordUser?.global_name || discordUser?.username || "Discord";

  return (
    <span className="tw-avatar-wrap">
      <a
        className="tw-avatar-link"
        href={`https://discord.com/users/${USER_ID}`}
        target="_blank"
        rel="noopener noreferrer"
        aria-label={`View ${name} on Discord`}
      >
        {/* eslint-disable-next-line @next/next/no-img-element -- Discord avatar URL is dynamic. */}
        <img className="tw-avatar" src={avatarUrl} alt="" width="68" height="68" />
      </a>
      <DiscordPresence />
    </span>
  );
}
