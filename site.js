// site.js
const DISCORD_USER_ID = "436300903927119873";
const LANYARD_URL = `https://api.lanyard.rest/v1/users/${DISCORD_USER_ID}`;
const POLL_INTERVAL_MS = 15000;

/* ---------- Lanyard status ---------- */

function renderDiscordStatus(data) {
  const dot = document.getElementById("discord-dot");
  const text = document.getElementById("discord-status-text");

  const statusLabel = {
    online: "online",
    idle: "idle",
    dnd: "do not disturb",
    offline: "offline",
  }[data.discord_status] || "offline";

  dot.classList.toggle("online", data.discord_status !== "offline");
  text.textContent = `Discord: ${statusLabel}`;
}

function renderSpotifyStatus(data) {
  const link = document.getElementById("spotify-link");
  const text = document.getElementById("spotify-status-text");

  if (data.listening_to_spotify && data.spotify) {
    const { song, artist, track_id } = data.spotify;
    text.textContent = `${song} — ${artist}`;
    link.href = `https://open.spotify.com/track/${track_id}`;
    link.classList.remove("status-row--disabled");
  } else {
    text.textContent = "not listening to Spotify";
    link.href = "#";
    link.classList.add("status-row--disabled");
  }
}

async function pollLanyard() {
  try {
    const res = await fetch(LANYARD_URL);
    if (!res.ok) throw new Error(`Lanyard fetch failed: ${res.status}`);
    const { data } = await res.json();

    renderDiscordStatus(data);
    renderSpotifyStatus(data);
  } catch (err) {
    console.error("Lanyard status update failed:", err);
  }
}

/* ---------- links (admin-managed) ---------- */

async function loadLinks() {
  try {
    const res = await fetch("/api/links");
    if (!res.ok) throw new Error(`Links fetch failed: ${res.status}`);
    const links = await res.json();

    document.getElementById("links").innerHTML = links
      .map((l) => `<a href="${l.url}" target="_blank" rel="noopener">${l.label}</a>`)
      .join("");
  } catch (err) {
    console.error("Links load failed:", err);
  }
}

/* ---------- init ---------- */

loadLinks();
pollLanyard();
setInterval(pollLanyard, POLL_INTERVAL_MS);
