// site.js
// Two independent jobs:
//   1. Poll Lanyard for live Discord/Spotify status
//   2. Fetch page content (bio/links/mod experience) from the admin API

const DISCORD_USER_ID = "436300903927119873";
const LANYARD_URL = `https://api.lanyard.rest/v1/users/${DISCORD_USER_ID}`;
const PROFILE_API = "https://mattothemoon.xyz/api/profile";
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

/* ---------- profile content (admin panel) ---------- */

function renderBio(bio) {
  document.getElementById("bio").textContent = bio;
}

function renderLinks(links) {
  const el = document.getElementById("links");
  el.innerHTML = links
    .map((l) => `<a href="${l.url}" target="_blank" rel="noopener">${l.label}</a>`)
    .join("");
}

function expRowHtml({ role, name, url, date }) {
  const nameHtml = url
    ? `<a class="exp-place" href="${url}" target="_blank" rel="noopener">${name}</a>`
    : `<span class="exp-place">${name}</span>`;

  return `
    <div class="exp-row">
      <div class="exp-main">
        <span class="exp-role">${role}</span>
        ${nameHtml}
      </div>
      <span class="exp-date">${date}</span>
    </div>`;
}

function expGroupHtml(label, rows) {
  return `
    <div class="exp-group">
      <div class="exp-label">${label}</div>
      ${rows.map(expRowHtml).join("")}
    </div>`;
}

function renderExperience(modExperience) {
  const el = document.getElementById("exp-block");
  el.innerHTML =
    expGroupHtml("active", modExperience.active) +
    expGroupHtml("past", modExperience.past);
}

async function loadProfile() {
  try {
    const res = await fetch(PROFILE_API);
    if (!res.ok) throw new Error(`Profile fetch failed: ${res.status}`);
    const data = await res.json();

    renderBio(data.bio);
    renderLinks(data.links);
    renderExperience(data.modExperience);
  } catch (err) {
    // Fallback markup already in index.html stays visible on failure.
    console.error("Profile load failed:", err);
  }
}

/* ---------- init ---------- */

loadProfile();
pollLanyard();
setInterval(pollLanyard, POLL_INTERVAL_MS);
