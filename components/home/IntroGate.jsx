"use client";

import { useEffect, useState } from "react";

// A click-to-enter screen in front of the page, shown once per browser session.
// Without JavaScript the <noscript> rule in page.jsx hides it.
export default function IntroGate() {
  const [state, setState] = useState("shown"); // shown | leaving | gone

  useEffect(() => {
    try {
      if (sessionStorage.getItem("mtm-entered")) {
        setState("gone");
        document.documentElement.classList.add("is-entered");
      }
    } catch {}
  }, []);

  useEffect(() => {
    if (state !== "shown") return;
    const onKey = (e) => {
      if (e.key === "Enter" || e.key === " ") enter();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  });

  function enter() {
    try { sessionStorage.setItem("mtm-entered", "1"); } catch {}
    document.documentElement.classList.add("is-entered");
    setState("leaving");
    setTimeout(() => setState("gone"), 600);
  }

  if (state === "gone") return null;

  return (
    <div className={`intro${state === "leaving" ? " is-leaving" : ""}`}>
      <button type="button" className="intro__hit" onClick={enter} aria-label="Enter the site">
        <span className="intro__enter">enter</span>
        <span className="intro__hint">click anywhere</span>
      </button>
    </div>
  );
}
