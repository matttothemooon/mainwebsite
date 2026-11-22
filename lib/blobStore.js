// lib/blobStore.js
// Small JSON files in Vercel Blob, used by the pastebin and the guestbook.
// Without a Blob store (local development) files go in .dev-blob/ instead.

import fs from "fs/promises";
import path from "path";

const hasBlob = () => Boolean(process.env.BLOB_READ_WRITE_TOKEN || process.env.BLOB_STORE_ID);
const useLocal = () => !hasBlob() && !process.env.VERCEL;
const LOCAL_DIR = () => path.join(process.cwd(), ".dev-blob");
const localPath = (name) => {
  if (!/^[a-z0-9][a-z0-9/_-]*\.json$/.test(name) || name.includes("..")) throw new Error("bad name");
  return path.join(LOCAL_DIR(), name);
};

// Whether files can be saved on this deployment.
export const isConfigured = () => hasBlob() || useLocal();

// A Blob store is either private or public, chosen when it's created. Try
// private first and remember whichever the store accepts.
let access = "private";
async function withAccess(run) {
  try {
    return await run(access);
  } catch (err) {
    if (!/access|public|private/i.test(String(err?.message))) throw err;
    access = access === "private" ? "public" : "private";
    return run(access);
  }
}

const blob = () => import("@vercel/blob");

export async function writeJson(name, value, { overwrite = true } = {}) {
  const body = JSON.stringify(value);
  if (useLocal()) {
    const file = localPath(name);
    await fs.mkdir(path.dirname(file), { recursive: true });
    await fs.writeFile(file, body, overwrite ? undefined : { flag: "wx" });
    return;
  }
  const { put } = await blob();
  await withAccess((a) =>
    put(name, body, {
      access: a,
      contentType: "application/json",
      addRandomSuffix: false,
      allowOverwrite: overwrite,
      cacheControlMaxAge: 60,
    })
  );
}

// The parsed file, or null when it doesn't exist. `fresh` skips Blob's CDN
// cache, for files that are read, changed and written back.
export async function readJson(name, { fresh = false } = {}) {
  if (useLocal()) {
    try {
      return JSON.parse(await fs.readFile(localPath(name), "utf8"));
    } catch (err) {
      if (err.code === "ENOENT") return null;
      throw err;
    }
  }
  const { get } = await blob();
  const res = await withAccess((a) => get(name, { access: a, ...(fresh ? { useCache: false } : {}) }));
  if (!res || res.statusCode !== 200) return null;
  return JSON.parse(await new Response(res.stream).text());
}

export async function removeJson(name) {
  if (useLocal()) {
    await fs.rm(localPath(name), { force: true });
    return;
  }
  const { del } = await blob();
  await del(name);
}

// Names (like "haste/abc123.json") under a prefix.
export async function listNames(prefix, { max = 5000 } = {}) {
  if (useLocal()) {
    const dir = path.join(LOCAL_DIR(), prefix);
    try {
      return (await fs.readdir(dir)).filter((f) => f.endsWith(".json")).map((f) => `${prefix}${f}`);
    } catch (err) {
      if (err.code === "ENOENT") return [];
      throw err;
    }
  }
  const { list } = await blob();
  const names = [];
  let cursor;
  do {
    const page = await list({ prefix, limit: 1000, cursor });
    names.push(...page.blobs.map((b) => b.pathname));
    cursor = page.hasMore ? page.cursor : undefined;
  } while (cursor && names.length < max);
  return names;
}
