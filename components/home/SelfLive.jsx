"use client";

import { useEffect, useState } from "react";
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

// "Live now" card with the stream title. While live it also shows the stream
// and its chat right here (muted until the viewer unmutes). Viewers can fold
// the player away; that choice is remembered on their device.
export function LiveBanner({ login }) {
  const channels = useLive();
  const stream = login ? channels?.[login] : null;
  const [host, setHost] = useState("");
  const [open, setOpen] = useState(true);

  useEffect(() => {
    // Twitch embeds must name the site they're on ("parent").
    setHost(window.location.hostname);
    try {
      if (localStorage.getItem("mtm-hide-player") === "1") setOpen(false);
    } catch {}
  }, []);

  if (!stream?.live) return null;

  const toggle = () => {
    const next = !open;
    setOpen(next);
    try {
      localStorage.setItem("mtm-hide-player", next ? "0" : "1");
    } catch {}
  };
  const meta = [stream.game, formatViewers(stream.viewers)].filter(Boolean).join(" · ");
  const channel = encodeURIComponent(login);
  const parent = encodeURIComponent(host);

  return (
    <div className={`self-live${open ? " is-open" : ""}`}>
      <div className="self-live__bar">
        <span className="self-live__pill"><span className="dot" aria-hidden="true" />Live now</span>
        <span className="self-live__text">
          <strong>{stream.title || "Streaming on Twitch"}</strong>
          {meta && <span>{meta}</span>}
        </span>
        <button type="button" className="self-live__toggle" onClick={toggle} aria-expanded={open}>
          {open ? "Hide" : "Watch here"}
        </button>
        <a className="self-live__cta" href={`https://twitch.tv/${login}`} target="_blank" rel="noopener noreferrer">
          Open on Twitch
        </a>
      </div>
      {open && host && (
        <div className="self-live__embed">
          <div className="self-live__player">
            <iframe
              title={`${login} live on Twitch`}
              src={`https://player.twitch.tv/?channel=${channel}&parent=${parent}&muted=true&autoplay=true`}
              allow="autoplay; fullscreen; picture-in-picture"
              allowFullScreen
            />
          </div>
          <div className="self-live__chat">
            <iframe title={`${login} chat`} src={`https://www.twitch.tv/embed/${channel}/chat?parent=${parent}&darkpopout`} />
          </div>
        </div>
      )}
    </div>
  );
}
