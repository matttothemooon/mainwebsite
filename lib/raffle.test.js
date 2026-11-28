import { test } from "node:test";
import assert from "node:assert/strict";
import { cleanChannel, parseLine, toChatMessage, enters, pickWinner } from "./raffle.js";

const LINE =
  "@badge-info=subscriber/8;badges=subscriber/6,premium/1;color=#1E90FF;display-name=Some_Viewer;mod=0;subscriber=1;user-id=123;user-type= :some_viewer!some_viewer@some_viewer.tmi.twitch.tv PRIVMSG #chan :!enter please";

test("cleanChannel accepts names, @names and links", () => {
  assert.equal(cleanChannel("MattToTheMoon"), "matttothemoon");
  assert.equal(cleanChannel("@chubsc"), "chubsc");
  assert.equal(cleanChannel("https://www.twitch.tv/Sinnski/"), "sinnski");
  assert.equal(cleanChannel("not a channel!"), "");
});

test("reads a chat message with its badges", () => {
  const msg = toChatMessage(parseLine(LINE));
  assert.deepEqual(msg, {
    id: "123",
    login: "some_viewer",
    name: "Some_Viewer",
    color: "#1E90FF",
    text: "!enter please",
    sub: true,
    mod: false,
    vip: false,
    broadcaster: false,
  });
  assert.equal(toChatMessage(parseLine("PING :tmi.twitch.tv")), null);
  assert.equal(parseLine("PING :tmi.twitch.tv").command, "PING");
});

test("only the keyword as the first word enters", () => {
  const msg = toChatMessage(parseLine(LINE));
  assert.equal(enters(msg, { keyword: "!enter" }), true);
  assert.equal(enters(msg, { keyword: "!ENTER" }), true);
  assert.equal(enters({ ...msg, text: "i want to !enter" }, { keyword: "!enter" }), false);
  assert.equal(enters({ ...msg, text: "hello" }, { keyword: "" }), true);
  assert.equal(enters({ ...msg, sub: false }, { keyword: "!enter", subsOnly: true }), false);
  assert.equal(enters({ ...msg, mod: true }, { keyword: "!enter", excludeMods: true }), false);
  assert.equal(enters({ ...msg, broadcaster: true }, { keyword: "!enter" }), false);
});

test("pickWinner skips excluded people and weights subs", () => {
  const people = [{ id: "a", sub: false }, { id: "b", sub: true }];
  assert.equal(pickWinner(people, { exclude: new Set(["a"]) }).id, "b");
  assert.equal(pickWinner([], {}), null);
  // With 3x sub luck the weights are a:1, b:3, so 0.3 of the way lands on b.
  assert.equal(pickWinner(people, { subLuck: 3, random: () => 0.3 }).id, "b");
  assert.equal(pickWinner(people, { subLuck: 3, random: () => 0.2 }).id, "a");
});
