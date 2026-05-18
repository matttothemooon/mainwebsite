# mainwebsite

Personal landing page and image host for mattothemoon.xyz.

## Image uploader

- Upload page: `/upload`
- Upload API: `POST /api/upload`
- Redirect route: `/i/<id>`
- Supported image types: `jpg`, `png`, `gif`, `webp`, `svg`
- Max upload size: `10 MB`
- If `UPLOAD_API_KEY` is configured, add `x-api-key` to the request headers.
- The upload page now uses a simple username/password login form.
- Use `mattothemoon` / `moon1234` to log in, or edit the credentials directly in `upload.html` if you want a different pair.
- The upload response returns `shortUrl` and `directUrl`. ShareX can use `directUrl` as the output field and Chatterino can display the direct image URL.

## ShareX / Chatterino

For ShareX, configure a `POST` upload with `multipart/form-data` and the file field named `file`.
- Endpoint: `https://<your-host>/api/upload`
- Method: `POST`
- Body: `multipart/form-data`
- File field: `file`

Use the response `directUrl` field as ShareX's output URL.

For raw text output from the API, add `?plain=1` to the upload URL and the API returns the direct image URL as plain text.

For Chatterino, paste the `directUrl` from the response or the returned plain text URL into chat.

## Local testing

1. Install dependencies:
   ```bash
   npm install
   ```
2. Start the development server:
   ```bash
   npx vercel dev --listen 3000
   ```
3. Open the upload page at:
   ```
   http://localhost:3000/upload
   ```

> Note: Do not open `upload.html` directly with `file://`. The uploader requires a running HTTP server so `/api/upload` can resolve.
> Vercel CLI requires authentication. Run `npx vercel login` if needed.
