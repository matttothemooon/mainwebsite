"use client";

import { useEffect, useRef, useState } from "react";
import { CHAT_URL, cleanChannel, parseLine, toChatMessage, enters, readAnnouncement } from "@/lib/raffle";

const ROLL_MS = 3000;
const WINNER_SHOWN_MS = 30000;

// The OBS overlay for /raffle. It reads the channel's chat on its own and
// follows the announcements the raffle page posts as `by`: entries open,
// entries closed, and the winner. Entries are counted here the same way.
export default function RaffleOverlay({ channel: rawChannel, by: rawBy }) {
  const channel = cleanChannel(rawChannel);
  const by = cleanChannel(rawBy);
  const [phase, setPhase] = useState("idle"); // idle | open | closed | rolling | winner
  const [rules, setRules] = useState({ keyword: "" });
  const [count, setCount] = useState(0);
  const [rolling, setRolling] = useState("");
  const [winner, setWinner] = useState(null);
  const entrants = useRef(new Map());
  const state = useRef({ phase: "idle", rules: { keyword: "" } });
  const timers = useRef([]);

  useEffect(() => {
    if (!channel || !by) return undefined;
    let socket;
    let stopped = false;
    const later = (fn, ms) => timers.current.push(setTimeout(fn, ms));
    const go = (next) => {
      state.current.phase = next;
      setPhase(next);
    };

    function announce(a) {
      timers.current.forEach(clearTimeout);
      timers.current = [];
      if (a.type === "open") {
        // A new raffle if the last one had finished; reopening keeps entries.
        if (["idle", "winner"].includes(state.current.phase)) {
          entrants.current = new Map();
          setCount(0);
          setWinner(null);
        }
        state.current.rules = a;
        setRules(a);
        go("open");
      } else if (a.type === "closed") {
        go("closed");
      } else if (a.type === "winner") {
        const names = [...entrants.current.values()].map((e) => e.name);
        const found = [...entrants.current.values()].find((e) => e.name.toLowerCase() === a.name.toLowerCase());
        const result = found || { name: a.name, color: "" };
        go("rolling");
        const started = Date.now();
        const tick = () => {
          const left = ROLL_MS - (Date.now() - started);
          if (left <= 0) {
            setWinner(result);
            go("winner");
            later(() => go("idle"), WINNER_SHOWN_MS);
            return;
          }
          setRolling(names.length ? names[Math.floor(Math.random() * names.length)] : "…");
          later(tick, 60 + (1 - left / ROLL_MS) * 220);
        };
        tick();
      }
    }

    function connect() {
      socket = new WebSocket(CHAT_URL);
      socket.onopen = () => {
        socket.send("CAP REQ :twitch.tv/tags twitch.tv/commands");
        socket.send(`NICK justinfan${Math.floor(10000 + Math.random() * 89999)}`);
        socket.send(`JOIN #${channel}`);
      };
      socket.onmessage = (event) => {
        for (const line of String(event.data).split("\r\n")) {
          if (!line) continue;
          const parsed = parseLine(line);
          if (parsed.command === "PING") {
            socket.send(`PONG :${parsed.params[0] || "tmi.twitch.tv"}`);
            continue;
          }
          const msg = toChatMessage(parsed);
          if (!msg) continue;
          if (msg.login === by) {
            const a = readAnnouncement(msg.text);
            if (a) {
              announce(a);
              continue;
            }
          }
          if (state.current.phase === "open" && enters(msg, state.current.rules) && !entrants.current.has(msg.id)) {
            entrants.current.set(msg.id, msg);
            setCount(entrants.current.size);
          }
        }
      };
      socket.onclose = () => {
        if (!stopped) setTimeout(connect, 2000);
      };
    }

    connect();
    return () => {
      stopped = true;
      socket?.close();
      timers.current.forEach(clearTimeout);
    };
  }, [channel, by]);

  if (!channel || !by) {
    return (
      <div className="ov">
        <p className="ov__hint">Open the raffle page, sign in with Twitch and copy the overlay link from there.</p>
      </div>
    );
  }

  if (phase === "idle") return <div className="ov" />;

  return (
    <div className="ov">
      <div className={`ov__card${phase === "winner" ? " is-winner" : ""}`} key={phase === "winner" ? "w" : "r"}>
        {phase === "open" && (
          <>
            <span className="ov__label"><b>●</b> raffle open{rules.subsOnly ? " · subs only" : ""}</span>
            <p className="ov__title">{rules.keyword ? <>Type <kbd>{rules.keyword}</kbd> to join</> : "Say anything to join"}</p>
            <span className="ov__count">{count} entered</span>
          </>
        )}
        {phase === "closed" && (
          <>
            <span className="ov__label">entries closed</span>
            <p className="ov__title">Drawing soon…</p>
            <span className="ov__count">{count} entered</span>
          </>
        )}
        {phase === "rolling" && (
          <>
            <span className="ov__label">drawing a winner</span>
            <p className="ov__title ov__rolling">{rolling}</p>
          </>
        )}
        {phase === "winner" && winner && (
          <>
            <span className="ov__label">🎉 winner</span>
            <p className="ov__title ov__winner" style={winner.color ? { color: winner.color } : undefined}>{winner.name}</p>
            <span className="ov__count">out of {count} {count === 1 ? "entry" : "entries"}</span>
          </>
        )}
      </div>
    </div>
  );
}
