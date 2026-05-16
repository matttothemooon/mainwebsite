import { kv } from "@vercel/kv";

export default async function handler(req, res) {
  const { id } = req.query;

  if (!id) {
    return res.status(400).json({ error: "No ID provided" });
  }

  try {
    const data = await kv.get(`img:${id}`);

    if (!data) {
      return res.status(404).send(`
        <!DOCTYPE html>
        <html>
          <head>
            <title>Not Found — mattothemoon.xyz</title>
            <style>
              body { background: #0a0a0f; color: #00e5ff; font-family: monospace; display: flex; align-items: center; justify-content: center; height: 100vh; margin: 0; flex-direction: column; gap: 12px; }
              a { color: #00e5ff; }
            </style>
          </head>
          <body>
            <div style="font-size: 48px">🌙</div>
            <div style="font-size: 24px">image not found</div>
            <a href="/">← back to mattothemoon.xyz</a>
          </body>
        </html>
      `);
    }

    // Redirect to the actual blob URL
    return res.redirect(301, data.url);
  } catch (err) {
    console.error("Redirect error:", err);
    return res.status(500).json({ error: "Lookup failed" });
  }
}
