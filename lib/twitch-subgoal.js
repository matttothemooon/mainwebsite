import crypto from "node:crypto";
import fs from "node:fs/promises";
import { get, put } from "@vercel/blob";
import { applyModeratorCommand, normalizeSubgoalState } from "./subgoal-chat.js";

const BLOB_PATH = "private/twitch-subgoal/state.json";
const BLOB_STATE_PREFIX = "private/twitch-subgoal/users";
const BLOB_CHANNEL_PREFIX = "private/twitch-subgoal/channels";
const LOCAL_PATH = ".dev-subgoal.json";
const REQUIRED_SCOPES = ["channel:read:subscriptions", "user:read:chat"];

const refreshInFlight = new Map();
const paintCache = new Map();
let countCache;

export function twitchSubgoalConfigProblems() {
  const problems = [];
  if (!process.env.TWITCH_CLIENT_ID?.trim()) problems.push("TWITCH_CLIENT_ID is not set");
  if (!process.env.TWITCH_CLIENT_SECRET?.trim()) problems.push("TWITCH_CLIENT_SECRET is not set");
  if (!/^[a-fA-F0-9]{64}$/.test(process.env.SUBGOAL_ENCRYPTION_KEY || "")) {
    problems.push("SUBGOAL_ENCRYPTION_KEY must be a 64-character hex secret");
  }
  if (process.env.VERCEL) {
    const hasBlob = Boolean(
      process.env.BLOB_READ_WRITE_TOKEN ||
      (process.env.BLOB_STORE_ID && process.env.VERCEL_OIDC_TOKEN)
    );
    if (!hasBlob) problems.push("A connected private Vercel Blob store is not configured");

    const siteUrl = process.env.SITE_URL?.trim();
    if (!siteUrl) {
      problems.push("SITE_URL must be set to the canonical HTTPS website origin");
    } else {
      try {
        const parsedSiteUrl = new URL(siteUrl);
        if (parsedSiteUrl.protocol !== "https:" || !parsedSiteUrl.hostname) {
          problems.push("SITE_URL must be a valid HTTPS origin");
        }
      } catch {
        problems.push("SITE_URL must be a valid HTTPS origin");
      }
    }
  }
  return problems;
}

export function subgoalPublicUrl(path, requestUrl) {
  const origin = process.env.SITE_URL?.trim() || requestUrl;
  const url = new URL(path, origin);
  if (process.env.VERCEL && url.protocol !== "https:") {
    throw new Error("SITE_URL must use HTTPS in production");
  }
  return url.toString();
}

export function normalizeSubgoalChannel(channel) {
  if (typeof channel !== "string") return null;
  const normalized = channel.trim().replace(/^@/, "").toLowerCase();
  return /^[a-z0-9_]{4,25}$/.test(normalized) ? normalized : null;
}

const SEVENTV_PAINT_QUERY = `
  query Paint($id: Id!) {
    paints {
      paint(id: $id) {
        id
        name
        data {
          layers {
            opacity
            ty {
              __typename
              ... on PaintLayerTypeSingleColor { color { hex } }
              ... on PaintLayerTypeLinearGradient {
                angle
                repeating
                stops { at color { hex } }
              }
              ... on PaintLayerTypeRadialGradient {
                shape
                repeating
                stops { at color { hex } }
              }
              ... on PaintLayerTypeImage {
                images { url scale frameCount }
              }
            }
          }
          shadows { color { hex } offsetX offsetY blur }
        }
      }
    }
  }
`;

function safePaintColor(value) {
  return typeof value === "string" && /^#[0-9a-f]{6}(?:[0-9a-f]{2})?$/i.test(value)
    ? value
    : null;
}

function gradientStops(stops) {
  if (!Array.isArray(stops) || stops.length === 0 || stops.length > 32) return null;
  const validStops = stops.map((stop) => {
    const color = safePaintColor(stop.color?.hex);
    const at = Number(stop.at);
    return color && Number.isFinite(at)
      ? `${color} ${Math.max(0, Math.min(1, at)) * 100}%`
      : null;
  });
  return validStops.every(Boolean) ? validStops.join(", ") : null;
}

