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

test("fills in work and stats for older profiles", () => {
  const profile = validateProfile({ links: [], experience: { active: [], past: [] } });
  assert.equal(profile.work.services.length, 3);
  assert.equal(profile.stats.yearsModding, null);
});

test("cleans stats and work", () => {
  const profile = validateProfile({
    links: [],
    experience: { active: [], past: [] },
    stats: { yearsModding: "10" },
    work: { available: true, intro: "Hi", services: [{ title: "Mod", text: "x" }, { title: "" }] },
  });
  assert.equal(profile.stats.yearsModding, 10);
  assert.equal(profile.work.available, true);
  assert.deepEqual(profile.work.services, [{ title: "Mod", text: "x" }]);
});


test("email links aren't kept and aren't added back by the defaults", () => {
  const profile = validateProfile({
    links: [{ label: "email", url: "mailto:someone@example.com" }, { label: "twitch", url: "https://twitch.tv/x" }],
    experience: { active: [], past: [] },
  });
  assert.deepEqual(profile.links.map((l) => l.label), ["twitch"]);
});

test("mod server only accepts Discord invite links", () => {
  const base = { links: [], experience: { active: [], past: [] } };
  assert.equal(validateProfile({ ...base, modServer: "https://discord.gg/abc123" }).modServer, "https://discord.gg/abc123");
  assert.equal(validateProfile({ ...base, modServer: "https://evil.example/x" }).modServer, "");
  assert.equal(validateProfile(base).modServer, "");
});

test("settings files, bots & apps and FAQ are cleaned", () => {
  const base = { links: [], experience: { active: [], past: [] } };
  const fresh = validateProfile(base);
  assert.ok(fresh.downloads.length >= 2 && fresh.downloads.every((d) => d.file === null));
  assert.ok(fresh.recommendations.length > 0 && fresh.faq.length > 0);

  const p = validateProfile({
    ...base,
    downloads: [
      { id: "x", title: "Chatterino", steps: "one\r\ntwo", file: { id: "abcdefghij", name: "../settings.json", size: 10 } },
      { id: "y", title: "Bad file", file: { id: "../../etc", name: "x" } },
      { title: "" },
    ],
    recommendations: [{ name: "Bot", url: "javascript:alert(1)" }, { name: "" }],
    faq: [{ q: "Q?", a: "A" }, { q: "No answer", a: "" }],
  });
  assert.equal(p.downloads.length, 2);
  assert.equal(p.downloads[0].steps, "one\ntwo");
  assert.deepEqual(p.downloads[0].file, { id: "abcdefghij", name: "settings.json", size: 10 });
  assert.equal(p.downloads[1].file, null);
  assert.deepEqual(p.recommendations, [{ category: "Other", name: "Bot", note: "", url: "" }]);
  assert.deepEqual(p.faq, [{ q: "Q?", a: "A" }]);
});
