# mainwebsite

Personal site for [mattothemoon.xyz](https://mattothemoon.xyz) — a terminal-styled presence page with live Discord/Spotify status and admin-editable social links.

## Stack

- Static HTML/CSS/JS, no build step
- Vercel serverless functions (`/api`) for the admin backend
- Vercel Blob for storage (JSON blob, no database)
- Deployed via Vercel, auto-builds on push to `main`

## Structure

```
index.html            homepage — links are rendered client-side from stored data
admin.html             admin panel UI, reachable at /admin
api/links.js            public endpoint — serves current links to the homepage
api/admin/links.js      protected endpoint — add/edit/remove/reorder links
lib/storage.js         reads/writes the links JSON blob in Vercel Blob
lib/auth.js            checks ADMIN_SECRET on admin requests
package.json           dependencies (@vercel/blob)
vercel.json             routing config (cleanUrls: true — /admin maps to admin.html)
```

## Setup

1. Clone the repo and install dependencies:
   ```
   npm install
   ```
2. In the Vercel project settings → Environment Variables, add:
   - `ADMIN_SECRET` — any long random string; this is the admin panel password
   - Enable Vercel Blob for the project (Storage tab) if not already — this sets `BLOB_READ_WRITE_TOKEN` automatically
3. Push to `main`. Vercel auto-detects `/api` as serverless functions — nothing else to configure.

## Using the admin panel

Go to `mattothemoon.xyz/admin`, enter your `ADMIN_SECRET`, and add/edit/remove/reorder links from there. Changes show up on the homepage immediately (cached 60s).

## How links work

Links used to be hardcoded in `index.html`. They're now stored as a JSON blob (`admin/social-links.json`) in Vercel Blob and fetched client-side by the homepage on load. `api/links.js` is the public read endpoint; `api/admin/links.js` is the protected write endpoint, guarded by `lib/auth.js` checking `ADMIN_SECRET`.

Everything else on the page — terminal styling, the Discord/Spotify status block, the mod experience section — is untouched and still lives directly in `index.html`.

## Notes

- No database — storage is a single JSON blob in the same Vercel Blob store the image host (`/i/`) already uses.
- `ADMIN_SECRET` is the only auth — anyone with it can edit links. Treat it like a password.
