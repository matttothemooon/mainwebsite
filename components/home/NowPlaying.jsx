"use client";

import { useEffect, useState } from "react";
import { usePresence } from "../PresenceProvider";

const SPOTIFY = "M12 0C5.4 0 0 5.4 0 12s5.4 12 12 12 12-5.4 12-12S18.66 0 12 0zm5.521 17.34c-.24.359-.66.48-1.021.24-2.82-1.74-6.36-2.101-10.561-1.141-.418.122-.779-.179-.899-.539-.12-.421.18-.78.54-.9 4.56-1.021 8.52-.6 11.64 1.32.42.18.479.659.301 1.02zm1.44-3.3c-.301.42-.841.6-1.262.3-3.239-1.98-8.159-2.58-11.939-1.38-.479.12-1.02-.12-1.14-.6-.12-.48.12-1.021.6-1.141C9.6 9.9 15 10.561 18.72 12.84c.361.181.54.78.241 1.2zm.12-3.36C15.24 8.4 8.82 8.16 5.16 9.301c-.6.179-1.2-.181-1.38-.721-.18-.601.18-1.2.72-1.381 4.26-1.26 11.28-1.02 15.721 1.621.539.3.719 1.02.419 1.56-.299.421-1.02.599-1.559.3z";
const DISCORD = "M20.317 4.37a19.791 19.791 0 0 0-4.885-1.515.074.074 0 0 0-.079.037c-.21.375-.444.864-.608 1.25a18.27 18.27 0 0 0-5.487 0 12.64 12.64 0 0 0-.617-1.25.077.077 0 0 0-.079-.037A19.736 19.736 0 0 0 3.677 4.37a.07.07 0 0 0-.032.027C.533 9.046-.32 13.58.099 18.057a.082.082 0 0 0 .031.057 19.9 19.9 0 0 0 5.993 3.03.078.078 0 0 0 .084-.028 14.09 14.09 0 0 0 1.226-1.994.076.076 0 0 0-.041-.106 13.107 13.107 0 0 1-1.872-.892.077.077 0 0 1-.008-.128 10.2 10.2 0 0 0 .372-.292.074.074 0 0 1 .077-.01c3.928 1.793 8.18 1.793 12.062 0a.074.074 0 0 1 .078.01c.12.098.246.198.373.292a.077.077 0 0 1-.006.127 12.299 12.299 0 0 1-1.873.892.077.077 0 0 0-.041.107c.36.698.772 1.362 1.225 1.993a.076.076 0 0 0 .084.028 19.839 19.839 0 0 0 6.002-3.03.077.077 0 0 0 .032-.054c.5-5.177-.838-9.674-3.549-13.66a.061.061 0 0 0-.031-.03zM8.02 15.33c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.956-2.419 2.157-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.956 2.418-2.157 2.418zm7.975 0c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.955-2.419 2.157-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.946 2.418-2.157 2.418z";
const POLL_MS = 15000;

const ago = (iso) => {
  const mins = Math.max(0, Math.round((Date.now() - new Date(iso).getTime()) / 60000));
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.round(mins / 60);
  return hours < 24 ? `${hours}h ago` : `${Math.round(hours / 24)}d ago`;
};
const clock = (ms) => {
  const s = Math.max(0, Math.floor(ms / 1000));
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}`;
};

// The site's own Spotify feed (/api/spotify): what's playing, or the last song.
function useSpotify() {
  const [now, setNow] = useState(null);
  useEffect(() => {
    let cancelled = false;
    const poll = () =>
      fetch("/api/spotify")
        .then((r) => (r.ok ? r.json() : null))
        .then((d) => {
          if (cancelled || !d || d.connected === false) return;
          const t = d.track;
          if (!t) return setNow(null);
          setNow(
            d.playing
              ? { ...t, playing: true, start: Date.now() - d.progressMs, end: Date.now() - d.progressMs + t.durationMs }
              : { ...t, playing: false, playedAt: d.playedAt }
          );
        })
        .catch(() => {});
    poll();
    const id = setInterval(poll, POLL_MS);
    return () => {
      cancelled = true;
      clearInterval(id);
    };
  }, []);
  return now;
}

// Ticks once a second while a song with known timings is playing.
function useClock(active) {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    if (!active) return undefined;
    const id = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, [active]);
  return now;
}

// What Matt is up to: a song playing on Spotify (from the site's own Spotify
// connection, else from Discord), then a game from Discord, then the last
// song played. With none of those nothing shows; the avatar dot already
// gives the Discord status.
export default function NowPlaying() {
  const presence = usePresence();
  const api = useSpotify();

  const lanyard = presence?.listening_to_spotify && presence.spotify;
  const activity = (presence?.activities || []).find((a) => a.type === 0 || a.type === 1 || a.type === 3);

  let song = null;
  if (api?.playing) song = api;
  else if (lanyard) {
    song = {
      playing: true,
      title: lanyard.song,
      artist: lanyard.artist?.replace(/;/g, ","),
      art: lanyard.album_art_url || "",
      url: lanyard.track_id ? `https://open.spotify.com/track/${lanyard.track_id}` : "",
      start: lanyard.timestamps?.start,
      end: lanyard.timestamps?.end,
    };
  }

  const timed = Boolean(song?.playing && song.start && song.end);
  const now = useClock(timed);

  if (!song && activity) {
    return (
      <a className="np" href="https://discord.com/users/436300903927119873" target="_blank" rel="noopener noreferrer">
        <span className="np__icon np__icon--discord">
          <svg viewBox="0 0 24 24" aria-hidden="true"><path d={DISCORD} /></svg>
        </span>
        <span className="np__text">
          <strong>{activity.name}</strong>
          <span>{activity.details || activity.state || (activity.type === 1 ? "Streaming" : "Playing")}</span>
        </span>
      </a>
    );
  }

  if (!song && api && !api.playing) song = api;
  if (!song) return null;

  const total = timed ? song.end - song.start : 0;
  const elapsed = timed ? Math.min(total, Math.max(0, now - song.start)) : 0;

  return (
    <a className={`np${song.playing ? " is-playing" : ""}`} href={song.url || "https://open.spotify.com"} target="_blank" rel="noopener noreferrer">
      <span className="np__icon np__icon--spotify">
        {song.art ? (
          // eslint-disable-next-line @next/next/no-img-element -- Spotify album art URL.
          <img src={song.art} alt="" width="40" height="40" />
        ) : (
          <svg viewBox="0 0 24 24" aria-hidden="true"><path d={SPOTIFY} /></svg>
        )}
        {song.art && (
          <span className="np__badge" aria-hidden="true">
            <svg viewBox="0 0 24 24"><path d={SPOTIFY} /></svg>
          </span>
        )}
      </span>
      <span className="np__text">
        <span className="np__label">{song.playing ? "Listening on Spotify" : `Last played · ${ago(song.playedAt)}`}</span>
        <strong>{song.title}</strong>
        {song.artist && <span>{song.artist}</span>}
        {timed && (
          <span className="np__progress" aria-label={`${clock(elapsed)} of ${clock(total)}`}>
            <span className="np__bar"><span style={{ width: `${(elapsed / total) * 100}%` }} /></span>
            <span className="np__time">{clock(elapsed)} / {clock(total)}</span>
          </span>
        )}
      </span>
    </a>
  );
}
