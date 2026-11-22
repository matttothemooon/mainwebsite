import assert from "node:assert/strict";
import { test, after } from "node:test";
import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";

delete process.env.BLOB_READ_WRITE_TOKEN;
delete process.env.BLOB_STORE_ID;
delete process.env.VERCEL;
const workDir = await fs.mkdtemp(path.join(os.tmpdir(), "gb-test-"));
process.chdir(workDir);
after(() => fs.rm(workDir, { recursive: true, force: true }));
const gb = await import("./guestbook.js");

test("rejects empty, too long and linked entries", () => {
  assert.throws(() => gb.cleanEntry({ name: "", message: "hi" }), /name/);
  assert.throws(() => gb.cleanEntry({ name: "a", message: "  " }), /message/);
  assert.throws(() => gb.cleanEntry({ name: "a", message: "x".repeat(gb.MAX_MESSAGE + 1) }), /up to/);
  assert.throws(() => gb.cleanEntry({ name: "a", message: "join discord.gg/abc" }), /Links/);
  assert.throws(() => gb.cleanEntry({ name: "buy at spam.com", message: "hi" }), /Links/);
  assert.deepEqual(gb.cleanEntry({ name: "  Matt  ", message: "hey\n\n\n\nthere" }), { name: "Matt", message: "hey\n\nthere" });
});

test("new messages wait; approving publishes; deleting removes", async () => {
  const id = await gb.submitEntry({ name: "Viewer", message: "Great streams!" });
  assert.equal((await gb.pendingEntries()).length, 1);
  assert.equal((await gb.approvedEntries()).length, 0);

  await gb.approve(id);
  assert.equal((await gb.pendingEntries()).length, 0);
  const shown = await gb.approvedEntries();
  assert.deepEqual(shown.map((e) => e.name), ["Viewer"]);
  assert.ok(!("ipHash" in shown[0]), "public list doesn't expose visitor hashes");

  const second = await gb.submitEntry({ name: "Spam", message: "nope" });
  await gb.remove(second);
  assert.equal((await gb.pendingEntries()).length, 0);
  await gb.remove(id);
  assert.equal((await gb.approvedEntries()).length, 0);
  await assert.rejects(gb.approve("../../x"));
});
