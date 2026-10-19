export function normalizeTwitchChannel(value) {
  if (typeof value !== "string") return null;
  const channel = value.trim().replace(/^@/, "").toLowerCase();
  return /^[a-z0-9_]{4,25}$/.test(channel) ? channel : null;
}

function unescapeTag(value) {
  return value.replace(/\\([snr:\\])/g, (_, character) => {
    if (character === "s") return " ";
    if (character === "n") return "\n";
    if (character === "r") return "\r";
    return character;
  });
}

export function parseIrcMessage(line) {
  let remaining = line;
  const tags = {};
  let prefix = "";

  if (remaining.startsWith("@")) {
    const end = remaining.indexOf(" ");
    if (end === -1) return null;
    for (const pair of remaining.slice(1, end).split(";")) {
      const separator = pair.indexOf("=");
      const key = separator === -1 ? pair : pair.slice(0, separator);
      tags[key] = separator === -1 ? "" : unescapeTag(pair.slice(separator + 1));
    }
    remaining = remaining.slice(end + 1);
  }

  if (remaining.startsWith(":")) {
    const end = remaining.indexOf(" ");
    if (end === -1) return null;
    prefix = remaining.slice(1, end);
    remaining = remaining.slice(end + 1);
  }

  const separator = remaining.indexOf(" ");
  const command = separator === -1 ? remaining : remaining.slice(0, separator);
  remaining = separator === -1 ? "" : remaining.slice(separator + 1);

  const params = [];
  while (remaining) {
    if (remaining.startsWith(":")) {
      params.push(remaining.slice(1));
      break;
    }
    const space = remaining.indexOf(" ");
    if (space === -1) {
      params.push(remaining);
      break;
    }
    params.push(remaining.slice(0, space));
    remaining = remaining.slice(space + 1).trimStart();
  }

  return { tags, prefix, command, params };
}

export function subscriptionCountFromNotice(tags) {
  const notice = tags["msg-id"];
  if (["sub", "resub", "subgift", "anonsubgift"].includes(notice)) return 1;

  if (["submysterygift", "anonsubmysterygift"].includes(notice)) {
    const count = Number(tags["msg-param-mass-gift-count"]);
    return Number.isSafeInteger(count) && count > 0 ? count : 1;
  }

  return 0;
}

export function isModerator(tags) {
  if (tags.mod === "1" || tags.mod === true) return true;
  return String(tags.badges || "")
    .split(",")
    .some((badge) => ["moderator", "broadcaster"].includes(badge.split("/")[0]));
}

function parseSafeInteger(value, minimum) {
  if (!/^\d+$/.test(value)) return null;
  const number = Number(value);
  return Number.isSafeInteger(number) && number >= minimum ? number : null;
}

function paintIdFromUrl(value) {
  if (typeof value !== "string" || value.length > 2048) return null;
  try {
    const url = new URL(value);
    if (
      url.protocol !== "https:" ||
      !["7tv.app", "www.7tv.app"].includes(url.hostname) ||
      url.search ||
      url.hash ||
      url.username ||
      url.password
    ) return null;
    const match = url.pathname.match(/^\/paints\/([0-9A-HJKMNPQRSTVWXYZ]{26})\/?$/i);
    return match ? match[1].toUpperCase() : null;
  } catch {
    return null;
  }
}

export function applyModeratorCommand(state, tags, message) {
  if (!isModerator(tags)) return null;

  const parts = message.trim().split(/\s+/);
  const [rawCommand, argument, ...extra] = parts;
  if (!rawCommand) return null;
  const command = rawCommand.toLowerCase();

  if (command === "!subgoal" || command === "!ic") {
    if (extra.length) return null;
    const goal = parseSafeInteger(argument || "", 1);
    return goal === null ? null : { ...state, goal };
  }

  if (command === "!setsubs") {
    if (extra.length) return null;
    const count = parseSafeInteger(argument || "", 0);
    return count === null ? null : { ...state, count };
  }

  if (command === "!increment") {
    if (extra.length) return null;
    const increment = parseSafeInteger(argument || "", 1);
    const count = state.count + increment;
    return increment === null || !Number.isSafeInteger(count)
      ? null
      : { ...state, count };
  }

  if (command === "!remove" && argument === undefined) {
    return { ...state, count: Math.max(0, state.count - 1) };
  }

  if (command === "!subs") {
    if (extra.length) return null;
    if (argument === "+") return { ...state, count: state.count + 1 };
    if (argument === "-") return { ...state, count: Math.max(0, state.count - 1) };
    return null;
  }

  if (command === "!resetsubs" && argument === undefined) {
    return { ...state, count: 0 };
  }

  if (command === "!hidegoal" && argument === undefined) {
    return { ...state, showGoal: false };
  }

  if (command === "!showgoal" && argument === undefined) {
    return { ...state, showGoal: true };
  }

  if (command === "!painturl") {
    if (extra.length) return null;
    const paintId = paintIdFromUrl(argument);
    return paintId ? { ...state, paintId } : null;
  }

  if (command === "!clearpaint" && argument === undefined) {
    return { ...state, paintId: null };
  }

  return null;
}

export function normalizeSubgoalState(value) {
  const count = Number(value?.count);
  const goal = Number(value?.goal);
  return {
    count: Number.isSafeInteger(count) && count >= 0 ? count : 0,
    goal: Number.isSafeInteger(goal) && goal > 0 ? goal : 100,
    showGoal: value?.showGoal !== false,
    paintId: typeof value?.paintId === "string" &&
      /^[0-9A-HJKMNPQRSTVWXYZ]{26}$/i.test(value.paintId)
      ? value.paintId.toUpperCase()
      : null,
  };
}
