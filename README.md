# mainwebsite

Personal site for [mattothemoon.xyz](https://mattothemoon.xyz) — a terminal-styled presence page with live Discord/Spotify status, streamer hover cards, and a Discord-locked admin panel that edits every piece of content on the homepage.

## Stack

- **Next.js 16 (App Router) + React 19**
- GitHub Contents API for profile data and custom icon storage
- **Discord OAuth** for admin login, restricted to an allowlist of Discord user IDs
- `simple-icons` for social link glyphs
- Twitch Helix API (optional) for autofilling streamer avatars

## Structure

```
app/layout.jsx                  html shell + global styles
app/page.jsx                    homepage — server-rendered from the profile
app/pages/page.jsx              index of published custom pages
app/pages/[slug]/page.jsx       server-rendered custom page
app/globals.css                 the black terminal theme
app/admin/page.jsx              /admin route
app/admin/admin.css             admin-only styles

components/SocialLinks.jsx      icon-only social links (server component)
components/StatusBlock.jsx      Lanyard Discord/Spotify polling (client)
components/Experience.jsx       mod experience + streamer hover cards (client)
components/AdminPanel.jsx       the whole editor (client)
components/IconPreview.jsx      shared link-icon preview

app/api/profile/route.js        public read endpoint
app/api/admin/profile/route.js  protected read/write of the whole profile
app/api/admin/twitch/route.js   protected Twitch channel lookup
app/api/admin/upload/route.js   protected custom link-icon upload
app/api/auth/{login,callback,logout}/route.js   Discord OAuth
app/api/cms-{auth,callback}/route.js            Decap CMS GitHub OAuth

lib/auth.js                     session cookie, allowlist, OAuth state
lib/storage.js                  profile + icon storage, validation
lib/icons.js                    URL/label -> brand icon resolution
lib/twitch.js                   Twitch app token + channel lookup

public/                         robots.txt, sitemap.xml, cms/, uploads/
```

## Running locally

```
npm install
npm run dev
```

Then open <http://localhost:3000> and <http://localhost:3000/admin>.

No Discord app, Vercel account, or GitHub token is needed. Locally:

- **Auth is bypassed** — the admin panel opens straight into the editor, with a
  banner saying so.
- **The initial profile comes from `data/profile.json`**, so the local site
  matches the profile checked into the current checkout. Admin edits save to
  `.dev-profile.json` and uploaded icons to `public/uploads/` (both gitignored)
  instead of GitHub. Delete `.dev-profile.json` to reset to the checked-in
  profile.

To exercise the real Discord login flow locally, run `npm run dev:auth` with
`DISCORD_CLIENT_ID`, `DISCORD_CLIENT_SECRET`, `DISCORD_ALLOWED_IDS`, and
`SESSION_SECRET` set, and add `http://localhost:3000/api/auth/callback` to the
Discord app's redirect list.

### Why the local bypass cannot affect production

`ADMIN_DEV_NO_AUTH` (set only by `npm run dev`) does nothing on its own. The
bypass additionally requires that the process is **not running on Vercel**
(which always sets `VERCEL=1`) and that the request's `Host` is loopback.
Setting the variable in the deployed environment therefore cannot unlock the
live admin panel, and neither can spoofing a `Host` header at the real domain.

## Setup

1. Create a Discord application at <https://discord.com/developers/applications>:
   - OAuth2 → Redirects → add `https://mattothemoon.xyz/api/auth/callback`
   - Note the **Client ID** and **Client Secret**.

2. In Vercel → project settings → Environment Variables, add:
   - `DISCORD_CLIENT_ID` — from the Discord app above
   - `DISCORD_CLIENT_SECRET` — from the Discord app above
   - `DISCORD_ALLOWED_IDS` — *optional.* Comma-separated Discord **user IDs**
     allowed to edit (e.g. `436300903927119873,111111111111111111`). Leave it
     unset and it falls back to `OWNER_ID` in `lib/auth.js`, so a fresh deploy
     is never locked out. Setting it replaces that list entirely.
   - `SESSION_SECRET` — any long random string, used to sign the session cookie
   - Create a GitHub fine-grained personal access token with **Contents: Read
    and write** access to `matttothemooon/mainwebsite`.
   - Add `GITHUB_TOKEN` in Vercel. Keep it server-only; never expose it to
     browser code.

   Optional, enables the "fetch" button on streamer entries:
   - `TWITCH_CLIENT_ID` / `TWITCH_CLIENT_SECRET` — from <https://dev.twitch.tv/console/apps>

3. Push to `main`. Vercel detects Next.js automatically.

To find your Discord user ID: Discord → Settings → Advanced → enable Developer
Mode, then right-click your name → Copy User ID.

## Using the admin panel

Go to `mattothemoon.xyz/admin` and sign in with Discord. Accounts not in
`DISCORD_ALLOWED_IDS` are rejected with an explanation. From there you can edit:

- **display name** and **bio**
- **links** — see below
- **mod experience** — active and past groups, each entry with role, name, date,
  link URL, and the hover-card fields
- **pages** — guide pages and resource lists with a title, URL slug, category,
  description, and Markdown content. The Mod resources and Overlay resources
  pages are plain lists of links; edit them here like any other page. Published
  pages are grouped by category on `/pages` and linked from the homepage. Draft
  pages stay private; unpublishing or deleting a page makes its URL return 404.
  Content supports headings, lists, quotes, code blocks, formatting, links, and
  HTTPS images.

Saving revalidates the homepage and page routes, so changes appear immediately.

Removing an ID from `DISCORD_ALLOWED_IDS` revokes access immediately — the
allowlist is re-checked on every request, not just at login.

Note the one asymmetry: *clearing the variable entirely* does not lock everyone
out, it reverts to `OWNER_ID` in `lib/auth.js`. To revoke the owner account, set
`DISCORD_ALLOWED_IDS` to a different ID rather than emptying it, or change that
constant.

## Links are icons

Links render as **white icons with no text**. Each row in the admin panel shows a
live preview of exactly what the homepage will render. The icon is chosen in this
order:

1. **A custom upload**, if you've added one.
2. **The URL's domain** — `twitch.tv`, `github.com`, `youtube.com`, and ~30 other
   platforms, using the real brand artwork from `simple-icons`.
3. **The label**, for URLs with no domain to read. This is how the seeded
   `/discord` link gets the Discord icon.
4. **A generic link glyph**, so a link always renders something.

The **label is never displayed.** It is the link's accessible name — an icon-only
link is otherwise unreadable to a screen reader — and the fallback icon hint.

When a link falls through to the generic glyph, the admin panel says so and
offers an **upload icon** button (PNG, JPEG, WebP, GIF or SVG, up to 512KB).
Uploaded icons are recoloured to a white silhouette so they match the rest of the
set; press **use auto icon** to drop the upload and go back to detection.

LinkedIn has no icon: `simple-icons` removed it at LinkedIn's request. A LinkedIn
link gets the generic glyph unless you upload one.

Uploaded SVGs are served with a `sandbox` Content-Security-Policy (see
`next.config.mjs`) so a script embedded in one cannot execute. In production
uploads are committed to `public/uploads/` and become available after Vercel
redeploys the commit.

## Streamer hover cards

Hovering (or keyboard-focusing) a streamer's name shows their profile picture,
Twitch handle, and follower count. A name only gets a card if at least one of
those fields is filled in.

With `TWITCH_CLIENT_ID`/`TWITCH_CLIENT_SECRET` set, the **fetch** button next to
a Twitch name pulls the avatar and display name automatically.

**Follower counts usually have to be typed in by hand.** In June 2023 Twitch put
follower counts behind a *user* access token carrying the
`moderator:read:followers` scope for that specific channel. An app token — which
is all a server can hold — cannot read another channel's count, so the API
returns nothing and the panel falls back to the number you enter. The fetch
button still fills in the avatar and display name.

## Twitch sub-goal overlay

The public `/stream-overlays` page is a self-service setup dashboard. Every
streamer connects their own Twitch account once; the website's private `/admin`
panel is not needed. Twitch authorization is required for automatic subscription
events and chat commands.

To enable automatic updates:

1. In the Twitch Developer Console, create or select an app and set its OAuth
   redirect URL to `https://www.mattothemoon.xyz/api/twitch/subgoal/callback`.
   The app uses `SITE_URL` as the canonical host for Twitch callbacks.
2. In Vercel, connect a **private** Blob store to this project. Add its
   `BLOB_READ_WRITE_TOKEN` to the Production environment if Vercel does not
   provide Blob credentials automatically.
3. Add `TWITCH_CLIENT_ID` and `TWITCH_CLIENT_SECRET` from the Twitch app, and
   `SUBGOAL_ENCRYPTION_KEY` as a new 32-byte key. Generate one with
   `openssl rand -hex 32`. Do not reuse `SESSION_SECRET` or expose this key to
   client code. Set `SITE_URL` to the canonical HTTPS origin used by the app
   (`https://www.mattothemoon.xyz`).
4. Redeploy. Each streamer opens `/stream-overlays` and chooses **connect my
   Twitch**. Approve the
   `channel:read:subscriptions` and `user:read:chat` permissions.
5. Copy the channel URL from the setup page into OBS as a Browser Source at
   exactly **600 × 80**. Leave **Shutdown source when not visible** disabled.

The initial count is seeded from the connected channel's active subscribers.
New subscriptions, resubs, and gift subscriptions increment the saved count;
it does not reset automatically. The broadcaster and moderators can use:

- `!subgoal <number>` — set the goal
- `!setsubs <number>` — set the current count
- `!ic <number>` — set the goal
- `!remove` — subtract one from the count
- `!increment <number>` — add that many to the count
- `!hidegoal` / `!showgoal` — hide or show the goal
- `!painturl <url>` / `!clearpaint` — apply or clear a 7TV paint across all
  overlay text (label, count, and goal)

The existing `!subs +`, `!subs -`, and `!resetsubs` commands are also supported.
Paint URLs must be valid 7TV paint links.

Twitch sends chat commands and subscription events to the EventSub webhook at
`/api/twitch/subgoal/eventsub`. The webhook verifies Twitch's request signature,
and only the broadcaster or moderators can change the count or goal. Each
channel's encrypted OAuth credentials and overlay state are stored separately
in private Blob storage. The overlay URL's `channel` parameter selects that
channel's saved state. Use `/overlay/subgoal?demo=1&channel=feelssunnyman` to
preview the visual, or add `&test=1` and size the test source to 600 × 180 to
use the on-screen test controls.

For local development, encrypted per-channel state is stored in ignored
`.dev-subgoal-*.json` files.

## How storage works

The profile is stored as `data/profile.json` in the GitHub repository. Custom
icons are committed under `public/uploads/`. The homepage reads the profile
through the GitHub Contents API, while the admin panel updates it through the
same API. Each save creates a GitHub commit and Vercel redeploys automatically.
The homepage remains a **server component**, so the content is in the initial
HTML — no client fetch, no flash, and it is indexable.

Everything written through the admin panel is validated and normalised
server-side in `lib/storage.js` before it is stored — unknown fields are dropped,
lengths are capped, and URLs are restricted to `http(s):`, `mailto:`, and
site-relative paths so a `javascript:` URL can never reach the page.

### GitHub storage setup

Create a GitHub fine-grained personal access token restricted to this repository
with **Contents: Read and write** permission. Add it to Vercel as
`GITHUB_TOKEN`, then redeploy. `GITHUB_REPOSITORY`, `GITHUB_BRANCH`, and
`GITHUB_PROFILE_PATH` have useful defaults in `lib/storage.js` and only need to
be added if your repository layout differs. Without `GITHUB_TOKEN`, local
development uses `.dev-profile.json` and `public/uploads/` fallbacks, seeding
the local profile from `data/profile.json` until the first local edit;
production reads the profile from GitHub and reports a configuration error
when saving if the token is missing.

## Auth notes

- Discord OAuth restricted to `DISCORD_ALLOWED_IDS`, via an HMAC-signed HttpOnly
  cookie — no admin password to manage or leak.
- The OAuth flow uses a signed, single-use `state` cookie to block CSRF.
- Cookie signatures are compared in constant time.
- Sessions last 12 hours.

## Decap CMS (`/cms`)

A separate Decap CMS for long-form Markdown pages under `content/pages`, at
`/cms`, using **GitHub** OAuth. Independent of the Discord admin panel and
unrelated to the homepage content. Needs `OAUTH_CLIENT_ID` / `OAUTH_CLIENT_SECRET`
(a GitHub OAuth App whose callback URL is `https://<host>/api/cms-callback`).

Note that nothing currently renders `content/pages/*.md` into pages — the old
`build.js` that did this was removed during the Next.js migration, since it
deleted and rebuilt `public/`, which is now Next's static asset directory. To
publish those pages, add a route that reads the Markdown (for example an
`app/[slug]/page.jsx` using `gray-matter` + `marked`).

`templates/page-template.html` is likewise orphaned — it still links to the
pre-migration `/styles.css` and `/site.js`, which no longer exist. Treat it as a
reference for the old markup, not something to reuse as-is.

`content/pages/mod-experiance.md` duplicates the mod experience that now lives in
the admin panel. The homepage reads the admin panel's data, not that file.

If you don't want the CMS, deleting `public/cms/`, `app/api/cms-*`, `content/`,
and `templates/` removes it cleanly.
