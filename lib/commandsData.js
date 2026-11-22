// Commands for the cheat sheet (/commands).
// Fossabot and Nightbot entries follow their official docs (fossabot.com/docs,
// docs.nightbot.tv). Twitch entries are Twitch's own chat commands; Twitch's
// "Chat Commands" help article is the full, current reference.

export const SOURCES = {
  twitch: { label: "Twitch", url: "https://help.twitch.tv/s/article/chat-commands" },
  fossabot: { label: "Fossabot", url: "https://fossabot.com/docs" },
  nightbot: { label: "Nightbot", url: "https://docs.nightbot.tv/commands/commandlist" },
};

export const GROUPS = ["Users", "Chat modes", "Stream", "Bot commands", "Info"];

// tool, group, usage (what you type), what it does, who can use it.
export const COMMANDS = [
  // ---- Twitch: users
  { tool: "twitch", group: "Users", usage: "/timeout username 600 reason", what: "Time a user out for a number of seconds (here 10 minutes), with an optional reason.", who: "Mods" },
  { tool: "twitch", group: "Users", usage: "/untimeout username", what: "End a user's timeout early.", who: "Mods" },
  { tool: "twitch", group: "Users", usage: "/ban username reason", what: "Permanently ban a user from chat, with an optional reason.", who: "Mods" },
  { tool: "twitch", group: "Users", usage: "/unban username", what: "Lift a ban.", who: "Mods" },
  { tool: "twitch", group: "Users", usage: "/warn username reason", what: "Send a warning the user must acknowledge before they can chat again.", who: "Mods" },
  { tool: "twitch", group: "Users", usage: "/user username", what: "Open the user's card: account age, follow date, past messages and mod notes.", who: "Everyone" },
  { tool: "twitch", group: "Users", usage: "/mod username", what: "Make someone a moderator.", who: "Broadcaster" },
  { tool: "twitch", group: "Users", usage: "/unmod username", what: "Remove someone's moderator role.", who: "Broadcaster" },
  { tool: "twitch", group: "Users", usage: "/vip username", what: "Give someone VIP.", who: "Broadcaster" },
  { tool: "twitch", group: "Users", usage: "/unvip username", what: "Remove someone's VIP.", who: "Broadcaster" },
  { tool: "twitch", group: "Users", usage: "/mods", what: "List the channel's moderators.", who: "Everyone" },
  { tool: "twitch", group: "Users", usage: "/vips", what: "List the channel's VIPs.", who: "Everyone" },

  // ---- Twitch: chat modes
  { tool: "twitch", group: "Chat modes", usage: "/slow 30", what: "Slow mode: each chatter can send one message every 30 seconds.", who: "Mods" },
  { tool: "twitch", group: "Chat modes", usage: "/slowoff", what: "Turn slow mode off.", who: "Mods" },
  { tool: "twitch", group: "Chat modes", usage: "/followers 10m", what: "Followers-only chat: only people who've followed for at least 10 minutes can chat.", who: "Mods" },
  { tool: "twitch", group: "Chat modes", usage: "/followersoff", what: "Turn followers-only chat off.", who: "Mods" },
  { tool: "twitch", group: "Chat modes", usage: "/subscribers", what: "Subscribers-only chat.", who: "Mods" },
  { tool: "twitch", group: "Chat modes", usage: "/subscribersoff", what: "Turn subscribers-only chat off.", who: "Mods" },
  { tool: "twitch", group: "Chat modes", usage: "/emoteonly", what: "Emote-only chat.", who: "Mods" },
  { tool: "twitch", group: "Chat modes", usage: "/emoteonlyoff", what: "Turn emote-only chat off.", who: "Mods" },
  { tool: "twitch", group: "Chat modes", usage: "/uniquechat", what: "Block messages that repeat the chatter's previous message (stops copy-paste spam).", who: "Mods" },
  { tool: "twitch", group: "Chat modes", usage: "/uniquechatoff", what: "Turn unique-chat mode off.", who: "Mods" },
  { tool: "twitch", group: "Chat modes", usage: "/shield", what: "Shield Mode: switch on the channel's preset anti-raid settings in one go.", who: "Mods" },
  { tool: "twitch", group: "Chat modes", usage: "/shieldoff", what: "Turn Shield Mode off.", who: "Mods" },
  { tool: "twitch", group: "Chat modes", usage: "/clear", what: "Clear the chat history for everyone.", who: "Mods" },

  // ---- Twitch: stream
  { tool: "twitch", group: "Stream", usage: "/announce message", what: "Post a highlighted announcement in chat.", who: "Mods" },
  { tool: "twitch", group: "Stream", usage: "/shoutout username", what: "Shout out another streamer with a follow button in chat.", who: "Mods" },
  { tool: "twitch", group: "Stream", usage: "/raid channel", what: "Start a raid to another channel.", who: "Broadcaster & editors" },
  { tool: "twitch", group: "Stream", usage: "/unraid", what: "Cancel a raid that hasn't gone yet.", who: "Broadcaster & editors" },
  { tool: "twitch", group: "Stream", usage: "/marker description", what: "Add a stream marker at this moment, to find it in the VOD later.", who: "Broadcaster & editors" },
  { tool: "twitch", group: "Stream", usage: "/commercial 60", what: "Run an ad break of the given length in seconds.", who: "Broadcaster & editors" },

  // ---- Fossabot
  { tool: "fossabot", group: "Users", usage: "!nuke phrase 3m 10m", what: "Time out everyone who said the phrase in the last 3 minutes, for 10 minutes. Use delete or ban instead of a duration to delete messages or ban.", who: "Mods" },
  { tool: "fossabot", group: "Users", usage: "!nuke /regex/ 2m ban", what: "Same, matching a regular expression (RE2) instead of a phrase.", who: "Mods" },
  { tool: "fossabot", group: "Users", usage: "!nuke phrase -r=5m 3m 10m", what: "Nuke with radiation: keep punishing new messages with the phrase for the next 5 minutes too.", who: "Mods" },
  { tool: "fossabot", group: "Users", usage: "!permit username 120", what: "Stop Fossabot's filters timing a user out for a while (default 60 seconds, up to 3600).", who: "Mods" },
  { tool: "fossabot", group: "Users", usage: "!votekick username", what: "Start a chat poll to remove a user.", who: "Everyone" },
  { tool: "fossabot", group: "Users", usage: "!vanish", what: "Time yourself out for 5 seconds (clears your messages).", who: "Everyone" },
  { tool: "fossabot", group: "Bot commands", usage: "!addcmd name response", what: "Create a custom command. Flags like --disable or -g <seconds> (cooldown) are optional.", who: "Mods" },
  { tool: "fossabot", group: "Bot commands", usage: "!editcmd name new response", what: "Change a custom command's response.", who: "Mods" },
  { tool: "fossabot", group: "Bot commands", usage: "!delcmd name", what: "Delete a custom command.", who: "Mods" },
  { tool: "fossabot", group: "Bot commands", usage: "!filesay https://example.com/list.txt", what: "Send each line of a text file to chat (handy for bulk commands). Stop it with !filesaystop.", who: "Mods" },
  { tool: "fossabot", group: "Stream", usage: "!settitle New title", what: "Change the stream title (no title: show the current one).", who: "Mods" },
  { tool: "fossabot", group: "Stream", usage: "!setgame Minecraft", what: "Change the stream category.", who: "Mods" },
  { tool: "fossabot", group: "Stream", usage: "!clip title", what: "Create a clip of the last moments, optionally with a title.", who: "Everyone" },
  { tool: "fossabot", group: "Info", usage: "!accountage username", what: "How long ago an account was created. Useful for spotting fresh alts.", who: "Everyone" },
  { tool: "fossabot", group: "Info", usage: "!followage username channel", what: "How long a user has followed a channel.", who: "Everyone" },
  { tool: "fossabot", group: "Info", usage: "!uptime", what: "How long the stream has been live.", who: "Everyone" },

  // ---- Nightbot
  { tool: "nightbot", group: "Bot commands", usage: "!commands add !name response", what: "Create a custom command.", who: "Mods" },
  { tool: "nightbot", group: "Bot commands", usage: "!commands edit !name new response", what: "Change a custom command's response.", who: "Mods" },
  { tool: "nightbot", group: "Bot commands", usage: "!commands delete !name", what: "Delete a custom command.", who: "Mods" },
  { tool: "nightbot", group: "Users", usage: "!permit username", what: "Let a user post a link without Nightbot's link filter catching it, for a short time.", who: "Mods" },
  { tool: "nightbot", group: "Users", usage: "!regulars add username", what: "Make someone a regular (gets past some filters, can use regular-only commands).", who: "Mods" },
  { tool: "nightbot", group: "Users", usage: "!regulars delete username", what: "Remove someone from regulars.", who: "Mods" },
  { tool: "nightbot", group: "Users", usage: "!winner", what: "Pick a random chatter (giveaways).", who: "Mods" },
  { tool: "nightbot", group: "Stream", usage: "!title New title", what: "Set the stream title (on its own: show it).", who: "Mods" },
  { tool: "nightbot", group: "Stream", usage: "!game Minecraft", what: "Set the stream category (on its own: show it).", who: "Mods" },
  { tool: "nightbot", group: "Stream", usage: "!marker", what: "Add a stream marker from chat.", who: "Mods" },
  { tool: "nightbot", group: "Info", usage: "!songs current", what: "Show the song request that's playing (also: list, next, skip, request).", who: "Everyone" },
];
