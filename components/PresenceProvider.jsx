"use client";

import { createContext, useContext, useEffect, useState } from "react";

const DISCORD_USER_ID = "436300903927119873";
const LANYARD_URL = `https://api.lanyard.rest/v1/users/${DISCORD_USER_ID}`;
const POLL_INTERVAL_MS = 15000;
const PresenceContext = createContext(null);

export function usePresence() {
  return useContext(PresenceContext);
}

export default function PresenceProvider({ children }) {
  const [data, setData] = useState(null);

  useEffect(() => {
    let cancelled = false;

    async function poll() {
      try {
        const response = await fetch(LANYARD_URL);
        if (!response.ok) throw new Error(`Lanyard fetch failed: ${response.status}`);
        const json = await response.json();
        if (!json?.data) throw new Error("Lanyard returned an invalid status response.");
        if (!cancelled) setData(json.data);
      } catch (error) {
        console.error("Lanyard status update failed:", error);
      }
    }

    poll();
    const intervalId = setInterval(poll, POLL_INTERVAL_MS);
    return () => {
      cancelled = true;
      clearInterval(intervalId);
    };
  }, []);

  return (
    <PresenceContext.Provider value={data}>
      {children}
    </PresenceContext.Provider>
  );
}
