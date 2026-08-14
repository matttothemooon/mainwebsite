"use client";

import { useEffect, useState } from "react";

const DISCORD_USER_ID = "436300903927119873";
const LANYARD_URL = `https://api.lanyard.rest/v1/users/${DISCORD_USER_ID}`;
const POLL_INTERVAL_MS = 15000;

const STATUS_LABELS = {
  online: "online",
  idle: "idle",
  dnd: "do not disturb",
  offline: "offline",
};

export default function StatusBlock() {
  const [data, setData] = useState(null);

  useEffect(() => {
    let cancelled = false;

    async function poll() {
      try {
        const res = await fetch(LANYARD_URL);
        if (!res.ok) throw new Error(`Lanyard fetch failed: ${res.status}`);
        const json = await res.json();
        if (!cancelled) setData(json.data);
      } catch (err) {
        console.error("Lanyard status update failed:", err);
      }
    }

    poll();
    const id = setInterval(poll, POLL_INTERVAL_MS);
    return () => {
      cancelled = true;
      clearInterval(id);
    };
  }, []);

  const online = data && data.discord_status !== "offline";
  const discordText = data
    ? `Discord: ${STATUS_LABELS[data.discord_status] || "offline"}`
    : "checking Discord status…";

  const spotify = data?.listening_to_spotify ? data.spotify : null;
  const spotifyText = data
    ? spotify
      ? `${spotify.song} — ${spotify.artist}`
      : "not listening to Spotify"
    : "loading Spotify status…";

  return (
    <div className="status-block" aria-live="polite">
      <a
        className="status-row"
        href={`https://discord.com/users/${DISCORD_USER_ID}`}
        target="_blank"
        rel="noopener noreferrer"
      >
        <span className={`status-dot${online ? " online" : ""}`} />
        <span>{discordText}</span>
      </a>

      <a
        className={`status-row${spotify ? "" : " status-row--disabled"}`}
        href={spotify ? `https://open.spotify.com/track/${spotify.track_id}` : "#"}
        target="_blank"
        rel="noopener noreferrer"
      >
        <span className="spotify-icon">♪</span>
        <span>{spotifyText}</span>
      </a>
    </div>
  );
}
