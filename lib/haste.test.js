import assert from "node:assert/strict";
import { test, after } from "node:test";
import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";

delete process.env.BLOB_READ_WRITE_TOKEN;
delete process.env.BLOB_STORE_ID;
delete process.env.VERCEL;
const workDir = await fs.mkdtemp(path.join(os.tmpdir(), "haste-test-"));
process.chdir(workDir); // local mode writes .dev-blob/ here
after(() => fs.rm(workDir, { recursive: true, force: true }));

const h = await import("./haste.js");

test("ids are 6 readable characters", () => {
  for (let i = 0; i < 200; i++) {
    const id = h.newId();
    assert.match(id, h.ID_PATTERN);
    assert.doesNotMatch(id, /[01ilo]/);
  }
});

test("saves and reads a paste; unknown or malformed ids are null", async () => {
  const id = await h.createPaste({ content: "hello\r\nworld", language: "python", expiry: "1d", ipHash: "abc" });
  const paste = await h.getPaste(id);
  assert.equal(paste.content, "hello\nworld");
  assert.equal(paste.language, "python");
  assert.ok(Date.parse(paste.expiresAt) - Date.parse(paste.createdAt) === 24 * 3600 * 1000);
  assert.equal(await h.getPaste("zzzzzz"), null);
  assert.equal(await h.getPaste("../../etc/passwd"), null);
});

test("rejects empty and oversized pastes; unknown options fall back", async () => {
  await assert.rejects(h.createPaste({ content: "   \n " }), /empty/);
  await assert.rejects(h.createPaste({ content: "x".repeat(h.MAX_BYTES + 1) }), /up to/);
  const id = await h.createPaste({ content: "x", language: "<script>", expiry: "forever" });
  const p = await h.getPaste(id);
  assert.equal(p.language, "auto");
  assert.ok(Date.parse(p.expiresAt) - Date.parse(p.createdAt) === 7 * 24 * 3600 * 1000);
});

test("expired pastes disappear and are cleaned up", async () => {
  const id = await h.createPaste({ content: "old" });
  const file = path.join(workDir, ".dev-blob", "haste", `${id}.json`);
  const record = JSON.parse(await fs.readFile(file, "utf8"));
  record.expiresAt = new Date(Date.now() - 1000).toISOString();
  await fs.writeFile(file, JSON.stringify(record));
  assert.equal(await h.getPaste(id), null);
  await new Promise((r) => setTimeout(r, 50));
  await assert.rejects(fs.access(file));
});

test("lists newest first and deletes", async () => {
  const a = await h.createPaste({ content: "first line\nmore" });
  await new Promise((r) => setTimeout(r, 5));
  const b = await h.createPaste({ content: "second" });
  const list = await h.listPastes();
  assert.equal(list[0].id, b);
  assert.ok(list.some((p) => p.id === a && p.preview === "first line" && p.lines === 2));
  await h.deletePaste(a);
  assert.equal(await h.getPaste(a), null);
  await assert.rejects(h.deletePaste("../x"));
});

test("rate limit allows a burst, then asks to wait", () => {
  for (let i = 0; i < 3; i++) assert.equal(h.rateLimited("t", { max: 3, windowMs: 60000 }), 0);
  assert.ok(h.rateLimited("t", { max: 3, windowMs: 60000 }) > 0);
  assert.equal(h.rateLimited("other", { max: 3, windowMs: 60000 }), 0);
});
