# Social Links Admin — setup for mainwebsite

Drop these into your `matttothemooon/mainwebsite` repo:

```
api/links.js
api/admin/links.js
lib/storage.js
lib/auth.js
admin.html          (new — the admin panel, visit at /admin)
index.html           (replaces your current one — same content, .links div
                       is now dynamic instead of hardcoded)
package.json         (new — repo has no dependencies yet)
```

## Steps

1. Copy the files above into the repo at those paths.
2. `npm install` locally once (adds `@vercel/blob` — Vercel will also run this
   on deploy automatically).
3. In Vercel project settings → Environment Variables, add:
   - `ADMIN_SECRET` — pick any long random string, this is your admin password
   - Enable Vercel Blob for the project (Storage tab) if you haven't already —
     this sets `BLOB_READ_WRITE_TOKEN` automatically
4. Commit and push. Vercel auto-detects `/api` as serverless functions —
   nothing else to configure. `cleanUrls: true` in your `vercel.json` means
   `/admin.html` is reachable at `/admin`.
5. Go to `mattothemoon.xyz/admin`, enter your `ADMIN_SECRET`, and start
   adding/editing/removing/reordering links. They'll show up on the homepage
   immediately (cached 60s).

## What changed vs. before

- Your six links (twitch, x, github, discord, discord profile, email) aren't
  in `index.html` anymore — first time you load `/admin`, add them there so
  they're in the system, then delete the old ones aren't needed since the
  file already has them removed from HTML.
- Everything else (styling, terminal look, Discord/Spotify status block,
  experience section) is untouched.
- Storage is a JSON blob (`admin/social-links.json`) in the same Vercel Blob
  store your image host already uses — no new service needed.
