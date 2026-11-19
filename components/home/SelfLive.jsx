"use client";

import { useLive } from "./LiveProvider";

function formatViewers(n) {
  if (!Number.isFinite(n)) return "";
  if (n >= 1000) return `${(n / 1000).toFixed(1).replace(/\.0$/, "")}K watching`;
  return `${n} watching`;
}

// Wraps the avatar: red ring and a "Live" tag while the owner is streaming.
export function LiveAvatar({ login, children }) {
  const channels = useLive();
  const live = Boolean(login && channels?.[login]?.live);
  return (
    <span className={`self-ava${live ? " is-live" : ""}`}>
      {children}
      {live && (
        <a className="self-ava__tag" href={`https://twitch.tv/${login}`} target="_blank" rel="noopener noreferrer">
          Live
        </a>
      )}
    </span>
  );
}

// "Live now on Twitch" card with the stream title, shown only while live.
export function LiveBanner({ login }) {
  const channels = useLive();
  const stream = login ? channels?.[login] : null;
  if (!stream?.live) return null;

  const meta = [stream.game, formatViewers(stream.viewers)].filter(Boolean).join(" · ");
  return (
    <a className="self-live" href={`https://twitch.tv/${login}`} target="_blank" rel="noopener noreferrer">
      <span className="self-live__pill"><span className="dot" aria-hidden="true" />Live now</span>
      <span className="self-live__text">
        <strong>{stream.title || "Streaming on Twitch"}</strong>
        {meta && <span>{meta}</span>}
      </span>
      <span className="self-live__cta">Watch</span>
    </a>
  );
}
