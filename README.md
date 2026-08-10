# mainwebsite

Personal site for [mattothemoon.xyz](https://mattothemoon.xyz) — a terminal-styled presence page with live Discord/Spotify status and admin-editable social links.

## Stack

- Static HTML/CSS/JS, no build step
- Vercel serverless functions (`/api`) for the admin backend
- Vercel Blob for storage (JSON blob, no database)
- GitHub OAuth for admin login, restricted to one allowed username
- Deployed via Vercel, auto-builds on push to `main`

## Structure

```
index.html               homepage — links rendered client-side from stored data;
                          bio and mod experience are static in the markup
admin.html                admin panel UI, reachable at /admin
api/links.js               public endpoint — serves current links to the homepage
api/admin/links.js         protected endpoint — add/edit/remove/reorder links
api/auth/login.js          starts the GitHub OAuth flow
api/auth/callback.js       completes OAuth, verifies username, sets session cookie
api/auth/logout.js         clears the session cookie
lib/storage.js             reads/writes the links JSON blob in Vercel Blob
lib/auth.js                signs/verifies the session cookie
styles.css                 shared black terminal theme
site.js                    Lanyard status polling + links fetch (homepage only)
package.json               dependencies (@vercel/blob)
vercel.json                 routing config (cleanUrls: true — /admin maps to admin.html)
```

## Setup

1. Create a GitHub OAuth App (github.com → Settings → Developer settings → OAuth Apps):
   - Homepage URL: `https://mattothemoon.xyz`
   - Authorization callback URL: `https://mattothemoon.xyz/api/auth/callback`
   - Note the generated Client ID and Client Secret.

2. Install dependencies:
   ```
   npm install
   ```

3. In the Vercel project settings → Environment Variables, add:
   - `GITHUB_CLIENT_ID` — from the OAuth App above
   - `GITHUB_CLIENT_SECRET` — from the OAuth App above
   - `GITHUB_ALLOWED_USER` — your GitHub username (only this account can log in)
   - `SESSION_SECRET` — any long random string, used to sign the session cookie
   - Enable Vercel Blob for the project (Storage tab) if not already — this sets `BLOB_READ_WRITE_TOKEN` automatically

4. Push to `main`. Vercel auto-detects `/api` as serverless functions — nothing else to configure.

## Using the admin panel

Go to `mattothemoon.xyz/admin`, click "sign in with github," and authorize with the allowed account. From there you can add/edit/remove/reorder links. Changes show up on the homepage immediately (cached 60s).

## How links work

Links are stored as a JSON blob (`admin/social-links.json`) in Vercel Blob and fetched client-side by the homepage on load. `api/links.js` is the public read endpoint; `api/admin/links.js` is the protected write endpoint, guarded by `lib/auth.js` checking the signed session cookie set after GitHub login.

Everything else on the page — terminal styling, the Discord/Spotify status block, the mod experience section — is static in `index.html`.

## Notes

- No database — storage is a single JSON blob in the same Vercel Blob store the image host (`/i/`) already uses.
- Auth is GitHub OAuth restricted to one username (`GITHUB_ALLOWED_USER`) via a signed HttpOnly cookie — no separate admin password to manage or leak.
