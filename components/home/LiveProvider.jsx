"use client";

import { createContext, useContext, useEffect, useState } from "react";

const REFRESH_MS = 60_000;
const LiveContext = createContext(null);

// { [login]: { avatar, live, title?, game?, viewers? } } or null.
export function useLive() {
  return useContext(LiveContext);
}

// One live-status feed for the whole homepage: starts from the server's answer
// and refreshes from /api/live every minute while the tab is visible.
export default function LiveProvider({ initialChannels = null, children }) {
  const [channels, setChannels] = useState(initialChannels);

  useEffect(() => {
    let cancelled = false;
    async function refresh() {
      if (document.hidden) return;
      try {
        const res = await fetch("/api/live");
        if (!res.ok) return;
        const json = await res.json();
        if (!cancelled && json.channels) setChannels(json.channels);
      } catch {}
    }
    const id = setInterval(refresh, REFRESH_MS);
    document.addEventListener("visibilitychange", refresh);
    return () => {
      cancelled = true;
      clearInterval(id);
      document.removeEventListener("visibilitychange", refresh);
    };
  }, []);

  return <LiveContext.Provider value={channels}>{children}</LiveContext.Provider>;
}
