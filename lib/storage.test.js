import assert from "node:assert/strict";
import test from "node:test";
import { validateProfile } from "./storage.js";

test("keeps safe Twitch and Discord URLs on experience entries", () => {
  const profile = validateProfile({
    links: [],
    experience: {
      active: [{
        name: "Community",
        url: "https://twitch.tv/community",
        discordUrl: "https://discord.gg/community",
      }],
      past: [],
    },
  });

  assert.equal(profile.experience.active[0].url, "https://twitch.tv/community");
  assert.equal(profile.experience.active[0].discordUrl, "https://discord.gg/community");
});

test("drops unsafe Discord URLs from experience entries", () => {
  const profile = validateProfile({
    links: [],
    experience: {
      active: [{ name: "Community", discordUrl: "javascript:alert(1)" }],
      past: [],
    },
  });

  assert.equal(profile.experience.active[0].discordUrl, "");
});
