import assert from "node:assert/strict";
import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { after, before, test } from "node:test";
import { normalizeSubgoalState } from "./subgoal-chat.js";
import {
  countSubscriptionEvent,
  fetchActiveSubscribers,
  normalizeSevenTvPaint,
  normalizeSubgoalChannel,
  registerSubgoalSubscriptions,
  readSubgoalState,
  readSubgoalStateByChannel,
  readSubgoalStateById,
  setSubgoalFromChat,
  subgoalClientId,
  subgoalClientSecret,
  twitchSubgoalConfigProblems,
  validateTwitchAccessToken,
  writeSubgoalState,
} from "./twitch-subgoal.js";

const originalCwd = process.cwd();
const originalFetch = globalThis.fetch;
const originalEnv = {
  TWITCH_CLIENT_ID: process.env.TWITCH_CLIENT_ID,
  TWITCH_CLIENT_SECRET: process.env.TWITCH_CLIENT_SECRET,
  TWITCH_CLIENT_ID2: process.env.TWITCH_CLIENT_ID2,
  TWITCH_CLIENT_SECRET2: process.env.TWITCH_CLIENT_SECRET2,
  SUBGOAL_ENCRYPTION_KEY: process.env.SUBGOAL_ENCRYPTION_KEY,
  VERCEL: process.env.VERCEL,
};
let tempDirectory;

before(async () => {
  tempDirectory = await fs.mkdtemp(path.join(os.tmpdir(), "twitch-subgoal-test-"));
  process.chdir(tempDirectory);
  process.env.TWITCH_CLIENT_ID = "test-client-id";
  process.env.TWITCH_CLIENT_SECRET = "test-client-secret";
  delete process.env.TWITCH_CLIENT_ID2;
  delete process.env.TWITCH_CLIENT_SECRET2;
  process.env.SUBGOAL_ENCRYPTION_KEY = "ab".repeat(32);
  delete process.env.VERCEL;
});

test("sub-goal uses suffixed Twitch credentials without changing unsuffixed credentials", () => {
  process.env.TWITCH_CLIENT_ID = "other-feature-client-id";
  process.env.TWITCH_CLIENT_SECRET = "other-feature-client-secret";
  process.env.TWITCH_CLIENT_ID2 = "subgoal-client-id";
  process.env.TWITCH_CLIENT_SECRET2 = "subgoal-client-secret";

  assert.equal(subgoalClientId(), "other-feature-client-id");
  assert.equal(subgoalClientSecret(), "other-feature-client-secret");
  assert.deepEqual(twitchSubgoalConfigProblems().filter((problem) => problem.includes("TWITCH_CLIENT")), []);

  delete process.env.TWITCH_CLIENT_ID;
  delete process.env.TWITCH_CLIENT_SECRET;
  assert.equal(subgoalClientId(), "subgoal-client-id");
  assert.equal(subgoalClientSecret(), "subgoal-client-secret");
  assert.deepEqual(twitchSubgoalConfigProblems().filter((problem) => problem.includes("TWITCH_CLIENT")), []);

  process.env.TWITCH_CLIENT_ID = "test-client-id";
  process.env.TWITCH_CLIENT_SECRET = "test-client-secret";
  delete process.env.TWITCH_CLIENT_ID2;
  delete process.env.TWITCH_CLIENT_SECRET2;
});

after(async () => {
  process.chdir(originalCwd);
  globalThis.fetch = originalFetch;
  for (const [name, value] of Object.entries(originalEnv)) {
    if (value === undefined) delete process.env[name];
    else process.env[name] = value;
  }
  await fs.rm(tempDirectory, { recursive: true, force: true });
});

test("stores Twitch credentials encrypted and reads them back", async () => {
  const state = {
    accessToken: "private-access-token",
    refreshToken: "private-refresh-token",
    expiresAt: Date.now() + 60_000,
    goal: 250,
  };
  await writeSubgoalState(state);

  const encrypted = await fs.readFile(".dev-subgoal.json", "utf8");
  assert.equal(encrypted.includes(state.accessToken), false);
  assert.equal(encrypted.includes(state.refreshToken), false);
  assert.deepEqual(await readSubgoalState(), state);
});

