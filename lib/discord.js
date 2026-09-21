const WEBHOOK_NAME = "DISCORD_CHANGELOG_WEBHOOK_URL";

export async function postChangelogEntry(entry) {
  const webhook = (process.env[WEBHOOK_NAME] || "").trim();
  if (!webhook) throw new Error(`${WEBHOOK_NAME} is not configured`);

  let url;
  try {
    url = new URL(webhook);
  } catch {
    throw new Error(`${WEBHOOK_NAME} is not a valid URL`);
  }
  if (url.protocol !== "https:" || url.hostname !== "discord.com") {
    throw new Error(`${WEBHOOK_NAME} must be a Discord HTTPS webhook URL`);
  }

  const response = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      username: "mattothemoon changelog",
      embeds: [{
        title: entry.title,
        description: entry.body,
        color: 0xd0d0d0,
        timestamp: new Date(entry.date).toISOString(),
        ...(process.env.SITE_URL ? { url: `${process.env.SITE_URL}/changelog` } : {}),
      }],
    }),
  });
  if (!response.ok) throw new Error(`Discord webhook failed (${response.status})`);
}
