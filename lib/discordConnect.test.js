import assert from "node:assert/strict";
import { test, after } from "node:test";
import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";

process.env.SESSION_SECRET = "test-secret";
process.env.DISCORD_CLIENT_ID = "123456789012345678";
process.env.DISCORD_CLIENT_SECRET = "s";
delete process.env.GITHUB_TOKEN;
// Local file mode writes .dev-*.json into the working directory; use a
// throwaway one so tests can't clash with each other or a running dev server.
const workDir = await fs.mkdtemp(path.join(os.tmpdir(), "discord-test-"));
process.chdir(workDir);

const DEV_FILE = ".dev-discord-connection.json";
const m = await import("./discordConnect.js");
after(() => fs.rm(workDir, { recursive: true, force: true }));

test("staffRole: owner, admin, manager, mod or nothing", () => {
  assert.equal(m.staffRole({ owner: true, permissions: "0" }), "owner");
  assert.equal(m.staffRole({ permissions: String(1n << 3n) }), "admin");
  assert.equal(m.staffRole({ permissions: String(1n << 5n) }), "manager");
  assert.equal(m.staffRole({ permissions: String(1n << 40n) }), "mod");
  assert.equal(m.staffRole({ permissions: String((1n << 10n) | (1n << 11n)) }), null); // view + send only
});

let tokenCalls = [];
globalThis.fetch = async (url, init) => {
  url = String(url);
  const json = (b, s = 200) => new Response(JSON.stringify(b), { status: s });
  if (url.endsWith("/oauth2/token")) {
    const body = String(init.body);
    tokenCalls.push(body);
    if (body.includes("grant_type=authorization_code")) return json({ access_token: "a1", refresh_token: "r1", expires_in: 604800, scope: "identify guilds" });
    if (body.includes("refresh_token=r1")) return json({ access_token: "a2", refresh_token: "r2", expires_in: 604800, scope: "identify guilds" });
    return json({ error: "invalid_grant" }, 400);
  }
  if (url.endsWith("/users/@me")) return json({ id: "436300903927119873", username: "matt" });
  if (url.includes("/users/@me/guilds")) {
    return json([
      { id: "111111", name: "Big", icon: null, owner: false, permissions: String(1n << 3n), approximate_member_count: 5000, approximate_presence_count: 900 },
      { id: "222222", name: "Mine", icon: "abc", owner: true, permissions: "0", approximate_member_count: 40, approximate_presence_count: 5 },
      { id: "333333", name: "Just a member", icon: null, owner: false, permissions: "3072", approximate_member_count: 99999 },
    ]);
  }
  throw new Error(`unexpected ${url}`);
};

test("rejects an account that isn't allowed, without saving it", async () => {
  await assert.rejects(m.connectWithCode("c", "https://x/api/auth/callback", { isAllowed: () => false }));
  assert.equal(await m.getConnection({ fresh: true }), null);
});

test("connects, lists staff servers only, respects hidden ones", async () => {
  await m.connectWithCode("c", "https://x/api/auth/callback", { isAllowed: () => true });
  const stored = await fs.readFile(DEV_FILE, "utf8");
  assert.ok(!stored.includes("r1") && !stored.includes("a1"), "tokens are not stored in plain text");

  const servers = await m.getStaffServers();
  assert.deepEqual(servers.map((s) => [s.name, s.role]), [["Big", "admin"], ["Mine", "owner"]]);
  const shown = await m.shownServers({ discord: { hidden: ["222222"] } });
  assert.deepEqual(shown.map((s) => s.name), ["Big"]);
});

test("refreshes an expired token and saves the rotated one", async () => {
  // Expire the stored access token.
  const conn = await m.getConnection({ fresh: true });
  const { seal } = await import("./seal.js");
  const saved = JSON.parse(await fs.readFile(DEV_FILE, "utf8"));
  saved.tokens = seal(JSON.stringify({ accessToken: conn.accessToken, refreshToken: conn.refreshToken, expiresAt: Date.now() - 1 }), "discord-connection");
  await fs.writeFile(DEV_FILE, JSON.stringify(saved));
  await m.getConnection({ fresh: true });

  tokenCalls = [];
  const before = await m.getConnection({ fresh: true });
  assert.ok(before.expiresAt < Date.now());
  // The server list is cached from the previous test; a fresh module instance
  // has no cache, so it has to use (and refresh) the stored token.
  const fresh = await import(`./discordConnect.js?refresh=${Date.now()}`);
  const servers = await fresh.getStaffServers();
  assert.equal(servers.length, 2);
  assert.ok(tokenCalls.some((b) => b.includes("refresh_token=r1")), "refreshed with the stored token");
  const afterConn = await fresh.getConnection({ fresh: true });
  assert.equal(afterConn.refreshToken, "r2", "rotated refresh token saved");
  assert.ok(afterConn.expiresAt > Date.now());
});
