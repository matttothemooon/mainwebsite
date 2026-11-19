"use client";

import { useLive } from "./LiveProvider";

// Quote cards. The avatar is the one typed in the admin panel, else the
// author's current Twitch picture, else their initial.
export default function Testimonials({ items = [] }) {
  const channels = useLive();

  return (
    <ul className="quotes">
      {items.map((t, i) => {
        const avatar = t.avatar || (t.twitch && channels?.[t.twitch]?.avatar) || "";
        const href = t.url || (t.twitch ? `https://twitch.tv/${t.twitch}` : "");
        const Name = href ? "a" : "span";
        return (
          <li className="card quote" key={`${t.name}-${i}`} data-reveal style={{ "--d": `${Math.min(i * 70, 280)}ms` }}>
            <svg className="quote__mark" viewBox="0 0 24 24" aria-hidden="true">
              <path fill="currentColor" d="M9.6 6C6.5 7.4 4.5 10 4.5 13.6V18h6v-6H7.6c.2-2 1.3-3.4 3.2-4.3L9.6 6Zm9 0c-3.1 1.4-5.1 4-5.1 7.6V18h6v-6h-2.9c.2-2 1.3-3.4 3.2-4.3L18.6 6Z" />
            </svg>
            <blockquote>{t.quote}</blockquote>
            <figcaption className="quote__by">
              <span className="quote__ava">
                {avatar ? (
                  // eslint-disable-next-line @next/next/no-img-element -- remote avatar
                  <img src={avatar} alt="" loading="lazy" width="36" height="36" />
                ) : (
                  <span>{t.name.slice(0, 1)}</span>
                )}
              </span>
              <span className="quote__who">
                <Name
                  className="quote__name"
                  {...(href ? { href, target: "_blank", rel: "noopener noreferrer" } : {})}
                >
                  {t.name}
                </Name>
                {t.role && <span className="quote__role">{t.role}</span>}
              </span>
            </figcaption>
          </li>
        );
      })}
    </ul>
  );
}
