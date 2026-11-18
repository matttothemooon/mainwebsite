import assert from "node:assert/strict";
import test from "node:test";
import { resolveIcon } from "./icons.js";

test("recognizes supported brands on subdomains", () => {
  assert.equal(resolveIcon({ url: "https://m.youtube.com/@creator" }).type, "path");
  assert.equal(resolveIcon({ url: "https://www.pinterest.com/creator" }).type, "path");
});

test("matches a supported brand inside a descriptive label", () => {
  assert.equal(resolveIcon({ label: "My Medium profile", url: "/writing" }).type, "path");
});

test("uses a website favicon when the URL has no built-in brand icon", () => {
  const icon = resolveIcon({ url: "https://example.com/profile" });
  assert.equal(icon.type, "image");
  assert.equal(icon.favicon, true);
  assert.match(icon.src, /google\.com\/s2\/favicons/);
});

test("does not mistake relative or non-web URLs for sites with favicons", () => {
  assert.equal(resolveIcon({ url: "/my-page" }).type, "path");
  assert.equal(resolveIcon({ url: "ftp://example.com/file" }).type, "path");
});

test("custom icons and email retain precedence", () => {
  assert.deepEqual(
    resolveIcon({ url: "https://github.com/user", iconUrl: "https://cdn.example/icon.png" }),
    { type: "image", src: "https://cdn.example/icon.png", title: "link" },
  );
  assert.equal(resolveIcon({ url: "mailto:hello@example.com" }).type, "path");
});

test("stats.fm gets a built-in glyph instead of a favicon", () => {
  const icon = resolveIcon({ label: "statsfm", url: "https://stats.fm/someone" });
  assert.equal(icon.type, "path");
});

test("a Discord profile link looks different from a Discord invite", () => {
  const profile = resolveIcon({ label: "discord profile", url: "https://discord.com/users/123" });
  const invite = resolveIcon({ label: "discord", url: "https://discord.gg/abc" });
  assert.equal(profile.type, "path");
  assert.notEqual(profile.path, invite.path);
});
