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

// A name only gets a hover card if there's something to put in it.
export function hasCard(entry) {
  return Boolean(entry.twitch || entry.avatar || Number.isFinite(entry.followers));
}

export default function Experience({ experience }) {
  const [active, setActive] = useState(null); // { entry, rect }
  const [pos, setPos] = useState(null);
  const cardRef = useRef(null);

  // Measured after the card renders with its content, so it can flip above the
  // name when there isn't room below.
  useLayoutEffect(() => {
    if (!active || !cardRef.current) {
      setPos(null);
      return;
    }

    const size = cardRef.current.getBoundingClientRect();
    const margin = 8;

    let top = active.rect.bottom + margin;
    if (top + size.height > window.innerHeight - margin) {
      top = active.rect.top - size.height - margin;
    }

    setPos({
      top: Math.max(margin, top),
      left: Math.max(margin, Math.min(active.rect.left, window.innerWidth - size.width - margin)),
    });
  }, [active]);

  const hide = useCallback(() => setActive(null), []);

  // A fixed-position card would drift away from its name on scroll.
  useEffect(() => {
    if (!active) return;
    window.addEventListener("scroll", hide, { passive: true });
    window.addEventListener("resize", hide);
    return () => {
      window.removeEventListener("scroll", hide);
      window.removeEventListener("resize", hide);
    };
  }, [active, hide]);

  const show = (entry) => (e) =>
    setActive({ entry, rect: e.currentTarget.getBoundingClientRect() });

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
                const carded = hasCard(entry);
                const Tag = entry.url ? "a" : "span";

                const handlers = carded
                  ? {
                      onMouseEnter: show(entry),
                      onMouseLeave: hide,
                      onFocus: show(entry),
                      onBlur: hide,
                    }
                  : {};

                return (
                  <div className="exp-row" key={`${entry.name}-${i}`}>
                    <div className="exp-main">
                      <span className="exp-role">{entry.role}</span>
                      <Tag
                        className={`exp-place${carded ? " exp-place--has-card" : ""}`}
                        {...(entry.url
                          ? { href: entry.url, target: "_blank", rel: "noopener noreferrer" }
                          : {})}
                        {...(carded && !entry.url ? { tabIndex: 0 } : {})}
                        {...handlers}
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
            <span className="streamer-card__name">
              {active.entry.twitch ? `@${active.entry.twitch}` : active.entry.name}
            </span>
            {Number.isFinite(active.entry.followers) && (
              <span className="streamer-card__meta">
                {formatFollowers(active.entry.followers)}
              </span>
            )}
          </div>
        </div>
      )}
    </>
  );
}
