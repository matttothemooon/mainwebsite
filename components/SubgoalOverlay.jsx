"use client";

import { useEffect, useRef, useState } from "react";
import {
  applyModeratorCommand,
  normalizeSubgoalState,
  normalizeTwitchChannel,
  subscriptionCountFromNotice,
} from "@/lib/subgoal-chat";

const DEFAULT_STATE = { count: 0, goal: 100 };

export default function SubgoalOverlay({
  channel: channelInput,
  test = false,
  demo = false,
}) {
  const channel = normalizeTwitchChannel(channelInput || "feelssunnyman");
  const [state, setState] = useState(DEFAULT_STATE);
  const [connection, setConnection] = useState("connecting");
  const stateRef = useRef(DEFAULT_STATE);

  const commitState = (next) => {
    const normalized = {
      ...normalizeSubgoalState(next),
      paint: Array.isArray(next?.paint?.layers) ? next.paint : null,
    };
    stateRef.current = normalized;
    setState(normalized);
  };

  useEffect(() => {
    document.documentElement.classList.add("subgoal-overlay-document");
    document.body.classList.add("subgoal-overlay-body");
    return () => {
      document.documentElement.classList.remove("subgoal-overlay-document");
      document.body.classList.remove("subgoal-overlay-body");
    };
  }, []);

  useEffect(() => {
    if (demo) {
      commitState({ count: 2847, goal: 3000 });
      setConnection("demo");
      return;
    }
    if (test) {
      commitState(DEFAULT_STATE);
      setConnection("test");
      return;
    }
    if (!channel) {
      commitState(DEFAULT_STATE);
      setConnection("invalid channel");
      return;
    }

    let stopped = false;
    let controller;
    const update = async () => {
      controller?.abort();
      controller = new AbortController();
      try {
        const response = await fetch(
          `/api/overlay/subgoal?channel=${encodeURIComponent(channel)}`,
          { cache: "no-store", signal: controller.signal }
        );
        const result = await response.json();
        if (stopped) return;
        if (!response.ok || !result.connected) {
          setConnection(result.error || "not connected");
          return;
        }
        commitState(result);
        setConnection("connected");
      } catch (error) {
        if (error.name === "AbortError" || stopped) return;
        console.error("Could not update the Twitch sub-goal overlay:", error);
        setConnection("unavailable");
      }
    };

    setConnection("connecting");
    update();
    const interval = window.setInterval(update, 10_000);
    return () => {
      stopped = true;
      window.clearInterval(interval);
      controller?.abort();
    };
  }, [channel, demo, test]);

  useEffect(() => {
    if (!test || demo) return undefined;

    window.testOverlaySubscription = (type = "subscription") => {
      const current = stateRef.current;
      const notice =
        type === "subscription"
          ? "sub"
          : type === "gift"
            ? "subgift"
            : type === "mysterygift"
              ? "submysterygift"
              : type;
      const increment = subscriptionCountFromNotice({
        "msg-id": notice,
        "msg-param-mass-gift-count": type === "mysterygift" ? "5" : undefined,
      });
      if (increment > 0) {
        commitState({ ...current, count: current.count + increment });
      }
    };
    window.testOverlayMessage = (tags = { mod: "1" }, text = "!subgoal 150") => {
      const updated = applyModeratorCommand(stateRef.current, tags, text);
      if (updated) commitState(updated);
    };

    return () => {
      delete window.testOverlaySubscription;
      delete window.testOverlayMessage;
    };
  }, [demo, test]);

  const displayState = demo ? { count: 2847, goal: 3000 } : state;
  const overlayText = (
    <>
      <span className="subgoal-widget__label">SUBS</span>
      <strong>{displayState.count.toLocaleString("en-US")}</strong>
      {displayState.showGoal !== false && (
        <>
          <span className="subgoal-widget__divider">/</span>
          <strong className="subgoal-widget__goal">
            {displayState.goal.toLocaleString("en-US")}
          </strong>
        </>
      )}
    </>
  );

  return (
    <main className={`subgoal-overlay${test ? " subgoal-overlay--test" : ""}`}>
      <section
        className="subgoal-widget"
        aria-label={`${displayState.count} subs toward a goal of ${displayState.goal}. Chat ${connection}.`}
      >
        {displayState.paint?.layers?.length > 0 ? (
          <span
            className="subgoal-widget__paint"
            title={`7TV paint: ${displayState.paint.name || displayState.paint.id}`}
          >
            {displayState.paint.layers.map((layer, index) => (
              <span
                key={`${displayState.paint.id}-${index}`}
                aria-hidden="true"
                className="subgoal-widget__paint-layer"
                style={{
                  ...layer,
                  backgroundSize: "100% 100%",
                  backgroundClip: "text",
                  WebkitBackgroundClip: "text",
                  WebkitTextFillColor: "transparent",
                  filter: index === 0 ? displayState.paint.filter : undefined,
                }}
              >
                {overlayText}
              </span>
            ))}
          </span>
        ) : (
          <span className="subgoal-widget__content">{overlayText}</span>
        )}
        <span
          className={`subgoal-widget__connection subgoal-widget__connection--${connection.replace(/\s+/g, "-")}`}
          title={`Twitch connection: ${connection}`}
        />
      </section>
      {test && (
        <div className="subgoal-test-controls">
          <button type="button" onClick={() => window.testOverlaySubscription?.("sub")}>test sub</button>
          <button type="button" onClick={() => window.testOverlaySubscription?.("resub")}>test resub</button>
          <button type="button" onClick={() => window.testOverlaySubscription?.("gift")}>test gift</button>
          <button type="button" onClick={() => window.testOverlayMessage?.({ mod: "1" }, "!subgoal 150")}>test !subgoal</button>
          <button type="button" onClick={() => window.testOverlayMessage?.({ mod: true }, "!setsubs 25")}>test !setsubs</button>
          <button type="button" onClick={() => window.testOverlayMessage?.({ mod: true }, "!subs +")}>test !subs</button>
          <button type="button" onClick={() => window.testOverlayMessage?.({ mod: true }, "!resetsubs")}>test reset</button>
        </div>
      )}
    </main>
  );
}