function paintLayerStyle(layer) {
  if (!layer?.ty || typeof layer.ty.__typename !== "string") return null;
  const type = layer.ty;
  const opacity = Number(layer.opacity);
  const style = {
    opacity: Number.isFinite(opacity) ? Math.max(0, Math.min(1, opacity)) : 1,
  };

  if (type.__typename === "PaintLayerTypeSingleColor") {
    const color = safePaintColor(type.color?.hex);
    if (color) style.backgroundColor = color;
  } else if (type.__typename === "PaintLayerTypeLinearGradient") {
    const stops = gradientStops(type.stops);
    const angle = Number(type.angle);
    if (stops && Number.isFinite(angle) && Math.abs(angle) <= 3600) {
      style.backgroundImage = `${type.repeating ? "repeating-" : ""}linear-gradient(${angle}deg, ${stops})`;
    }
  } else if (type.__typename === "PaintLayerTypeRadialGradient") {
    const stops = gradientStops(type.stops);
    const shape = ["CIRCLE", "ELLIPSE"].includes(type.shape) ? type.shape.toLowerCase() : null;
    if (stops && shape) {
      style.backgroundImage = `${type.repeating ? "repeating-" : ""}radial-gradient(${shape}, ${stops})`;
    }
  } else if (type.__typename === "PaintLayerTypeImage" && Array.isArray(type.images)) {
    const animated = type.images.some((image) => image.frameCount > 1);
    const image = type.images.find(
      (candidate) => candidate.scale === 1 && (candidate.frameCount > 1) === animated
    );
    if (image) {
      try {
        const url = new URL(image.url);
        if (url.protocol === "https:" && url.hostname === "cdn.7tv.app") {
          style.backgroundImage = `url(${JSON.stringify(url.toString())})`;
        }
      } catch {}
    }
  }

  return style.backgroundColor || style.backgroundImage ? style : null;
}

export function normalizeSevenTvPaint(paint) {
  if (!paint || !Array.isArray(paint.data?.layers)) return null;
  const layers = paint.data.layers.map(paintLayerStyle).filter(Boolean).slice(0, 8);
  const shadows = (Array.isArray(paint.data.shadows) ? paint.data.shadows : [])
    .slice(0, 8)
    .flatMap((shadow) => {
      const color = safePaintColor(shadow.color?.hex);
      const numbers = [shadow.offsetX, shadow.offsetY, shadow.blur].map(Number);
      if (!color || numbers.some((value) => !Number.isFinite(value) || Math.abs(value) > 100)) {
        return [];
      }
      return [`drop-shadow(${color} ${numbers[0]}px ${numbers[1]}px ${Math.max(0, numbers[2])}px)`];
    });
  return {
    id: paint.id,
    name: typeof paint.name === "string" ? paint.name.slice(0, 100) : "",
    layers,
    filter: shadows.length ? shadows.join(" ") : undefined,
  };
}

export async function fetchSevenTvPaint(paintId) {
  if (!/^[0-9A-HJKMNPQRSTVWXYZ]{26}$/i.test(paintId || "")) return null;
  const id = paintId.toUpperCase();
  const cached = paintCache.get(id);
  if (cached && cached.expiresAt > Date.now()) return cached.value;

  const response = await fetch("https://7tv.io/v4/gql", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ query: SEVENTV_PAINT_QUERY, variables: { id } }),
    signal: AbortSignal.timeout(8_000),
  });
  if (!response.ok) throw new Error(`7TV paint lookup failed (${response.status})`);
  const payload = await response.json();
  if (payload.errors?.length) throw new Error("7TV could not load that paint");

  const value = normalizeSevenTvPaint(payload.data?.paints?.paint);
  paintCache.set(id, { value, expiresAt: Date.now() + 5 * 60_000 });
  return value;
}

