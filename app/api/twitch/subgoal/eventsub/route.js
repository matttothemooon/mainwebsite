import crypto from "node:crypto";
import {
  countSubscriptionEvent,
  eventSubSecret,
  setSubgoalFromChat,
} from "@/lib/twitch-subgoal";

function signatureIsValid(request, body, secret) {
  const messageId = request.headers.get("twitch-eventsub-message-id");
  const timestamp = request.headers.get("twitch-eventsub-message-timestamp");
  const signature = request.headers.get("twitch-eventsub-message-signature");
  if (!messageId || !timestamp || !signature) return false;

  const timestampMs = Date.parse(timestamp);
  if (!Number.isFinite(timestampMs) || Math.abs(Date.now() - timestampMs) > 10 * 60_000) {
    return false;
  }

  const expected = `sha256=${crypto
    .createHmac("sha256", secret)
    .update(messageId + timestamp + body)
    .digest("hex")}`;
  const expectedBytes = Buffer.from(expected);
  const givenBytes = Buffer.from(signature);
  return expectedBytes.length === givenBytes.length &&
    crypto.timingSafeEqual(expectedBytes, givenBytes);
}

export async function POST(request) {
  const body = await request.text();
  if (body.length > 64_000) return new Response("Payload too large", { status: 413 });

  let secret;
  try {
    secret = eventSubSecret();
  } catch (error) {
    console.error("Twitch EventSub configuration error:", error.message);
    return new Response("Not configured", { status: 503 });
  }

  if (!signatureIsValid(request, body, secret)) {
    return new Response("Invalid signature", { status: 403 });
  }

  let payload;
  try {
    payload = JSON.parse(body);
  } catch {
    return new Response("Invalid JSON", { status: 400 });
  }

  const messageType = request.headers.get("twitch-eventsub-message-type");
  if (messageType === "webhook_callback_verification") {
    if (typeof payload.challenge !== "string") return new Response("Missing challenge", { status: 400 });
    return new Response(payload.challenge, {
      headers: { "Content-Type": "text/plain; charset=utf-8", "Cache-Control": "no-store" },
    });
  }

  if (messageType === "revocation") {
    console.error("Twitch revoked the sub-goal chat subscription:", payload.subscription?.status);
    return new Response(null, { status: 204 });
  }

  if (messageType !== "notification") {
    return new Response(null, { status: 204 });
  }

  try {
    const eventType = payload.subscription?.type;
    const eventId = payload.metadata?.message_id;
    if (eventType === "channel.chat.message") {
      await setSubgoalFromChat(payload.event || {}, eventId);
    } else {
      await countSubscriptionEvent(eventType, payload.event || {}, eventId);
    }
  } catch (error) {
    console.error("Twitch sub-goal command failed:", error.message);
    return new Response("Could not process command", { status: 503 });
  }
  return new Response(null, { status: 204 });
}
