import assert from "node:assert/strict";
import { test, after } from "node:test";
import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";

process.env.SESSION_SECRET = "test-secret";
process.env.TWITCH_CLIENT_ID = "id";
process.env.TWITCH_CLIENT_SECRET = "secret";
delete process.env.GITHUB_TOKEN;
// Local file mode writes .dev-*.json into the working directory; use a
// throwaway one so tests can't clash with each other or a running dev server.
const workDir = await fs.mkdtemp(path.join(os.tmpdir(), "twitch-test-"));
process.chdir(workDir); // local file mode: .dev-twitch-connection.json

const DEV_FILE = ".dev-twitch-connection.json";
const { encrypt, decrypt, saveConnection, getFollowerCounts, withLiveFollowers, clearConnection } =
  await import("./twitchAuth.js");

after(() => fs.rm(workDir, { recursive: true, force: true }));

test("encrypts and decrypts, and rejects tampering", () => {
  const sealed = encrypt("refresh-token-123");
  assert.notEqual(sealed, "refresh-token-123");
  assert.equal(decrypt(sealed), "refresh-token-123");
  const [iv, tag, data] = sealed.split(".");
  assert.throws(() => decrypt([iv, tag, data.slice(0, -2) + "AA"].join(".")));
});

test("not connected: no counts, profile unchanged", async () => {
  await fs.rm(DEV_FILE, { force: true });
  await clearConnection();
  const profile = { experience: { active: [{ twitch: "a", followers: 5 }], past: [] } };
  assert.equal(await getFollowerCounts(["a"]), null);
  assert.deepEqual(await withLiveFollowers(profile), profile);
});

test("connected: Twitch totals replace typed counts; the stored token is encrypted", async () => {
  globalThis.fetch = async (url) => {
    url = String(url);
    const json = (b) => new Response(JSON.stringify(b));
    if (url.includes("/helix/users")) return json({ data: [{ id: "1", login: "alpha" }, { id: "2", login: "beta" }] });
    if (url.includes("broadcaster_id=1")) return json({ total: 1234, data: [] });
    if (url.includes("broadcaster_id=2")) return json({ total: 99, data: [] });
    throw new Error(`unexpected ${url}`);
  };
  await saveConnection({ login: "me", userId: "9", refreshToken: "REFRESH-PLAINTEXT-1", accessToken: "ACCESS-PLAINTEXT-1", expiresIn: 3600 });
  const stored = await fs.readFile(DEV_FILE, "utf8");
  assert.ok(!stored.includes("PLAINTEXT"), "refresh token is not stored in plain text");

  const profile = {
    experience: {
      active: [{ name: "A", twitch: "alpha", followers: 5 }, { name: "N", twitch: "", followers: 7 }],
      past: [{ name: "B", twitch: "beta", followers: null }],
    },
  };
  const out = await withLiveFollowers(profile);
  assert.equal(out.experience.active[0].followers, 1234);
  assert.equal(out.experience.active[1].followers, 7);
  assert.equal(out.experience.past[0].followers, 99);
});
