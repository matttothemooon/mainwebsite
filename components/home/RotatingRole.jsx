"use client";

import { useEffect, useState } from "react";

export default function RotatingRole({ roles = [] }) {
  const [i, setI] = useState(0);

  useEffect(() => {
    if (roles.length < 2) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const id = setInterval(() => setI((n) => (n + 1) % roles.length), 2400);
    return () => clearInterval(id);
  }, [roles.length]);

  if (!roles.length) return null;
  const longest = roles.reduce((a, b) => (b.length > a.length ? b : a), "");

  return (
    <span className="rr" aria-label={roles.join(", ")}>
      <span className="rr__sizer" aria-hidden="true">{longest}</span>
      {roles.map((role, n) => (
        <span key={role} className={`rr__word${n === i ? " is-on" : ""}`} aria-hidden="true">
          {role}
        </span>
      ))}
    </span>
  );
}
