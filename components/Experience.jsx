"use client";

import { useCallback, useEffect, useLayoutEffect, useRef, useState } from "react";

const GROUPS = [
  ["active", "active"],
  ["past", "past"],
];

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

const MARGIN = 8;

export default function Experience({ experience }) {
  const [active, setActive] = useState(null); // { entry, el }
  const [pos, setPos] = useState(null);
  const cardRef = useRef(null);

  const hide = useCallback(() => setActive(null), []);

  // Positions the card under its name, flipping above when there is no room.
  //
  // Measured from the live element rather than a rect captured on hover, so it
  // stays attached to the name while the page moves under it.
  const place = useCallback(() => {
    const el = active?.el;
    if (!el) return;

    const rect = el.getBoundingClientRect();
    const size = cardRef.current?.getBoundingClientRect();
    const width = size?.width ?? 0;
    const height = size?.height ?? 0;

    let top = rect.bottom + MARGIN;
    if (height && top + height > window.innerHeight - MARGIN) {
      top = rect.top - height - MARGIN;
    }

    setPos({
      top: Math.max(MARGIN, top),
      left: Math.max(MARGIN, Math.min(rect.left, window.innerWidth - width - MARGIN)),
    });
  }, [active]);

  useLayoutEffect(place, [place]);

  // Follow the name rather than dismissing the card. Hiding here meant any
  // stray scroll or resize — browser chrome settling, a scrollbar appearing —
  // closed the card the moment it opened, which looks like hover not working
  // at all rather than like a card that was dismissed.
  useEffect(() => {
    if (!active) return;
    window.addEventListener("scroll", place, { passive: true });
    window.addEventListener("resize", place);
    return () => {
      window.removeEventListener("scroll", place);
      window.removeEventListener("resize", place);
    };
  }, [active, place]);

  // Position is seeded here, from the rect we already have, so the card is
  // visible on its first paint. Waiting for the measuring pass to reveal it
  // meant anything that interrupted that pass left it permanently invisible.
  const show = (entry) => (e) => {
    const el = e.currentTarget;
    const rect = el.getBoundingClientRect();
    setActive({ entry, el });
    setPos({ top: rect.bottom + MARGIN, left: rect.left });
  };

  return (
    <>
      <div className="exp-block">
        {GROUPS.map(([key, label]) => {
          const entries = experience?.[key] || [];
          if (!entries.length) return null;

          return (
            <div className="exp-group" key={key}>
              <div className="exp-label">{label}</div>

              {entries.map((entry, i) => {
                const Tag = entry.url ? "a" : "span";

                return (
                  <div className="exp-row" key={`${entry.name}-${i}`}>
                    <div className="exp-main">
                      <span className="exp-role">{entry.role}</span>
                      <Tag
                        className="exp-place exp-place--has-card"
                        {...(entry.url
                          ? { href: entry.url, target: "_blank", rel: "noopener noreferrer" }
                          : { tabIndex: 0 })}
                        onMouseEnter={show(entry)}
                        onMouseLeave={hide}
                        onFocus={show(entry)}
                        onBlur={hide}
                      >
                        {entry.name}
                      </Tag>
                    </div>
                    <span className="exp-date">{entry.date}</span>
                  </div>
                );
              })}
            </div>
          );
        })}
      </div>

      {active && (
        <div
          ref={cardRef}
          role="tooltip"
          className={`streamer-card${pos ? " streamer-card--visible" : ""}`}
          style={{ top: pos?.top ?? 0, left: pos?.left ?? 0 }}
        >
          {active.entry.avatar && (
            // eslint-disable-next-line @next/next/no-img-element -- arbitrary
            // admin-supplied URL; next/image would need a remote allowlist.
            <img
              className="streamer-card__avatar"
              src={active.entry.avatar}
              alt=""
              aria-hidden="true"
            />
          )}
          <div className="streamer-card__body">
            <span className="streamer-card__name">{cardTitle(active.entry)}</span>
            {cardMeta(active.entry) && (
              <span className="streamer-card__meta">{cardMeta(active.entry)}</span>
            )}
          </div>
        </div>
      )}
    </>
  );
}
