// lib/raffle.js
// Pieces of the Twitch chat raffle (/raffle) that don't need a browser:
// reading Twitch's chat protocol, who may enter, and picking a winner.

export const CHAT_URL = "wss://irc-ws.chat.twitch.tv:443";

// Twitch channel names: 4–25 letters, digits or underscores. Accepts a pasted
// twitch.tv link or @name too.
export function cleanChannel(raw) {
  const s = String(raw || "").trim().toLowerCase();
  const m = s.match(/(?:twitch\.tv\/)?@?([a-z0-9_]{3,25})\/?$/);
  return m ? m[1] : "";
}

const unescapeTag = (v) =>
  v.replace(/\\(.)/g, (_, c) => ({ s: " ", ":": ";", r: "\r", n: "\n", "\\": "\\" })[c] ?? c);

// One line of Twitch chat (IRC with tags) -> { tags, prefix, command, params }.
export function parseLine(line) {
  let rest = line;
  const tags = {};
  if (rest.startsWith("@")) {
    const space = rest.indexOf(" ");
    for (const pair of rest.slice(1, space).split(";")) {
      const eq = pair.indexOf("=");
      tags[eq === -1 ? pair : pair.slice(0, eq)] = eq === -1 ? "" : unescapeTag(pair.slice(eq + 1));
    }
    rest = rest.slice(space + 1);
  }
  let prefix = "";
  if (rest.startsWith(":")) {
    const space = rest.indexOf(" ");
    prefix = rest.slice(1, space);
    rest = rest.slice(space + 1);
  }
  const trailingAt = rest.indexOf(" :");
  const head = trailingAt === -1 ? rest : rest.slice(0, trailingAt);
  const params = head.split(" ").filter(Boolean);
  const command = params.shift() || "";
  if (trailingAt !== -1) params.push(rest.slice(trailingAt + 2));
  return { tags, prefix, command, params };
}

// A chat message -> { id, login, name, color, text, sub, mod, vip, broadcaster },
// or null for anything that isn't one.
export function toChatMessage(parsed) {
  if (parsed.command !== "PRIVMSG") return null;
  const t = parsed.tags;
  const login = parsed.prefix.split("!")[0];
  const badges = (t.badges || "").split(",").map((b) => b.split("/")[0]);
  let text = parsed.params[1] || "";
  // "/me" messages arrive wrapped as \x01ACTION ...\x01.
  const action = text.match(/^\u0001ACTION (.*)\u0001$/);
  if (action) text = action[1];
  return {
    id: t["user-id"] || login,
    login,
    name: t["display-name"] || login,
    color: t.color || "",
    text,
    sub: badges.includes("subscriber") || badges.includes("founder") || t.subscriber === "1",
    mod: badges.includes("moderator") || t.mod === "1",
    vip: badges.includes("vip"),
    broadcaster: badges.includes("broadcaster"),
  };
}

// Whether a message enters the raffle. An empty keyword means any message counts.
export function enters(msg, { keyword = "", subsOnly = false, excludeMods = false } = {}) {
  if (!msg) return false;
  const k = keyword.trim().toLowerCase();
  if (k && msg.text.trim().toLowerCase().split(/\s+/)[0] !== k) return false;
  if (subsOnly && !msg.sub) return false;
  if (msg.broadcaster) return false;
  if (excludeMods && msg.mod) return false;
  return true;
}

// A fair random pick, weighting subscribers by `subLuck` (1 = same as everyone).
export function pickWinner(entrants, { subLuck = 1, exclude = new Set(), random = cryptoRandom } = {}) {
  const pool = entrants.filter((e) => !exclude.has(e.id));
  if (!pool.length) return null;
  const weight = (e) => (e.sub ? Math.max(1, subLuck) : 1);
  const total = pool.reduce((sum, e) => sum + weight(e), 0);
  let r = random() * total;
  for (const e of pool) {
    r -= weight(e);
    if (r < 0) return e;
  }
  return pool[pool.length - 1];
}

function cryptoRandom() {
  const a = new Uint32Array(1);
  globalThis.crypto.getRandomValues(a);
  return a[0] / 2 ** 32;
}
