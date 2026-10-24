import assert from "node:assert/strict";
import test from "node:test";
import {
  applyModeratorCommand,
  isModerator,
  normalizeSubgoalState,
  normalizeTwitchChannel,
  parseIrcMessage,
  subscriptionCountFromNotice,
} from "./subgoal-chat.js";

test("normalizes channel names for overlay URLs", () => {
  assert.equal(normalizeTwitchChannel("@Feelssunnyman"), "feelssunnyman");
  assert.equal(normalizeTwitchChannel("bad/name"), null);
  assert.equal(normalizeTwitchChannel("abc"), null);
});

test("parses Twitch IRC tags, prefix, command, and trailing message", () => {
  const parsed = parseIrcMessage(
    "@badges=moderator/1;display-name=Mod\\sName;mod=1 :mod!mod@mod.tmi.twitch.tv PRIVMSG #channel :!subgoal 150"
  );
  assert.equal(parsed.command, "PRIVMSG");
  assert.equal(parsed.prefix, "mod!mod@mod.tmi.twitch.tv");
  assert.equal(parsed.params[0], "#channel");
  assert.equal(parsed.params[1], "!subgoal 150");
  assert.equal(parsed.tags["display-name"], "Mod Name");
});

test("counts single subscriptions and community gifts", () => {
  assert.equal(subscriptionCountFromNotice({ "msg-id": "sub" }), 1);
  assert.equal(subscriptionCountFromNotice({ "msg-id": "resub" }), 1);
  assert.equal(subscriptionCountFromNotice({ "msg-id": "subgift" }), 1);
  assert.equal(
    subscriptionCountFromNotice({
      "msg-id": "submysterygift",
      "msg-param-mass-gift-count": "5",
    }),
    5
  );
  assert.equal(subscriptionCountFromNotice({ "msg-id": "raid" }), 0);
});

test("only moderators and broadcasters can change the count or goal", () => {
  const original = { count: 5, goal: 100 };
  assert.equal(isModerator({ mod: "1" }), true);
  assert.equal(isModerator({ mod: true }), true);
  assert.equal(isModerator({ badges: "subscriber/1,broadcaster/1" }), true);
  assert.equal(isModerator({ badges: "subscriber/1" }), false);
  assert.equal(applyModeratorCommand(original, {}, "!subgoal 150"), null);

  assert.deepEqual(applyModeratorCommand(original, { mod: "1" }, "!subgoal 150"), {
    count: 5,
    goal: 150,
  });
  assert.deepEqual(applyModeratorCommand(original, { mod: "1" }, "!ic 150"), {
    count: 5,
    goal: 150,
  });
  assert.deepEqual(applyModeratorCommand(original, { mod: "1" }, "!setsubs 25"), {
    count: 25,
    goal: 100,
  });
  assert.deepEqual(applyModeratorCommand(original, { mod: "1" }, "!increment 12"), {
    count: 17,
    goal: 100,
  });
  assert.deepEqual(applyModeratorCommand(original, { mod: "1" }, "!remove"), {
    count: 4,
    goal: 100,
  });
  assert.deepEqual(applyModeratorCommand({ count: 0, goal: 100 }, { mod: "1" }, "!remove"), {
    count: 0,
    goal: 100,
  });
  assert.deepEqual(applyModeratorCommand(original, { mod: "1" }, "!subs +"), {
    count: 6,
    goal: 100,
  });
  assert.deepEqual(applyModeratorCommand({ count: 0, goal: 100 }, { mod: "1" }, "!subs -"), {
    count: 0,
    goal: 100,
  });
  assert.deepEqual(applyModeratorCommand(original, { mod: "1" }, "!resetsubs"), {
    count: 0,
    goal: 100,
  });
  assert.deepEqual(applyModeratorCommand(original, { mod: "1" }, "!hidegoal"), {
    count: 5,
    goal: 100,
    showGoal: false,
  });
  assert.deepEqual(applyModeratorCommand(original, { mod: "1" }, "!showgoal"), {
    count: 5,
    goal: 100,
    showGoal: true,
  });
  assert.deepEqual(
    applyModeratorCommand(original, { mod: "1" }, "!painturl https://7tv.app/paints/01KH9GC158GSBAHYSQF2SQM8HT"),
    { count: 5, goal: 100, paintId: "01KH9GC158GSBAHYSQF2SQM8HT" }
  );
  assert.deepEqual(applyModeratorCommand(original, { mod: "1" }, "!clearpaint"), {
    count: 5,
    goal: 100,
    paintId: null,
  });
});

test("rejects malformed commands and normalizes saved state", () => {
  assert.equal(applyModeratorCommand({ count: 0, goal: 100 }, { mod: "1" }, "!subgoal 0"), null);
  assert.equal(applyModeratorCommand({ count: 0, goal: 100 }, { mod: "1" }, "!setsubs -1"), null);
  assert.equal(applyModeratorCommand({ count: 0, goal: 100 }, { mod: "1" }, "!increment 0"), null);
  assert.equal(
    applyModeratorCommand({ count: 0, goal: 100 }, { mod: "1" }, "!painturl https://example.com/paints/01KH9GC158GSBAHYSQF2SQM8HT"),
    null
  );
  assert.equal(
    applyModeratorCommand({ count: 0, goal: 100 }, { mod: "1" }, "!painturl http://7tv.app/paints/01KH9GC158GSBAHYSQF2SQM8HT"),
    null
  );
  assert.equal(
    applyModeratorCommand({ count: 0, goal: 100 }, { mod: "1" }, "!painturl https://7tv.app/paints/01KH9GC158GSBAHYSQF2SQM8HT?redirect=evil"),
    null
  );
  assert.equal(
    applyModeratorCommand({ count: 0, goal: 100 }, { mod: "1" }, "!hidegoal extra"),
    null
  );
  assert.deepEqual(normalizeSubgoalState({ count: -1, goal: 0 }), {
    count: 0,
    goal: 100,
    showGoal: true,
    paintId: null,
  });
  assert.deepEqual(normalizeSubgoalState({
    count: 25,
    goal: 200,
    showGoal: false,
    paintId: "01KH9GC158GSBAHYSQF2SQM8HT",
  }), {
    count: 25,
    goal: 200,
    showGoal: false,
    paintId: "01KH9GC158GSBAHYSQF2SQM8HT",
  });
});
