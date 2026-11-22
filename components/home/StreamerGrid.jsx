"use client";

import { useLive } from "./LiveProvider";

const VERIFIED = (
  <svg className="verified" viewBox="0 0 24 24" aria-label="verified" role="img">
    <path fill="currentColor" d="m23 12-2.4-2.8.3-3.7-3.6-.8-1.9-3.2L12 2.9 8.6 1.5 6.7 4.7l-3.6.8.3 3.7L1 12l2.4 2.8-.3 3.7 3.6.8 1.9 3.2 3.4-1.4 3.4 1.4 1.9-3.2 3.6-.8-.3-3.7L23 12Zm-12.9 4.7-3.8-3.8 1.4-1.4 2.4 2.4 6.1-6.1 1.4 1.4-7.5 7.5Z" />
  </svg>
);

const loginOf = (entry) => String(entry.twitch || "").toLowerCase();

function formatViewers(n) {
  if (!Number.isFinite(n)) return "";
  if (n >= 1000) return `${(n / 1000).toFixed(1).replace(/\.0$/, "")}K watching`;
  return `${n} watching`;
}

// The "Streamers I work with" header pill and grid, with live status from
// LiveProvider.
export default function StreamerGrid({ communities = [], activeCount = 0, tags = [] }) {
  const channels = useLive();

  const info = (entry) => (channels && channels[loginOf(entry)]) || null;

  // Live streamers first, keeping the admin panel's order otherwise.
  const ordered = communities
    .map((entry, i) => ({ entry, i, live: Boolean(info(entry)?.live) }))
    .sort((a, b) => Number(b.live) - Number(a.live) || a.i - b.i);
  const liveCount = ordered.filter((o) => o.live).length;

  return (
    <>
      <div className="sec-head" data-reveal>
        <h2 id="st-title" className="sec-title">Streamers I work with</h2>
        {liveCount > 0 ? (
          <span className="sec-live"><span className="dot" aria-hidden="true" />{liveCount} live now</span>
        ) : activeCount > 0 ? (
          <span className="sec-count">{activeCount} active</span>
        ) : null}
      </div>
      <p className="sec-lede" data-reveal>The communities I help moderate and manage.</p>
      {tags.length > 0 && (
        <ul className="tags" data-reveal aria-label="What I do for streamers">
          {tags.map((tag) => <li key={tag}>{tag}</li>)}
        </ul>
      )}
      <ul className="st-grid">
        {ordered.map(({ entry, i, live }, n) => {
          const data = info(entry);
          const avatar = data?.avatar || entry.avatar;
          const Tag = entry.url ? "a" : "div";
          const sub = live
            ? [data.game, formatViewers(data.viewers)].filter(Boolean).join(" · ") || "Live on Twitch"
            : `${entry.role}${entry.past && entry.date ? ` · ${entry.date}` : ""}`;
          const label = `${entry.name}${live ? ", live now on Twitch" : ""}`;

          return (
            <li key={`${entry.name}-${i}`} data-reveal style={{ "--d": `${Math.min(n * 30, 300)}ms` }}>
              <Tag
                className={`card st${entry.past ? " is-past" : ""}${live ? " is-live" : ""}`}
                {...(entry.url ? { href: entry.url, target: "_blank", rel: "noopener noreferrer" } : {})}
                aria-label={entry.url ? label : undefined}
                title={(live && data.title) || entry.description || undefined}
              >
                <span className="st__ava">
                  <span className="st__img">
                    {avatar ? (
                      // eslint-disable-next-line @next/next/no-img-element -- remote avatar URL
                      <img src={avatar} alt="" loading="lazy" width="48" height="48" />
                    ) : (
                      <span className="st__initial">{entry.name.slice(0, 1)}</span>
                    )}
                  </span>
                  {live && <span className="st__live">Live</span>}
                </span>
                <span className="st__text">
                  <span className="st__name">{entry.name}{!entry.past && VERIFIED}</span>
                  <span className="st__sub">{sub}</span>
                </span>
                {entry.past && !live && <span className="st__badge">Past</span>}
              </Tag>
            </li>
          );
        })}
      </ul>
    </>
  );
}
