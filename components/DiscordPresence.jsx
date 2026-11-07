"use client";

import { usePresence } from "./PresenceProvider";

const STATUS_LABELS = {
  online: "online",
  idle: "idle",
  dnd: "do not disturb",
  offline: "offline",
};

export default function DiscordPresence() {
  const data = usePresence();
  const status = data && STATUS_LABELS[data.discord_status] ? data.discord_status : "offline";
  const label = data ? STATUS_LABELS[status] : "checking";

  return (
    <span
      className="tw-presence"
      role="img"
      aria-label={`Discord status: ${label}`}
      title={`Discord: ${label}`}
    >
      <span className={`tw-presence__dot tw-presence__dot--${status}`} aria-hidden="true" />
    </span>
  );
}
