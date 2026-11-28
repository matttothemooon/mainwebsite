# mainwebsite

Personal site for [mattothemoon.xyz](https://mattothemoon.xyz): profile, mod list, guides, free mod tools, gear,
a "work with me" page, a paste bin and a guestbook, all edited from a Discord-locked admin panel.

## Stack

- Next.js 16 (App Router) + React 19, on Vercel
- Profile data in `data/profile.json`, read and written through the GitHub Contents API
- Vercel Blob for pastes and the guestbook
- Discord OAuth for the admin login, limited to an allowlist of Discord user IDs
- Lanyard for Discord presence; optional Twitch and Spotify connections

## Structure

```
app/page.jsx                 homepage
app/work, what-i-use, ...    the other pages (Work with me, Tools, guides, haste, guestbook,
                             blocked-terms, commands)
app/admin                    /admin
app/api/admin/*              admin-only routes (profile, Twitch/Discord/Spotify connect, uploads, ...)
app/api/auth/*               Discord login
app/mod-kit/route.js         short link to the mod help Discord server

components/                  page pieces; AdminPanel.jsx is the whole editor
lib/storage.js               profile storage and validation
lib/auth.js                  session cookie, allowlist, OAuth state
lib/seal.js                  encrypts saved OAuth refresh tokens
lib/twitch.js, twitchAuth.js Twitch app token, live status, follower counts, mod sync
lib/discordConnect.js        Discord servers you're staff in
lib/spotify.js               Spotify now playing
lib/blobStore.js             Vercel Blob (pastes via lib/haste.js, guestbook via lib/guestbook.js)
```

## Running locally

```
npm install
npm run dev
```

Open <http://localhost:3000> and <http://localhost:3000/admin>. No Discord app, Vercel account or GitHub token is
needed:

- Auth is bypassed and the admin panel says so.
- The profile starts from `data/profile.json`; admin edits save to `.dev-profile.json` (gitignored). Delete it to reset.
- Pastes and guestbook entries go to `.dev-blob/`.

`npm test` runs the unit tests; `npm run build` checks the production build.

The bypass only works when `ADMIN_DEV_NO_AUTH` is set (only `npm run dev` sets it), the process is not on Vercel
(`VERCEL=1`), and the request's Host is loopback, so it can't unlock the live admin panel. To try the real Discord
login locally, run `npm run dev:auth` with the Discord variables and `SESSION_SECRET` set, and add
`http://localhost:3000/api/auth/callback` to the Discord app's redirects.

## Setup

Set these in Vercel → Settings → Environment Variables (see `.env.example`):

- `DISCORD_CLIENT_ID`, `DISCORD_CLIENT_SECRET`: Discord app, with `https://mattothemoon.xyz/api/auth/callback` as a
  redirect.
- `DISCORD_ALLOWED_IDS` (optional): Discord user IDs allowed into /admin. Unset falls back to `OWNER_ID` in
  `lib/auth.js`; clearing it does not lock the owner out.
- `SESSION_SECRET`: a long random string.
- `GITHUB_TOKEN`: fine-grained token with Contents read and write on this repo.
- Blob store connected to the project (adds `BLOB_READ_WRITE_TOKEN` / `BLOB_STORE_ID`).
- Optional: `TWITCH_CLIENT_ID` / `TWITCH_CLIENT_SECRET`, `SPOTIFY_CLIENT_ID` / `SPOTIFY_CLIENT_SECRET`. Connect
  each from the admin panel, which shows the redirect URL to register.

## Storage and safety

Each admin save is a commit to `data/profile.json`, and Vercel redeploys. Everything is validated server-side in
`lib/storage.js`: unknown fields are dropped, lengths capped, and URLs limited to `http(s):` and site paths.
Twitch, Discord and Spotify refresh tokens are stored encrypted with a key derived from `SESSION_SECRET`, since the
repo is public. Uploaded link icons go to `public/uploads/` and SVGs are served with a sandboxing CSP.

The admin session is an HMAC-signed HttpOnly cookie (12 hours). The allowlist is re-checked on every request, and
the OAuth flow uses a signed single-use `state` cookie.