function requireEncryptionKey() {
  const problems = twitchSubgoalConfigProblems();
  if (problems.length) throw new Error(problems.join("; "));
  return Buffer.from(process.env.SUBGOAL_ENCRYPTION_KEY, "hex");
}

function encrypt(value) {
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv("aes-256-gcm", requireEncryptionKey(), iv);
  const ciphertext = Buffer.concat([
    cipher.update(JSON.stringify(value), "utf8"),
    cipher.final(),
  ]);
  return JSON.stringify({
    version: 1,
    iv: iv.toString("base64"),
    tag: cipher.getAuthTag().toString("base64"),
    ciphertext: ciphertext.toString("base64"),
  });
}

function decrypt(value) {
  const envelope = JSON.parse(value);
  if (envelope.version !== 1) throw new Error("Unsupported Twitch credential format");
  const decipher = crypto.createDecipheriv(
    "aes-256-gcm",
    requireEncryptionKey(),
    Buffer.from(envelope.iv, "base64")
  );
  decipher.setAuthTag(Buffer.from(envelope.tag, "base64"));
  const plaintext = Buffer.concat([
    decipher.update(Buffer.from(envelope.ciphertext, "base64")),
    decipher.final(),
  ]);
  return JSON.parse(plaintext.toString("utf8"));
}

async function readEncryptedState(path, localPath) {
  requireEncryptionKey();
  if (process.env.VERCEL) {
    const blob = await get(path, { access: "private", useCache: false });
    if (!blob) return null;
    return decrypt(await new Response(blob.stream).text());
  }

  try {
    return decrypt(await fs.readFile(localPath, "utf8"));
  } catch (error) {
    if (error.code === "ENOENT") return null;
    throw error;
  }
}

async function readChannelId(login) {
  if (process.env.VERCEL) {
    const blob = await get(`${BLOB_CHANNEL_PREFIX}/${login}.json`, {
      access: "private",
      useCache: false,
    });
    if (!blob) return null;
    const mapping = await new Response(blob.stream).json();
    return /^\d+$/.test(mapping.broadcasterId || "") ? mapping.broadcasterId : null;
  }

  try {
    const mapping = JSON.parse(
      await fs.readFile(`.dev-subgoal-channel-${login}.json`, "utf8")
    );
    return /^\d+$/.test(mapping.broadcasterId || "") ? mapping.broadcasterId : null;
  } catch (error) {
    if (error.code === "ENOENT") return null;
    throw error;
  }
}

export async function readSubgoalState() {
  return readEncryptedState(BLOB_PATH, LOCAL_PATH);
}

export async function readSubgoalStateById(broadcasterId) {
  if (!/^\d+$/.test(String(broadcasterId))) return null;
  const id = String(broadcasterId);
  const state = await readEncryptedState(
    `${BLOB_STATE_PREFIX}/${id}.json`,
    `.dev-subgoal-${id}.json`
  );
  if (state) return state;

  const legacyState = await readSubgoalState();
  return legacyState?.broadcasterId === id ? legacyState : null;
}

export async function readSubgoalStateByChannel(channel) {
  const login = normalizeSubgoalChannel(channel);
  if (!login) return null;
  const broadcasterId = await readChannelId(login);
  if (!broadcasterId) return null;
  const state = await readSubgoalStateById(broadcasterId);
  return state?.login?.toLowerCase() === login ? state : null;
}

