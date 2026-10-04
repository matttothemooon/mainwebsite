"use client";

import { useEffect, useState } from "react";
import { siDiscord, siSpotify } from "simple-icons";

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
  const [welcomeOpen, setWelcomeOpen] = useState(false);

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

  // Anything Lanyard reports that we have no label for degrades to offline, so
  // the dot colour and the text can never disagree. Lanyard also reports
  // invisible users as offline, which is what Discord itself shows.
  const status = data && STATUS_LABELS[data.discord_status] ? data.discord_status : "offline";
  const spotify = data?.listening_to_spotify ? data.spotify : null;
  const game = data?.activities?.find((activity) => activity.type === 0);
  const customStatus = data?.activities?.find((activity) => activity.type === 4);
  const discordUser = data?.discord_user;
  const discordName = discordUser?.global_name || discordUser?.username || "Discord";
  const avatarUrl = discordUser?.avatar
    ? `https://cdn.discordapp.com/avatars/${DISCORD_USER_ID}/${discordUser.avatar}.${discordUser.avatar.startsWith("a_") ? "gif" : "webp"}?size=128`
    : `https://cdn.discordapp.com/embed/avatars/${Number(discordUser?.discriminator || DISCORD_USER_ID) % (discordUser?.discriminator === "0" ? 6 : 5)}.png`;
  const listeningText = spotify ? `${spotify.song} — ${spotify.artist}` : "nothing right now";
  const playingText = game?.name || "nothing right now";

  function BrandIcon({ icon, className }) {
    return (
      <svg className={className} viewBox="0 0 24 24" aria-hidden="true" focusable="false">
        <path d={icon.path} />
      </svg>
    );
  }

  return (
    <section className="status-block" aria-live="polite" aria-label="What I'm doing right now">
      <a
        className="discord-profile-card"
        href={`https://discord.com/users/${DISCORD_USER_ID}`}
        target="_blank"
        rel="noopener noreferrer"
        aria-label={`View ${discordName} on Discord`}
      >
        <span className="discord-profile-avatar-wrap">
          <img
            className="discord-profile-avatar"
            src={avatarUrl}
            alt=""
            loading="lazy"
          />
          {data?.active_on_discord_mobile && (
            <span className="discord-profile-mobile" aria-label="Active on mobile">📱</span>
          )}
        </span>
        <span className="discord-profile-info">
          <span className="discord-profile-topline">
            <span className="discord-profile-name">{discordName}</span>
            <span className="discord-profile-brand">
              <BrandIcon icon={siDiscord} className="discord-profile-brand-icon" />
              Discord
            </span>
          </span>
          <span className="discord-profile-presence">
            <span className="discord-profile-presence-label">Status:</span>
            <span className={`discord-profile-status discord-profile-status--${status}`}>
              {data ? STATUS_LABELS[status] : "checking…"}
            </span>
          </span>
          {customStatus?.state && (
            <span className="discord-profile-custom">
              {customStatus.emoji?.name ? `${customStatus.emoji.name} ` : ""}
              {customStatus.state}
            </span>
          )}
        </span>
        <span className={`discord-profile-edge discord-profile-edge--${status}`} />
      </a>
      <div className="status-heading-row">
        <h2 className="status-heading">Right now</h2>
        <button
          className="welcome-toggle"
          type="button"
          aria-expanded={welcomeOpen}
          aria-controls="welcome-dropdown"
          onClick={() => setWelcomeOpen((open) => !open)}
        >
          ⓘ
          <span className="sr-only">{welcomeOpen ? "Close welcome info" : "Open welcome info"}</span>
        </button>
      </div>
      {welcomeOpen && (
        <div className="welcome-dropdown" id="welcome-dropdown" role="region" aria-label="Welcome information">
          <h3 className="welcome-title"><span aria-hidden="true">ℹ️</span> Welcome</h3>
          <p className="welcome-mobile-note">
            <span aria-hidden="true">📱</span>
            This site is designed to work on mobile too.
          </p>
          <div className="welcome-divider" />
          <h3 className="welcome-legend-title">🐌 Discord status meanings</h3>
          <ul className="welcome-legend">
            <li><span className="welcome-indicator">🟢</span><span>Online <span className="welcome-muted">· available</span></span></li>
            <li><span className="welcome-indicator">🌙</span><span>Idle <span className="welcome-muted">· away or on mobile</span></span></li>
            <li><span className="welcome-indicator">⛔</span><span>Do not disturb <span className="welcome-muted">· busy</span></span></li>
            <li><span className="welcome-indicator">⚪</span><span>Offline <span className="welcome-muted">· unavailable</span></span></li>
          </ul>
          <div className="welcome-divider" />
          <div className="welcome-boundaries">
            <p><span aria-hidden="true">✦</span> I don’t handle server-related questions or ban appeals in my DMs.</p>
            <p><span aria-hidden="true">↳</span> Harassment in my DMs will result in being blocked and reported.</p>
          </div>
          <button
            className="welcome-dismiss"
            type="button"
            onClick={() => setWelcomeOpen(false)}
          >
            Okay
          </button>
        </div>
      )}
      <div className="status-row">
        <span className="status-icon status-icon--playing" aria-hidden="true">
          <span />
        </span>
        <span className="status-label">playing</span>
        <span className="status-value status-value--playing">
          {data ? playingText : "checking…"}
        </span>
      </div>
      <div className="status-row">
        <BrandIcon icon={siSpotify} className="status-icon status-icon--spotify" />
        <span className="status-label">listening to</span>
        {spotify ? (
          <a
            className="status-value status-value--spotify"
            href={`https://open.spotify.com/track/${spotify.track_id}`}
            target="_blank"
            rel="noopener noreferrer"
          >
            {listeningText}
          </a>
        ) : (
          <span className="status-value status-value--spotify">
            {data ? listeningText : "checking…"}
          </span>
        )}
      </div>
    </section>
  );
}
