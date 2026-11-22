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
  assert.match(regexFor("a-b"), /\\-/);
});
