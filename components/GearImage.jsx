"use client";

import { useState } from "react";

// A product photo with a quiet placeholder when there's no image or it fails
// to load (some shops block hotlinking).
export default function GearImage({ src }) {
  const [failed, setFailed] = useState(false);
  const [wide, setWide] = useState(false);

  if (!src || failed) {
    return (
      <span className="gear-card__placeholder" aria-hidden="true">
        <svg viewBox="0 0 24 24">
          <path
            fill="none"
            stroke="currentColor"
            strokeWidth="1.5"
            strokeLinejoin="round"
            d="M12 2.8 20.5 7.5v9L12 21.2 3.5 16.5v-9L12 2.8Zm0 0v0M3.5 7.5 12 12.2l8.5-4.7M12 12.2v9"
          />
        </svg>
      </span>
    );
  }
  return (
    <>
      {/* Blurred copy fills the tile around the photo, so wide promo shots
          and white-background cut-outs both show whole. */}
      <span className="gear-card__backdrop" style={{ backgroundImage: `url("${src}")` }} aria-hidden="true" />
      {/* eslint-disable-next-line @next/next/no-img-element -- remote product image */}
      <img
      className={wide ? "is-wide" : undefined}
      src={src}
      alt=""
      loading="lazy"
      decoding="async"
      referrerPolicy="no-referrer"
      onLoad={(e) => setWide(e.currentTarget.naturalWidth / e.currentTarget.naturalHeight > 1.55)}
      onError={() => setFailed(true)}
      />
    </>
  );
}
