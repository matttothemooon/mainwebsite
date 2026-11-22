"use client";

import { useEffect } from "react";
import { usePathname } from "next/navigation";

// The last page counted, so the same load is never sent twice (React can run
// effects twice in development).
let last = { path: "", at: 0 };

// Counts a page view once the page has actually loaded in a browser.
// Skipped for "Do Not Track" and for the admin panel.
export default function ViewTracker() {
  const pathname = usePathname();
  useEffect(() => {
    if (!pathname || pathname.startsWith("/admin")) return;
    if (navigator.doNotTrack === "1" || window.doNotTrack === "1") return;
    if (last.path === pathname && Date.now() - last.at < 2000) return;
    last = { path: pathname, at: Date.now() };
    const body = JSON.stringify({ path: pathname, referrer: document.referrer });
    try {
      if (!navigator.sendBeacon?.("/api/hit", new Blob([body], { type: "text/plain" }))) {
        fetch("/api/hit", { method: "POST", body, keepalive: true }).catch(() => {});
      }
    } catch {}
  }, [pathname]);
  return null;
}
