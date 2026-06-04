# mainwebsite

Personal landing page and image host for mattothemoon.xyz.

## About

This repository is a personal landing page for mattothemoon.xyz.

## Local testing

1. Install dependencies:
   ```bash
   npm install
   ```
2. Start the development server:
   ```bash
   npx vercel dev --listen 3000
   ```
3. Open the site at:
   ```
   http://localhost:3000
   ```

## Admin dashboard

The site includes an admin editor for managing content JSON and creating new pages.

- Open the dashboard at:
  ```
  http://localhost:3000/admin.html
  ```
- Use the editor to update `content.json` directly.
- Add a new page by entering a slug and title, then click **Add new page**.
- Save changes with the admin password.

## Content save API

To enable dashboard saves, set these environment variables in your Vercel project or `.env.local`:

```bash
ADMIN_PASSWORD=your-secret-password
GITHUB_TOKEN=your-github-personal-access-token
```

> Vercel CLI requires authentication. Run `npx vercel login` if needed.
