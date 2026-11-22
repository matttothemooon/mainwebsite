"use client";

import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";

const BAT = "M12 6c.8 1.2 1.3 2.3 1.4 3.4 1.6-1.6 3.6-2.6 6.6-2.4-1.4 1-2.1 2.2-2.2 3.6 1.5-.5 3-.4 4.2.4-2.3.6-4.2 2-5.6 4.2-1.1-.9-2.6-1.2-4.4-.7-1.8-.5-3.3-.2-4.4.7C6.2 13 4.3 11.6 2 11c1.2-.8 2.7-.9 4.2-.4-.1-1.4-.8-2.6-2.2-3.6 3-.2 5 .8 6.6 2.4.1-1.1.6-2.2 1.4-3.4Z";

// Deterministic pseudo-random numbers, so server and browser agree.
const rand = (i, salt) => {
  const x = Math.sin(i * 12.9898 + salt * 78.233) * 43758.5453;
  return x - Math.floor(x);
};

const COUNTS = { holidays: 36, halloween: 7, valentine: 14, anniversary: 60 };

// Falling or drifting decorations for the current season, behind the content
// and never in the way of clicks. Not shown in the admin panel.
export default function SeasonalDecor({ season, years }) {
  const pathname = usePathname();
  const [toast, setToast] = useState(true);
  const [reduced, setReduced] = useState(false);

  useEffect(() => {
    setReduced(window.matchMedia("(prefers-reduced-motion: reduce)").matches);
    try {
      if (sessionStorage.getItem(`mtm-season-toast-${season}`)) setToast(false);
    } catch {}
  }, [season]);

  if (!season || pathname?.startsWith("/admin")) return null;

  const count = reduced ? 0 : COUNTS[season] || 0;
  const items = Array.from({ length: count }, (_, i) => {
    const style = {
      left: `${rand(i, 1) * 100}%`,
      animationDelay: `${-rand(i, 2) * 20}s`,
      animationDuration: `${(season === "halloween" ? 18 : 9) + rand(i, 3) * 10}s`,
      "--size": `${season === "holidays" ? 3 + rand(i, 4) * 5 : season === "halloween" ? 20 + rand(i, 4) * 16 : 10 + rand(i, 4) * 12}px`,
      "--drift": `${(rand(i, 5) - 0.5) * 120}px`,
      "--hue": `${Math.floor(rand(i, 6) * 360)}`,
      top: season === "halloween" ? `${10 + rand(i, 7) * 60}%` : undefined,
    };
    if (season === "halloween") {
      return (
        <svg key={i} className="season__item" style={style} viewBox="0 0 24 24" aria-hidden="true">
          <path d={BAT} fill="currentColor" />
        </svg>
      );
    }
    return (
      <span key={i} className="season__item" style={style} aria-hidden="true">
        {season === "valentine" ? "♥" : ""}
      </span>
    );
  });

  const closeToast = () => {
    setToast(false);
    try {
      sessionStorage.setItem(`mtm-season-toast-${season}`, "1");
    } catch {}
  };

  return (
    <>
      <div className={`season season--${season}`} aria-hidden="true">
        {season === "anniversary" && !reduced && <div className="season__burst">{items}</div>}
        {season !== "anniversary" && items}
      </div>
      {season === "anniversary" && toast && (
        <div className="season-toast" role="status">
          <span>🎉 {Number.isFinite(years) && years > 0 ? `${years} year${years === 1 ? "" : "s"} on Twitch today!` : "It's my Twitch anniversary today!"}</span>
          <button type="button" onClick={closeToast} aria-label="Dismiss">×</button>
        </div>
      )}
    </>
  );
}
