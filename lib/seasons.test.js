import assert from "node:assert/strict";
import test from "node:test";
import { pickSeason, parseMonthDay } from "./seasons.js";

const on = (iso) => new Date(`${iso}T12:00:00Z`);

test("automatic seasons by date", () => {
  assert.equal(pickSeason(on("2026-10-25")).season, "halloween");
  assert.equal(pickSeason(on("2026-11-02")).season, null);
  assert.equal(pickSeason(on("2026-12-24")).season, "holidays");
  assert.equal(pickSeason(on("2027-01-01")).season, "holidays");
  assert.equal(pickSeason(on("2027-01-02")).season, null);
  assert.equal(pickSeason(on("2027-02-14")).season, "valentine");
  assert.equal(pickSeason(on("2026-06-01")).season, null);
});

test("anniversary wins on its day and counts years", () => {
  const s = { anniversary: "10-25", since: 2019 };
  assert.deepEqual(pickSeason(on("2026-10-25"), s), { season: "anniversary", years: 7 });
  assert.equal(pickSeason(on("2026-10-26"), s).season, "halloween");
});

test("off and forced modes", () => {
  assert.equal(pickSeason(on("2026-12-24"), { mode: "off" }).season, null);
  assert.equal(pickSeason(on("2026-06-01"), { mode: "valentine" }).season, "valentine");
  assert.equal(pickSeason(on("2026-06-01"), { mode: "nonsense" }).season, null);
});

test("anniversary date parsing", () => {
  assert.equal(parseMonthDay("03-07"), 307);
  assert.equal(parseMonthDay("13-01"), null);
  assert.equal(parseMonthDay("3-7"), null);
});