test("stores each streamer's credentials and counter under their own channel", async () => {
  const state = {
    broadcasterId: "123",
    login: "testchannel",
    accessToken: "channel-access-token",
    refreshToken: "channel-refresh-token",
    expiresAt: Date.now() + 60_000,
    count: 12,
    goal: 250,
  };
  const anotherStreamer = {
    broadcasterId: "456",
    login: "otherchannel",
    accessToken: "another-access-token",
    refreshToken: "another-refresh-token",
    expiresAt: Date.now() + 60_000,
    count: 3,
    goal: 50,
  };
  await writeSubgoalState(state);
  await writeSubgoalState(anotherStreamer);

  assert.deepEqual(await readSubgoalStateById("123"), state);
  assert.deepEqual(await readSubgoalStateByChannel("@TestChannel"), state);
  assert.deepEqual(await readSubgoalStateByChannel("otherchannel"), anotherStreamer);
  assert.deepEqual(await readSubgoalStateById("456"), anotherStreamer);
  assert.equal(await readSubgoalStateByChannel("unknownchannel"), null);
});

test("moderator chat commands update only the matching streamer's saved state", async () => {
  const state = await readSubgoalStateById("123");
  const command = {
    broadcaster_user_id: state.broadcasterId,
    badges: [{ set_id: "moderator" }],
    message: { text: "!subgoal 450" },
  };

  assert.equal(
    await setSubgoalFromChat({ ...command, broadcaster_user_id: "other-channel" }),
    false
  );
  assert.equal(await setSubgoalFromChat({ ...command, badges: [] }), false);
  assert.equal(await setSubgoalFromChat({ ...command, message: { text: "!subgoal 0" } }), false);
  assert.equal(await setSubgoalFromChat(command, "chat-1"), true);
  assert.equal((await readSubgoalStateByChannel("testchannel")).goal, 450);
  assert.equal(
    await setSubgoalFromChat(command, "chat-1"),
    false,
    "duplicate webhook deliveries should not apply the same command twice"
  );

  assert.equal(
    await setSubgoalFromChat(
      { ...command, message: { text: "!setsubs 25" } },
      "chat-2"
    ),
    true
  );
  assert.equal((await readSubgoalStateByChannel("testchannel")).count, 25);
  assert.equal(
    await setSubgoalFromChat(
      { ...command, message: { text: "!subs +" } },
      "chat-3"
    ),
    true
  );
  assert.equal((await readSubgoalStateByChannel("testchannel")).count, 26);
  assert.equal(
    await setSubgoalFromChat(
      { ...command, message: { text: "!resetsubs" } },
      "chat-4"
    ),
    true
  );
  assert.deepEqual(normalizeSubgoalState(await readSubgoalStateByChannel("testchannel")), {
    count: 0,
    goal: 450,
    showGoal: true,
    paintId: null,
  });
  assert.equal((await readSubgoalStateByChannel("otherchannel")).count, 3);
});

test("subscription, resubscription, and gift events increment the persistent count once", async () => {
  assert.equal(
    await countSubscriptionEvent(
      "channel.subscribe",
      { broadcaster_user_id: "123", is_gift: false },
      "sub-1"
    ),
    true
  );
  assert.equal(
    await countSubscriptionEvent(
      "channel.subscribe",
      { broadcaster_user_id: "123", is_gift: true },
      "sub-gifted"
    ),
    false,
    "gifted subscribe events are counted by the gift event"
  );
  assert.equal(
    await countSubscriptionEvent(
      "channel.subscription.message",
      { broadcaster_user_id: "123" },
      "resub-1"
    ),
    true
  );
  assert.equal(
    await countSubscriptionEvent(
      "channel.subscription.gift",
      { broadcaster_user_id: "123", total: 5 },
      "gift-1"
    ),
    true
  );
  assert.equal(
    await countSubscriptionEvent(
      "channel.subscription.gift",
      { broadcaster_user_id: "123", total: 5 },
      "gift-1"
    ),
    false
  );
  assert.equal((await readSubgoalStateByChannel("testchannel")).count, 7);
});

