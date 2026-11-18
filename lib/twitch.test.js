import { test, beforeEach } from "node:test";
import assert from "node:assert/strict";

process.env.TWITCH_CLIENT_ID = "id";
process.env.TWITCH_CLIENT_SECRET = "secret";
const { getLiveStatus, profileLogins } = await import("./twitch.js");

let calls;
let failStreams;
beforeEach(() => {
  calls = [];
  failStreams = false;
  globalThis.fetch = async (url) => {
    url = String(url);
    calls.push(url);
    const json = (body, status = 200) => new Response(JSON.stringify(body), { status });
    if (url.startsWith("https://id.twitch.tv")) return json({ access_token: "t", expires_in: 3600 });
    if (url.includes("/helix/users")) {
      return json({ data: [
        { login: "alpha", profile_image_url: "https://img/alpha.png" },
        { login: "beta", profile_image_url: "https://img/beta.png" },
      ] });
    }
    if (url.includes("/helix/streams")) {
      if (failStreams) return json({}, 500);
      return json({ data: [{ user_login: "beta", type: "live", title: "hi", game_name: "Just Chatting", viewer_count: 1234 }] });
    }
    throw new Error(`unexpected ${url}`);
  };
});

test("profileLogins collects active and past twitch names", () => {
  const logins = profileLogins({ experience: { active: [{ twitch: "a" }, { twitch: "" }], past: [{ twitch: "b" }] } });
  assert.deepEqual(logins, ["a", "b"]);
});

test("reports avatars and who is live, then serves from cache", async () => {
  const first = await getLiveStatus(["Beta", "alpha", "al pha!"]);
  assert.equal(first.alpha.live, false);
  assert.equal(first.alpha.avatar, "https://img/alpha.png");
  assert.equal(first.beta.live, true);
  assert.equal(first.beta.viewers, 1234);
  assert.equal(first.beta.game, "Just Chatting");

  const helixCalls = calls.filter((u) => u.includes("/helix/")).length;
  await getLiveStatus(["alpha", "beta"]);
  assert.equal(calls.filter((u) => u.includes("/helix/")).length, helixCalls, "second call is cached");
});

test("returns null instead of throwing when Twitch fails", async () => {
  failStreams = true;
  const result = await getLiveStatus(["gamma"]);
  assert.equal(result, null);
});
