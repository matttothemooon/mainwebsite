import assert from "node:assert/strict";
import test from "node:test";

delete process.env.UPSTASH_REDIS_REST_URL;
delete process.env.KV_REST_API_URL;
delete process.env.VERCEL;
const v = await import("./views.js");

test("only counts the site's own pages; pastes are grouped", () => {
  assert.equal(v.normalizePath("/"), "/");
  assert.equal(v.normalizePath("/work/?x=1"), "/work");
  assert.equal(v.normalizePath("/pages/mod-resources"), "/pages/mod-resources");
  assert.equal(v.normalizePath("/haste/abc234"), "/haste/*");
  assert.equal(v.normalizePath("/admin"), null);
  assert.equal(v.normalizePath("/api/hit"), null);
  assert.equal(v.normalizePath("/pages/<script>"), null);
});

test("bots, previews and empty user agents are skipped", () => {
  assert.ok(v.isBot("Mozilla/5.0 (compatible; Discordbot/2.0)"));
  assert.ok(v.isBot("Twitterbot/1.0"));
  assert.ok(v.isBot(""));
  assert.ok(!v.isBot("Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X) AppleWebKit/605.1.15 Safari/604.1"));
});

test("referrer: other sites only, without www", () => {
  assert.equal(v.referrerHost("https://www.twitch.tv/mattothemoon", "www.mattothemoon.xyz"), "twitch.tv");
  assert.equal(v.referrerHost("https://www.mattothemoon.xyz/pages", "www.mattothemoon.xyz"), null);
  assert.equal(v.referrerHost("", "x"), null);
});

test("visitor hash changes daily", () => {
  assert.equal(v.visitorHash("1.2.3.4", "ua", "2026-11-01"), v.visitorHash("1.2.3.4", "ua", "2026-11-01"));
  assert.notEqual(v.visitorHash("1.2.3.4", "ua", "2026-11-01"), v.visitorHash("1.2.3.4", "ua", "2026-11-02"));
});

test("records views and reports totals, uniques, pages and referrers", async () => {
  const today = v.day();
  await v.recordView({ path: "/", referrer: "twitch.tv", visitor: "a", date: today });
  await v.recordView({ path: "/", referrer: null, visitor: "a", date: today });
  await v.recordView({ path: "/work", referrer: "x.com", visitor: "b", date: today });
  const s = await v.viewStats({ days: 7 });
  assert.equal(s.views.today, 3);
  assert.equal(s.views.allTime, 3);
  assert.equal(s.visitors.today, 2);
  assert.deepEqual(s.topPages[0], { name: "/", count: 2 });
  assert.deepEqual(s.topReferrers.map((r) => r.name).sort(), ["twitch.tv", "x.com"]);
  assert.equal(await v.totalViews(), 3);
});
