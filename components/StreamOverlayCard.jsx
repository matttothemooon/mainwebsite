"use client";

import { useEffect, useState } from "react";
import CopyButton from "@/components/CopyButton";
import { normalizeTwitchChannel } from "@/lib/subgoal-chat";

export default function StreamOverlayCard({ siteUrl }) {
  const [channel, setChannel] = useState("feelssunnyman");
  const [connection, setConnection] = useState({ status: "checking" });
  const channelSlug = normalizeTwitchChannel(channel);
  const query = new URLSearchParams({ channel: channelSlug || "" });
  const channelUrl = channelSlug ? `${siteUrl}/overlay/subgoal?${query}` : "";
  const previewUrl = `/overlay/subgoal?demo=1&channel=${encodeURIComponent(channelSlug || "feelssunnyman")}`;

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const connected = normalizeTwitchChannel(params.get("connected"));
    const requested = normalizeTwitchChannel(params.get("channel"));
    if (connected) {
      setChannel(connected);
      window.history.replaceState({}, "", window.location.pathname);
    } else if (requested) {
      setChannel(requested);
    }
  }, []);

  useEffect(() => {
    if (!channelSlug) {
      setConnection({ status: "invalid" });
      return undefined;
    }

    const controller = new AbortController();
    const timeout = window.setTimeout(async () => {
      setConnection({ status: "checking" });
      try {
        const response = await fetch(
          `/api/overlay/subgoal?channel=${encodeURIComponent(channelSlug)}`,
          { cache: "no-store", signal: controller.signal }
        );
        const result = await response.json();
        if (!response.ok) {
          setConnection({ status: "error", message: result.error || "Could not check connection." });
        } else if (result.connected) {
          setConnection({ status: "connected", ...result });
        } else {
          setConnection({ status: "not-connected" });
        }
      } catch (error) {
        if (error.name !== "AbortError") {
          console.error("Could not check the sub-goal connection:", error);
          setConnection({ status: "error", message: "Could not check connection." });
        }
      }
    }, 250);

    return () => {
      window.clearTimeout(timeout);
      controller.abort();
    };
  }, [channelSlug]);

  return (
    <section className="overlay-hub__card" aria-labelledby="subgoal-title">
      <div className="overlay-hub__channel-field">
        <label htmlFor="overlay-channel">Your Twitch channel</label>
        <input
          id="overlay-channel"
          type="text"
          value={channel}
          onChange={(event) => setChannel(event.target.value)}
          autoComplete="off"
          autoCapitalize="none"
          spellCheck="false"
          maxLength={26}
          placeholder="yourchannel"
        />
        <p>Use the Twitch channel you authorize below.</p>
      </div>

      <div className="overlay-hub__card-heading">
        <div>
          <p className="home-eyebrow">the overlay</p>
          <h2 id="subgoal-title">Sub goal</h2>
          <p className="overlay-hub__description">
            A self-service overlay for any streamer. Each person connects their
            own Twitch once; no one needs access to the site admin.
          </p>
        </div>
        <span className="overlay-hub__status">OBS BROWSER SOURCE</span>
      </div>

      <div
        className={`overlay-hub__connection-status overlay-hub__connection-status--${connection.status}`}
        role="status"
      >
        {connection.status === "connected" && (
          <>
            Connected to <strong>{connection.channel}</strong> ·{" "}
            {connection.count.toLocaleString("en-US")} subs /{" "}
            {connection.goal.toLocaleString("en-US")}
          </>
        )}
        {connection.status === "checking" && "Checking this channel's connection…"}
        {connection.status === "not-connected" && "This channel has not connected Twitch yet."}
        {connection.status === "invalid" && "Enter a valid Twitch channel name to continue."}
        {connection.status === "error" && connection.message}
      </div>

      <div className="overlay-hub__preview">
        <iframe
          key={previewUrl}
          src={previewUrl}
          title={`Preview of the ${channelSlug || "Twitch"} sub-goal overlay`}
          loading="lazy"
        />
      </div>

      <div className="overlay-hub__setup">
        <div>
          <span className="overlay-hub__step">CONNECT ONCE</span>
          <p>
            Authorize your own Twitch account. Your count and goal are saved
            separately from other streamers.
          </p>
          <a className="btn" href="/api/twitch/subgoal/connect">
            connect my Twitch
          </a>
        </div>
        <div>
          <span className="overlay-hub__step">ADD IT TO OBS</span>
          <p>
            Add a Browser Source at exactly 600 × 80. Leave “Shutdown source
            when not visible” off. Nothing resets automatically.
          </p>
          <CopyButton url={channelUrl} disabled={!channelUrl} />
        </div>
        <div>
          <span className="overlay-hub__step">CHAT COMMANDS</span>
          <p>Broadcaster and mods can use:</p>
          <ul className="overlay-hub__commands">
            <li><code>!subgoal &lt;number&gt;</code> — set the goal</li>
            <li><code>!setsubs &lt;number&gt;</code> — set the current count</li>
            <li><code>!ic &lt;number&gt;</code> — set the goal</li>
            <li><code>!remove</code> — subtract one from the count</li>
            <li><code>!increment &lt;number&gt;</code> — add that many to the count</li>
            <li><code>!hidegoal</code> / <code>!showgoal</code> — hide or show the goal</li>
            <li>
              <code>!painturl &lt;url&gt;</code> / <code>!clearpaint</code> — apply or clear
              a 7TV paint across all overlay text (label, count, and goal)
            </li>
          </ul>
          <p>
            Also supported: <code>!subs +</code>, <code>!subs -</code>, and{" "}
            <code>!resetsubs</code>. Use a 7TV paint link like{" "}
            <code>https://7tv.app/paints/…</code>.
          </p>
        </div>
      </div>
    </section>
  );
}
