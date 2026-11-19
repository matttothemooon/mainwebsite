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

test("fills in work, stats and testimonials for older profiles", () => {
  const profile = validateProfile({ links: [], experience: { active: [], past: [] } });
  assert.equal(profile.work.services.length, 3);
  assert.equal(profile.stats.yearsModding, null);
  assert.deepEqual(profile.testimonials, []);
});

test("cleans testimonials and drops ones without a quote or name", () => {
  const profile = validateProfile({
    links: [],
    experience: { active: [], past: [] },
    stats: { yearsModding: "10" },
    testimonials: [
      { quote: "Best mod.", name: "Someone", url: "javascript:alert(1)", twitch: "https://twitch.tv/Someone" },
      { quote: "", name: "Nobody" },
    ],
    work: { available: true, intro: "Hi", services: [{ title: "Mod", text: "x" }, { title: "" }] },
  });
  assert.equal(profile.stats.yearsModding, 10);
  assert.equal(profile.testimonials.length, 1);
  assert.equal(profile.testimonials[0].url, "");
  assert.equal(profile.testimonials[0].twitch, "someone");
  assert.equal(profile.work.available, true);
  assert.deepEqual(profile.work.services, [{ title: "Mod", text: "x" }]);
});
