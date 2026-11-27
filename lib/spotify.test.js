import { test } from "node:test";
import assert from "node:assert/strict";
import { toTrack, callbackUrl } from "./spotify.js";

test("toTrack keeps what the card needs and picks a small album picture", () => {
  const t = toTrack({
    name: "Song",
    artists: [{ name: "A" }, { name: "B" }],
    album: { name: "Album", images: [{ url: "big", width: 640 }, { url: "mid", width: 300 }, { url: "tiny", width: 64 }] },
    external_urls: { spotify: "https://open.spotify.com/track/x" },
    duration_ms: 1000,
  });
  assert.deepEqual(t, { title: "Song", artist: "A, B", album: "Album", art: "tiny", url: "https://open.spotify.com/track/x", durationMs: 1000 });
  assert.equal(toTrack(null), null);
});

test("callbackUrl uses https in production and 127.0.0.1 locally", () => {
  const req = (host) => ({ headers: new Headers({ host }) });
  assert.equal(callbackUrl(req("www.mattothemoon.xyz")), "https://www.mattothemoon.xyz/api/admin/spotify/callback");
  assert.equal(callbackUrl(req("localhost:3000")), "http://127.0.0.1:3000/api/admin/spotify/callback");
});
