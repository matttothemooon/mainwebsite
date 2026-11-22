import assert from "node:assert/strict";
import test from "node:test";
import { variantsFor, regexFor } from "./variants.js";

test("makes number, spacing and look-alike variants", () => {
  const v = variantsFor("Scam");
  for (const expected of ["scam", "5cam", "$cam", "sc4m", "sc@m", "s c a m", "s.c.a.m", "ѕсаm"]) {
    assert.ok(v.includes(expected), `missing ${expected}`);
  }
  assert.equal(new Set(v).size, v.length, "no duplicates");
});

test("options switch variant kinds on and off, and the list is capped", () => {
  assert.deepEqual(variantsFor("scam", { leet: false, spacing: false, lookalike: false }), ["scam"]);
  assert.ok(variantsFor("scam", { leet: false, spacing: false, lookalike: false, doubled: true }).includes("scaam"));
  assert.ok(variantsFor("scam", { wildcard: true }).every((t) => t.startsWith("*") || t.includes(" ")));
  assert.ok(variantsFor("supercalifragilistic").length <= 60);
  assert.deepEqual(variantsFor("   "), []);
});

test("regex catches the tricks the list covers", () => {
  const re = new RegExp(regexFor("scam").replace("(?i)", ""), "iu");
  for (const s of ["scam", "SCAM", "sc4m", "$-c-4-m", "s.c.a.a.m", "ѕсаm", "this is a s c a m"]) assert.ok(re.test(s), s);
  assert.ok(!re.test("scan"));
  // Punctuation inside a word is treated as junk, so "k-pop" also catches "kpop".
  const kpop = new RegExp(regexFor("k-pop").replace("(?i)", ""), "iu");
  for (const s of ["kpop", "k-pop", "K POP"]) assert.ok(kpop.test(s), s);
  assert.equal(regexFor("$$$"), "(?i)[$][$][$]");
});

import { testMessage } from "./variants.js";

test("tester: word lists match whole words; wildcards and regex go further", () => {
  const terms = variantsFor("scam");
  const regexes = [{ word: "scam", pattern: regexFor("scam") }];
  const hit = testMessage("this is a sc4m lol", { terms, regexes });
  assert.ok(hit.caught);
  assert.ok(hit.byTerm.some((t) => t.term === "sc4m"));
  assert.deepEqual(hit.ranges, [[10, 14]]);
  // Mixed swaps aren't on the list, but the regex still catches them.
  const mixed = testMessage("this is a $c4m lol", { terms, regexes });
  assert.equal(mixed.byTerm.length, 0);
  assert.equal(mixed.byRegex.length, 1);

  // "scammer" isn't a whole-word hit for the list, but the regex catches it.
  const partial = testMessage("total scammer", { terms, regexes: [] });
  assert.equal(partial.caught, false);
  assert.ok(testMessage("total scammer", { terms: ["*scam*"] }).caught);
  assert.ok(testMessage("total s.c.a.a.m.m.e.r", { terms: [], regexes }).caught);

  assert.equal(testMessage("hello chat", { terms, regexes }).caught, false);
});