test("fetches and briefly caches the active subscriber total", async () => {
  let requests = 0;
  globalThis.fetch = async (url) => {
    requests += 1;
    assert.match(String(url), /helix\/subscriptions\?/);
    return Response.json({ total: 1234 });
  };

  const state = await readSubgoalState();
  assert.equal(await fetchActiveSubscribers(state), 1234);
  assert.equal(await fetchActiveSubscribers(state), 1234);
  assert.equal(requests, 1);
});

test("validates the requested Twitch scopes", async () => {
  globalThis.fetch = async () =>
    Response.json({ user_id: "123", scopes: ["channel:read:subscriptions", "user:read:chat"] });

  assert.equal((await validateTwitchAccessToken("token")).user_id, "123");
});

test("normalizes valid channel names for overlay URLs", () => {
  assert.equal(normalizeSubgoalChannel("feelssunnyman"), "feelssunnyman");
  assert.equal(normalizeSubgoalChannel("@Feelssunnyman"), "feelssunnyman");
  assert.equal(normalizeSubgoalChannel("bad/name"), null);
  assert.equal(normalizeSubgoalChannel("abc"), null);
});

test("converts 7TV paint layers to safe text paint styles", () => {
  const paint = normalizeSevenTvPaint({
    id: "01KH9GC158GSBAHYSQF2SQM8HT",
    name: "Test paint",
    data: {
      layers: [
        {
          opacity: 0.8,
          ty: {
            __typename: "PaintLayerTypeLinearGradient",
            angle: 45,
            repeating: false,
            stops: [
              { at: 0, color: { hex: "#ff0000" } },
              { at: 1, color: { hex: "#0000ff" } },
            ],
          },
        },
        {
          opacity: 1,
          ty: {
            __typename: "PaintLayerTypeImage",
            images: [
              {
                url: "https://cdn.7tv.app/paint/example.webp",
                scale: 1,
                frameCount: 10,
              },
            ],
          },
        },
        {
          opacity: 1,
          ty: {
            __typename: "PaintLayerTypeImage",
            images: [
              {
                url: "https://attacker.example/image.webp",
                scale: 1,
                frameCount: 1,
              },
            ],
          },
        },
      ],
      shadows: [{
        color: { hex: "#111111" },
        offsetX: 1,
        offsetY: 2,
        blur: 3,
      }],
    },
  });

  assert.deepEqual(paint, {
    id: "01KH9GC158GSBAHYSQF2SQM8HT",
    name: "Test paint",
    layers: [
      {
        opacity: 0.8,
        backgroundImage: "linear-gradient(45deg, #ff0000 0%, #0000ff 100%)",
      },
      {
        opacity: 1,
        backgroundImage: 'url("https://cdn.7tv.app/paint/example.webp")',
      },
    ],
    filter: "drop-shadow(#111111 1px 2px 3px)",
  });
  assert.equal(normalizeSevenTvPaint(null), null);
});

test("registers chat and subscription webhooks for each connected streamer", async () => {
  const requestedTypes = [];
  globalThis.fetch = async (url, options = {}) => {
    if (!options.method) return Response.json({ data: [] });
    const definition = JSON.parse(options.body);
    requestedTypes.push(definition.type);
    return new Response(null, { status: 202 });
  };

  await registerSubgoalSubscriptions(
    await readSubgoalStateById("123"),
    "https://example.com/webhook"
  );
  assert.deepEqual(requestedTypes, [
    "channel.chat.message",
    "channel.subscribe",
    "channel.subscription.message",
    "channel.subscription.gift",
  ]);
});