export async function writeSubgoalState(state) {
  const encrypted = encrypt(state);
  const broadcasterId = String(state.broadcasterId || "");
  const login = normalizeSubgoalChannel(state.login);

  if (process.env.VERCEL) {
    const path = /^\d+$/.test(broadcasterId)
      ? `${BLOB_STATE_PREFIX}/${broadcasterId}.json`
      : BLOB_PATH;
    await put(path, encrypted, {
      access: "private",
      addRandomSuffix: false,
      allowOverwrite: true,
      contentType: "application/json",
    });
    if (/^\d+$/.test(broadcasterId) && login) {
      await put(`${BLOB_CHANNEL_PREFIX}/${login}.json`, JSON.stringify({ broadcasterId }), {
        access: "private",
        addRandomSuffix: false,
        allowOverwrite: true,
        contentType: "application/json",
      });
    }
    return;
  }

  if (/^\d+$/.test(broadcasterId)) {
    await fs.writeFile(`.dev-subgoal-${broadcasterId}.json`, encrypted, { mode: 0o600 });
    if (login) {
      await fs.writeFile(
        `.dev-subgoal-channel-${login}.json`,
        JSON.stringify({ broadcasterId }),
        { mode: 0o600 }
      );
    }
  } else {
    await fs.writeFile(LOCAL_PATH, encrypted, { mode: 0o600 });
  }
}

export function eventSubSecret() {
  return crypto
    .createHmac("sha256", requireEncryptionKey())
    .update("twitch-eventsub-subgoal")
    .digest("hex");
}

export async function validSubgoalState() {
  const state = await readSubgoalState();
  if (!state) return null;
  return refreshSubgoalState(state);
}

export async function validSubgoalStateForChannel(channel) {
  const state = await readSubgoalStateByChannel(channel);
  if (!state) return null;
  return refreshSubgoalState(state);
}

async function refreshSubgoalState(state) {
  if (state.expiresAt > Date.now() + 60_000) return state;
  const key = state.broadcasterId || "legacy";
  if (refreshInFlight.has(key)) return refreshInFlight.get(key);

  const refresh = refreshState(state);
  refreshInFlight.set(key, refresh);
  try {
    return await refresh;
  } finally {
    refreshInFlight.delete(key);
  }
}

async function refreshState(state) {
  const response = await fetch("https://id.twitch.tv/oauth2/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      client_id: process.env.TWITCH_CLIENT_ID.trim(),
      client_secret: process.env.TWITCH_CLIENT_SECRET.trim(),
      grant_type: "refresh_token",
      refresh_token: state.refreshToken,
    }),
  });
  const token = await response.json();
  if (!response.ok || !token.access_token || !token.refresh_token) {
    throw new Error(`Twitch token refresh failed (${response.status})`);
  }

  const updated = {
    ...state,
    accessToken: token.access_token,
    refreshToken: token.refresh_token,
    expiresAt: Date.now() + token.expires_in * 1000,
  };
  await writeSubgoalState(updated);
  return updated;
}

export async function fetchActiveSubscribers(state) {
  if (
    countCache &&
    countCache.broadcasterId === state.broadcasterId &&
    countCache.expiresAt > Date.now()
  ) {
    return countCache.count;
  }

  const response = await fetch(
    `https://api.twitch.tv/helix/subscriptions?broadcaster_id=${encodeURIComponent(state.broadcasterId)}&first=1`,
    {
      headers: {
        "Client-Id": process.env.TWITCH_CLIENT_ID.trim(),
        Authorization: `Bearer ${state.accessToken}`,
      },
      cache: "no-store",
    }
  );
  if (!response.ok) {
    throw new Error(`Twitch subscription lookup failed (${response.status})`);
  }
  const payload = await response.json();
  if (!Number.isInteger(payload.total) || payload.total < 0) {
    throw new Error("Twitch returned an invalid active subscriber count");
  }

  countCache = {
    broadcasterId: state.broadcasterId,
    count: payload.total,
    expiresAt: Date.now() + 30_000,
  };
  return payload.total;
}

function eventWasProcessed(state, eventId) {
  return Boolean(eventId && state.recentEventIds?.includes(eventId));
}

function rememberEvent(state, eventId) {
  if (!eventId) return state;
  return {
    ...state,
    recentEventIds: [...(state.recentEventIds || []), eventId].slice(-100),
  };
}

