"use client";

import { useEffect, useRef } from "react";

// The animated profile banner. A video rather than the original GIF: same
// look at a fraction of the size. Stays on the still frame for people who
// ask for reduced motion.
export default function BannerVideo({ label }) {
  const ref = useRef(null);

  useEffect(() => {
    const video = ref.current;
    if (!video) return;
    const query = window.matchMedia("(prefers-reduced-motion: reduce)");
    const apply = () => {
      if (query.matches) video.pause();
      else video.play().catch(() => {});
    };
    apply();
    query.addEventListener("change", apply);
    return () => query.removeEventListener("change", apply);
  }, []);

  return (
    <video
      ref={ref}
      className="banner__media"
      poster="/banner/banner.jpg"
      autoPlay
      muted
      loop
      playsInline
      preload="auto"
      aria-label={label}
      role="img"
    >
      <source src="/banner/banner.webm" type="video/webm" />
      <source src="/banner/banner.mp4" type="video/mp4" />
    </video>
  );
}
