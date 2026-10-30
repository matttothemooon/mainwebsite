import assert from "node:assert/strict";
import test from "node:test";

process.env.SESSION_SECRET = "test-secret";
process.env.DISCORD_ALLOWED_IDS = "111";
const { identityCookie, sessionCookie, getIdentity } = await import("./auth.js");

function req(...setCookies) {
  const jar = setCookies.map((c) => c.split(";")[0]).join("; ");
  return new Request("https://example.com/", { headers: { cookie: jar } });
}
const user = { id: "111", username: "matto", global_name: "Matto", avatar: "abc123" };
const base = new Request("https://example.com/");

test("identity is returned for a signed-in admin", () => {
  const r = req(sessionCookie(base, user), identityCookie(base, user));
  assert.deepEqual(getIdentity(r), { id: "111", name: "Matto", avatar: "abc123" });
});

test("no session means no identity, even with an identity cookie", () => {
  assert.equal(getIdentity(req(identityCookie(base, user))), null);
});

test("a tampered identity cookie is ignored, not trusted", () => {
  const good = identityCookie(base, user).replace("Max-Age", "x");
  const forged = good.replace(/=[^.;]+\./, "=" + Buffer.from('{"id":"111","name":"Evil"}').toString("base64url") + ".");
  const r = req(sessionCookie(base, user), forged);
  assert.deepEqual(getIdentity(r), { id: "111", name: "", avatar: "" });
});

test("identity for a different id than the session is ignored", () => {
  process.env.DISCORD_ALLOWED_IDS = "111,222";
  const other = { id: "222", username: "other", avatar: "" };
  const r = req(sessionCookie(base, user), identityCookie(base, other));
  assert.deepEqual(getIdentity(r), { id: "111", name: "", avatar: "" });
});

test("odd avatar hashes are dropped", () => {
  const r = req(sessionCookie(base, user), identityCookie(base, { ...user, avatar: "../x" }));
  assert.equal(getIdentity(r).avatar, "");
});