export async function setSubgoalFromChat(event, eventId) {
  const state = await readSubgoalStateById(event.broadcaster_user_id);
  if (!state || event.broadcaster_user_id !== state.broadcasterId) return false;
  if (eventWasProcessed(state, eventId)) return false;

  const badges = Array.isArray(event.badges)
    ? event.badges.map((badge) => `${badge.set_id}/${badge.id || "1"}`).join(",")
    : "";
  const current = normalizeSubgoalState(state);
  const updated = applyModeratorCommand(current, { badges }, event.message?.text || "");
  if (!updated) return false;

  await writeSubgoalState(rememberEvent({ ...state, ...updated }, eventId));
  return true;
}

export async function countSubscriptionEvent(type, event, eventId) {
  const state = await readSubgoalStateById(event.broadcaster_user_id);
  if (!state || event.broadcaster_user_id !== state.broadcasterId) return false;
  if (eventWasProcessed(state, eventId)) return false;

  let increment = 0;
  if (type === "channel.subscribe" && !event.is_gift) increment = 1;
  if (type === "channel.subscription.message") increment = 1;
  if (type === "channel.subscription.gift") {
    const total = Number(event.total);
    increment = Number.isSafeInteger(total) && total > 0 ? total : 1;
  }
  if (increment === 0) return false;

  const current = normalizeSubgoalState(state);
  const count = current.count + increment;
  if (!Number.isSafeInteger(count)) return false;
  await writeSubgoalState(
    rememberEvent({ ...state, count, goal: current.goal }, eventId)
  );
  return true;
}

export async function validateTwitchAccessToken(accessToken) {
  const response = await fetch("https://id.twitch.tv/oauth2/validate", {
    headers: { Authorization: `OAuth ${accessToken}` },
    cache: "no-store",
  });
  if (!response.ok) throw new Error("Twitch could not validate the authorization");
  const validation = await response.json();
  const missing = REQUIRED_SCOPES.filter((scope) => !validation.scopes?.includes(scope));
  if (missing.length) throw new Error(`Twitch authorization is missing scopes: ${missing.join(", ")}`);
  return validation;
}

export async function registerSubgoalSubscriptions(state, callbackUrl) {
  const headers = {
    "Client-Id": process.env.TWITCH_CLIENT_ID.trim(),
    Authorization: `Bearer ${state.accessToken}`,
    "Content-Type": "application/json",
  };
  const definitions = [
    {
      type: "channel.chat.message",
      condition: {
        broadcaster_user_id: state.broadcasterId,
        user_id: state.broadcasterId,
      },
    },
    ...[
      "channel.subscribe",
      "channel.subscription.message",
      "channel.subscription.gift",
    ].map((type) => ({
      type,
      condition: { broadcaster_user_id: state.broadcasterId },
    })),
  ];

  for (const definition of definitions) {
    const listUrl = new URL("https://api.twitch.tv/helix/eventsub/subscriptions");
    listUrl.searchParams.set("type", definition.type);
    listUrl.searchParams.set("user_id", state.broadcasterId);

    const existingResponse = await fetch(listUrl, { headers, cache: "no-store" });
    if (!existingResponse.ok) {
      throw new Error(
        `Could not check Twitch ${definition.type} subscription (${existingResponse.status})`
      );
    }
    const existing = await existingResponse.json();
    if (existing.data?.some(
      (item) =>
        item.status === "enabled" &&
        item.transport?.callback === callbackUrl &&
        item.condition?.broadcaster_user_id === state.broadcasterId &&
        (definition.type !== "channel.chat.message" ||
          item.condition?.user_id === state.broadcasterId)
    )) continue;

    const response = await fetch("https://api.twitch.tv/helix/eventsub/subscriptions", {
      method: "POST",
      headers,
      body: JSON.stringify({
        ...definition,
        version: "1",
        transport: {
          method: "webhook",
          callback: callbackUrl,
          secret: eventSubSecret(),
        },
      }),
    });
    if (!response.ok) {
      const detail = await response.text();
      throw new Error(
        `Could not subscribe to Twitch ${definition.type} (${response.status}): ${detail}`
      );
    }
  }
}
