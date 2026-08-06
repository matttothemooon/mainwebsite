// lib/storage.js
// Reads/writes social-links.json to Vercel Blob. Requires BLOB_READ_WRITE_TOKEN
// (Vercel sets this automatically once Blob is attached to the project).

const { put, list } = require('@vercel/blob');

const BLOB_PATH = 'admin/social-links.json';

async function getLinks() {
  try {
    const { blobs } = await list({ prefix: BLOB_PATH });
    const match = blobs.find((b) => b.pathname === BLOB_PATH);
    if (!match) return [];
    const res = await fetch(match.url);
    if (!res.ok) return [];
    return await res.json();
  } catch (err) {
    console.error('getLinks failed:', err);
    return [];
  }
}

async function saveLinks(links) {
  const body = JSON.stringify(links, null, 2);
  await put(BLOB_PATH, body, {
    access: 'public',
    contentType: 'application/json',
    addRandomSuffix: false,
    allowOverwrite: true,
  });
  return links;
}

module.exports = { getLinks, saveLinks };
