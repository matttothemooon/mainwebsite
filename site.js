document.addEventListener('DOMContentLoaded', () => {
  const statusDot = document.querySelector('.status-dot');
  const statusText = document.getElementById('status-text');
  const nowPlaying = document.getElementById('now-playing');

  const DISCORD_ID = '436300903927119873';

  async function loadLanyard() {
    try {
      const response = await fetch(`https://api.lanyard.rest/v1/users/${DISCORD_ID}`);
      const json = await response.json();
      const data = json?.data;

      const statusMap = {
        online: { label: 'online', className: 'online' },
        idle: { label: 'idle', className: 'idle' },
        dnd: { label: 'do not disturb', className: 'dnd' },
        offline: { label: 'offline', className: 'offline' }
      };

      const discordStatus = data?.discord_status || 'offline';
      const state = statusMap[discordStatus] || statusMap.offline;

      if (statusDot) {
        statusDot.classList.remove('online', 'idle', 'dnd', 'offline');
        statusDot.classList.add(state.className);
      }

      if (statusText) {
        statusText.textContent = state.label;
      }

      if (data?.spotify && nowPlaying) {
        const sp = data.spotify;
        nowPlaying.textContent = `now playing: ${sp.song} — ${sp.artist}`;
      } else if (nowPlaying) {
        nowPlaying.textContent = 'nothing playing right now';
      }
    } catch (error) {
      if (statusText) {
        statusText.textContent = 'offline';
      }
      if (nowPlaying) {
        nowPlaying.textContent = 'Spotify unavailable';
      }
    }
  }

  loadLanyard();
  setInterval(loadLanyard, 15000);
});
