import { test } from "node:test";
import assert from "node:assert/strict";
import { stripSecrets } from "./files.js";

test("stripSecrets removes Chatterino accounts and any token-like keys", () => {
  const settings = {
    accounts: { uid123: { username: "matt", oauthToken: "abc", clientID: "x" }, current: "matt" },
    appearance: { theme: "dark" },
    nested: [{ apiToken: "t", keep: 1 }],
  };
  const { bytes, removed } = stripSecrets(Buffer.from(JSON.stringify(settings)));
  const out = JSON.parse(bytes.toString());
  assert.equal(removed, 2);
  assert.deepEqual(out, { appearance: { theme: "dark" }, nested: [{ keep: 1 }] });
  assert.ok(!bytes.toString().includes("abc"));
});

test("stripSecrets leaves other files alone", () => {
  const raw = Buffer.from("not json, token=abc");
  assert.equal(stripSecrets(raw).removed, 0);
  assert.equal(stripSecrets(raw).bytes.toString(), "not json, token=abc");
  const clean = Buffer.from('{"a":1}');
  assert.equal(stripSecrets(clean).bytes.toString(), '{"a":1}');
});
