"use client";

import { useEffect, useRef, useState } from "react";
import {
  CHAT_URL,
  cleanChannel,
  parseLine,
  toChatMessage,
  enters,
  pickWinner,
  openMessage,
  CLOSED_MESSAGE,
  winnerMessage,
  addToHistory,
  HISTORY_KEY,
} from "@/lib/raffle";

const ROLL_MS = 1800;
const AUTH_KEY = "raffle-twitch";
const STATE_KEY = "raffle-oauth-state";
// Read chat as the signed-in account and post the announcements.
const SCOPES = "chat:read chat:edit";

const store = {
  get(key) {
    try {
      return JSON.parse(localStorage.getItem(key));
    } catch {
      return null;
    }
  },
  set(key, value) {
    try {
      if (value === null) localStorage.removeItem(key);
      else localStorage.setItem(key, JSON.stringify(value));
    } catch {}
  },
};
const FEED_MAX = 30;

const since = (ms) => {
  const s = Math.max(0, Math.floor(ms / 1000));
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}`;
};

function Name({ person }) {
  return (
    <span className="rf__name" style={person.color ? { color: person.color } : undefined}>
      {person.name}
    </span>
  );
}

function Badges({ person }) {
  return (
    <>
      {person.mod && <span className="rf__badge rf__badge--mod">mod</span>}
      {person.vip && <span className="rf__badge rf__badge--vip">vip</span>}
      {person.sub && <span className="rf__badge rf__badge--sub">sub</span>}
    </>
  );
}

// Signs in with Twitch in the browser (implicit flow): the token stays in this
// browser and is only used to talk to Twitch chat.
function useTwitchLogin(clientId) {
  const [auth, setAuth] = useState(null); // { token, login }
  const [error, setError] = useState("");

  useEffect(() => {
    const hash = new URLSearchParams(window.location.hash.slice(1));
    const token = hash.get("access_token");
    const fromTwitch = token || hash.get("error");
    if (fromTwitch) {
      const expected = sessionStorage.getItem(STATE_KEY);
      sessionStorage.removeItem(STATE_KEY);
      window.history.replaceState(null, "", window.location.pathname + window.location.search);
      if (!token) return setError("Twitch sign-in was cancelled.");
      if (!expected || hash.get("state") !== expected) return setError("Twitch sign-in expired. Try again.");
    }
    const candidate = token || store.get(AUTH_KEY)?.token;
    if (!candidate) return;
    fetch("https://id.twitch.tv/oauth2/validate", { headers: { Authorization: `OAuth ${candidate}` } })
      .then((r) => (r.ok ? r.json() : null))
      .then((who) => {
        if (who?.login && (who.scopes || []).includes("chat:edit")) {
          const value = { token: candidate, login: who.login };
          store.set(AUTH_KEY, value);
          setAuth(value);
        } else {
          store.set(AUTH_KEY, null);
          if (token) setError("Twitch didn't allow posting in chat. Try signing in again.");
        }
      })
      .catch(() => {});
  }, []);

  const signIn = () => {
    const state = Math.random().toString(36).slice(2) + Date.now().toString(36);
    sessionStorage.setItem(STATE_KEY, state);
    const params = new URLSearchParams({
      client_id: clientId,
      redirect_uri: `${window.location.origin}/raffle`,
      response_type: "token",
      scope: SCOPES,
      state,
    });
    window.location.href = `https://id.twitch.tv/oauth2/authorize?${params}`;
  };
  const signOut = () => {
    if (auth) {
      fetch("https://id.twitch.tv/oauth2/revoke", {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: new URLSearchParams({ client_id: clientId, token: auth.token }),
      }).catch(() => {});
    }
    store.set(AUTH_KEY, null);
    setAuth(null);
  };
  return { auth, error, signIn, signOut };
}

export default function RaffleTool({ clientId = "" }) {
  const { auth, error: authError, signIn, signOut } = useTwitchLogin(clientId);
  const [post, setPost] = useState(true);
  const [history, setHistory] = useState([]);
  useEffect(() => setHistory(store.get(HISTORY_KEY) || []), []);
  const [channel, setChannel] = useState("");
  const [keyword, setKeyword] = useState("!enter");
  const [subsOnly, setSubsOnly] = useState(false);
  const [excludeMods, setExcludeMods] = useState(false);
  const [subLuck, setSubLuck] = useState(1);

  const [status, setStatus] = useState("idle"); // idle | connecting | open | closed | error
  const [joined, setJoined] = useState("");
  const [entrants, setEntrants] = useState([]);
  const [filter, setFilter] = useState("");
  const [winners, setWinners] = useState([]); // newest last
  const [rolling, setRolling] = useState("");
  const [winnerChat, setWinnerChat] = useState([]);
  const [now, setNow] = useState(() => Date.now());
  const [note, setNote] = useState("");

  const ws = useRef(null);
  const live = useRef({}); // what the socket handler reads
  const winner = winners[winners.length - 1] || null;
  const announced = useRef(false);
  live.current = { status, keyword, subsOnly, excludeMods, winnerId: winner?.id, post: post && Boolean(auth), auth, channel: joined };

  // Posts in the raffle's chat as the signed-in account.
  function say(text) {
    const s = live.current;
    if (!s.post || !s.channel || ws.current?.readyState !== 1) return;
    ws.current.send(`PRIVMSG #${s.channel} :${text}`);
  }

  // Clock for "drawn 0:12 ago".
  useEffect(() => {
    if (!winner) return undefined;
    const id = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, [winner]);

  useEffect(() => () => ws.current?.close(), []);

  function onMessage(msg) {
    const s = live.current;
    if (s.winnerId && msg.id === s.winnerId) {
      setWinnerChat((list) => [...list, { text: msg.text, at: Date.now() }].slice(-FEED_MAX));
    }
    if (s.status !== "open" || !enters(msg, s)) return;
    setEntrants((list) => (list.some((e) => e.id === msg.id) ? list : [...list, { ...msg, at: Date.now() }]));
  }

  function connect(name) {
    ws.current?.close();
    const socket = new WebSocket(CHAT_URL);
    ws.current = socket;
    socket.onopen = () => {
      socket.send("CAP REQ :twitch.tv/tags twitch.tv/commands");
      const a = live.current.auth;
      if (a) {
        socket.send(`PASS oauth:${a.token}`);
        socket.send(`NICK ${a.login}`);
      } else {
        // Anonymous, read-only login: Twitch allows any justinfan<number>.
        socket.send(`NICK justinfan${Math.floor(10000 + Math.random() * 89999)}`);
      }
      socket.send(`JOIN #${name}`);
    };
    socket.onmessage = (event) => {
      for (const line of String(event.data).split("\r\n")) {
        if (!line) continue;
        const parsed = parseLine(line);
        if (parsed.command === "PING") socket.send(`PONG :${parsed.params[0] || "tmi.twitch.tv"}`);
        else if (parsed.command === "JOIN" || parsed.command === "ROOMSTATE") {
          setStatus((st) => (st === "connecting" ? "open" : st));
          setJoined(name);
          live.current.channel = name;
          if (!announced.current) {
            announced.current = true;
            say(openMessage(live.current));
          }
        } else if (parsed.command === "NOTICE" && /login authentication failed|improperly formatted auth/i.test(parsed.params[1] || "")) {
          setNote("Your Twitch sign-in has expired. Sign in again, or sign out to run without posting.");
          setStatus("error");
        } else if (parsed.command === "NOTICE" && /does not exist|suspended|banned/i.test(parsed.params[1] || "")) {
          setNote(parsed.params[1]);
          setStatus("error");
        } else {
          const msg = toChatMessage(parsed);
          if (msg) onMessage(msg);
        }
      }
    };
    socket.onclose = () => {
      if (ws.current !== socket) return;
      // Dropped while running: try again shortly.
      if (["open", "closed"].includes(live.current.status)) setTimeout(() => ws.current === socket && connect(name), 2000);
    };
    socket.onerror = () => setNote("Couldn't reach Twitch chat. Retrying…");
  }

  function start(e) {
    e.preventDefault();
    const name = cleanChannel(channel);
    if (!name) {
      setNote("Enter a Twitch channel name.");
      return;
    }
    setNote("");
    setEntrants([]);
    setWinners([]);
    setWinnerChat([]);
    setStatus("connecting");
    announced.current = false;
    connect(name);
  }

  function reset() {
    const socket = ws.current;
    ws.current = null;
    socket?.close();
    setStatus("idle");
    setJoined("");
    setEntrants([]);
    setWinners([]);
    setWinnerChat([]);
    setRolling("");
    setNote("");
  }

  function draw() {
    const exclude = new Set(winners.map((w) => w.id));
    const pick = pickWinner(entrants, { subLuck, exclude });
    if (!pick) {
      setNote(winners.length ? "Everyone who entered has already won." : "Nobody has entered yet.");
      return;
    }
    setNote("");
    const pool = entrants.filter((e) => !exclude.has(e.id));
    const started = Date.now();
    const tick = () => {
      const left = ROLL_MS - (Date.now() - started);
      if (left <= 0) {
        setRolling("");
        setWinnerChat([]);
        setWinners((list) => [...list, { ...pick, drawnAt: Date.now() }]);
        say(winnerMessage(pick.name));
        setHistory((list) => {
          const next = addToHistory(list, {
            at: Date.now(),
            channel: live.current.channel,
            keyword: live.current.keyword.trim(),
            entries: entrants.length,
            winner: pick.name,
            color: pick.color,
          });
          store.set(HISTORY_KEY, next);
          return next;
        });
        return;
      }
      setRolling(pool[Math.floor(Math.random() * pool.length)].name);
      // Slows down towards the end.
      setTimeout(tick, 50 + (1 - left / ROLL_MS) * 180);
    };
    tick();
  }

  const running = status === "open" || status === "closed";
  const shown = filter ? entrants.filter((e) => e.name.toLowerCase().includes(filter.toLowerCase())) : entrants;
  const subs = entrants.filter((e) => e.sub).length;

  return (
    <div className="rf">
      <form className="card rf__setup" onSubmit={start}>
        <div className="rf__fields">
          <label className="rf__field">
            <span>Twitch channel</span>
            <input
              value={channel}
              onChange={(e) => setChannel(e.target.value)}
              placeholder="channel name"
              autoCapitalize="none"
              autoCorrect="off"
              spellCheck={false}
              disabled={running || status === "connecting"}
            />
          </label>
          <label className="rf__field">
            <span>Keyword <small>(blank = any message)</small></span>
            <input
              value={keyword}
              onChange={(e) => setKeyword(e.target.value.replace(/\s/g, ""))}
              placeholder="!enter"
              spellCheck={false}
              maxLength={40}
            />
          </label>
          <label className="rf__field">
            <span>Sub luck</span>
            <select value={subLuck} onChange={(e) => setSubLuck(Number(e.target.value))}>
              <option value={1}>Same as everyone</option>
              <option value={2}>2× chance</option>
              <option value={3}>3× chance</option>
              <option value={5}>5× chance</option>
            </select>
          </label>
        </div>
        <div className="rf__opts">
          <label className={`bt__opt${subsOnly ? " is-on" : ""}`}>
            <input type="checkbox" checked={subsOnly} onChange={(e) => setSubsOnly(e.target.checked)} />
            <span>Subscribers only</span>
          </label>
          <label className={`bt__opt${excludeMods ? " is-on" : ""}`}>
            <input type="checkbox" checked={excludeMods} onChange={(e) => setExcludeMods(e.target.checked)} />
            <span>Leave out mods</span>
          </label>
        </div>
        <div className="rf__twitch">
          {auth ? (
            <>
              <label className={`bt__opt${post ? " is-on" : ""}`}>
                <input type="checkbox" checked={post} onChange={(e) => setPost(e.target.checked)} />
                <span>Post in chat as {auth.login}</span>
              </label>
              <span className="rf__muted">Announces when entries open and close, and who won.</span>
              <button className="rf__link" type="button" onClick={signOut} disabled={running}>Sign out</button>
            </>
          ) : clientId ? (
            <>
              <button className="chip rf__signin" type="button" onClick={signIn}>
                <svg viewBox="0 0 24 24" aria-hidden="true"><path fill="currentColor" d="M11.6 11.4V6.7h1.6v4.7h-1.6Zm4.3 0V6.7h1.6v4.7h-1.6ZM7 2 3.1 5.9v14.2h4.7V24l3.9-3.9h3.1L21.9 13V2H7Zm13.3 10.2-3.1 3.1h-3.2l-2.7 2.7v-2.7H7.8V3.6h12.5v8.6Z" /></svg>
                Sign in with Twitch to post in chat
              </button>
              <span className="rf__muted">Optional. Needed for the OBS overlay.</span>
            </>
          ) : null}
        </div>
        {authError && <p className="rf__note">{authError}</p>}

        <div className="rf__actions">
          {!running ? (
            <button className="btn-primary" type="submit" disabled={status === "connecting"}>
              {status === "connecting" ? "Connecting…" : "Start raffle"}
            </button>
          ) : (
            <>
              <span className={`rf__state rf__state--${status}`}>
                <span aria-hidden="true" />
                {status === "open" ? `Entries open in ${joined}'s chat` : "Entries closed"}
              </span>
              <button
                className="chip"
                type="button"
                onClick={() => {
                  const next = status === "open" ? "closed" : "open";
                  setStatus(next);
                  say(next === "open" ? openMessage(live.current) : CLOSED_MESSAGE);
                }}
              >
                {status === "open" ? "Close entries" : "Reopen entries"}
              </button>
              <button className="chip" type="button" onClick={reset}>New raffle</button>
            </>
          )}
        </div>
        {note && <p className="rf__note" role="status">{note}</p>}
      </form>

      <div className="rf__grid">
        <section className="card rf__entries" aria-labelledby="rf-entries">
          <div className="rf__head">
            <h2 id="rf-entries">
              Entries <span className="sec-count">{entrants.length}</span>
            </h2>
            {subs > 0 && <span className="rf__muted">{subs} {subs === 1 ? "sub" : "subs"}</span>}
          </div>
          {entrants.length > 8 && (
            <input className="rf__search" value={filter} onChange={(e) => setFilter(e.target.value)} placeholder="Find a name" />
          )}
          {entrants.length ? (
            <ul className="rf__list">
              {shown.map((e) => (
                <li key={e.id} className={winners.some((w) => w.id === e.id) ? "is-won" : ""}>
                  <Name person={e} />
                  <Badges person={e} />
                  <button
                    type="button"
                    className="rf__remove"
                    aria-label={`Remove ${e.name}`}
                    onClick={() => setEntrants((list) => list.filter((x) => x.id !== e.id))}
                  >
                    ×
                  </button>
                </li>
              ))}
            </ul>
          ) : (
            <p className="rf__empty">
              {running
                ? `Waiting for people to type ${keyword.trim() || "anything"} in chat…`
                : "Start a raffle and entries from chat show up here."}
            </p>
          )}
        </section>

        <section className={`card rf__winner${winner && !rolling ? " has-winner" : ""}`} aria-live="polite">
          {rolling ? (
            <p className="rf__rolling">{rolling}</p>
          ) : winner ? (
            <>
              <span className="rf__label">Winner{winners.length > 1 ? ` #${winners.length}` : ""}</span>
              <p className="rf__big">
                <Name person={winner} />
              </p>
              <p className="rf__muted">
                <Badges person={winner} /> drawn {since(now - winner.drawnAt)} ago
              </p>
              <div className="rf__chat">
                <span className="rf__label">What they&apos;ve said since</span>
                {winnerChat.length ? (
                  <ul>
                    {winnerChat.map((m, i) => (
                      <li key={i}>
                        <time>{since(m.at - winner.drawnAt)}</time> {m.text}
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p className="rf__muted">Nothing yet.</p>
                )}
              </div>
            </>
          ) : (
            <p className="rf__empty">The winner shows up here, with anything they say in chat after being drawn.</p>
          )}
          <div className="rf__actions">
            <button className="btn-primary" type="button" onClick={draw} disabled={!entrants.length || Boolean(rolling)}>
              {winner ? "Draw again" : "Draw a winner"}
            </button>
            {winner && !rolling && (
              <button className="chip" type="button" onClick={() => navigator.clipboard?.writeText(`@${winner.name}`)}>
                Copy @{winner.name}
              </button>
            )}
          </div>
          {winners.length > 1 && (
            <p className="rf__muted rf__past">Earlier: {winners.slice(0, -1).map((w) => w.name).join(", ")}</p>
          )}
        </section>
      </div>

      <OverlayLink auth={auth} channel={joined || cleanChannel(channel)} />

      {history.length > 0 && (
        <section className="card rf__history" aria-labelledby="rf-history">
          <div className="rf__head">
            <h2 id="rf-history">Past raffles</h2>
            <button
              className="rf__link"
              type="button"
              onClick={() => {
                if (!window.confirm("Clear your raffle history?")) return;
                store.set(HISTORY_KEY, null);
                setHistory([]);
              }}
            >
              Clear
            </button>
          </div>
          <ul>
            {history.map((h) => (
              <li key={h.at}>
                <span className="rf__name" style={h.color ? { color: h.color } : undefined}>{h.winner}</span>
                <span className="rf__muted">
                  {h.channel} · {h.keyword || "any message"} · {h.entries} {h.entries === 1 ? "entry" : "entries"}
                </span>
                <time className="rf__muted" dateTime={new Date(h.at).toISOString()}>
                  {new Date(h.at).toLocaleString(undefined, { dateStyle: "medium", timeStyle: "short" })}
                </time>
              </li>
            ))}
          </ul>
          <p className="rf__muted rf__past">Saved in this browser only.</p>
        </section>
      )}
    </div>
  );
}

// A link for an OBS browser source that follows this raffle through chat.
function OverlayLink({ auth, channel }) {
  const [copied, setCopied] = useState(false);
  const [origin, setOrigin] = useState("");
  useEffect(() => setOrigin(window.location.origin), []);
  if (!auth) return null;
  const url = `${origin}/raffle/overlay?channel=${channel || "yourchannel"}&by=${auth.login}`;
  return (
    <section className="card rf__overlay" aria-labelledby="rf-overlay">
      <div className="rf__head">
        <h2 id="rf-overlay">OBS overlay</h2>
      </div>
      <p className="rf__muted">
        Add this as a Browser source in OBS (800 × 300). It shows the raffle on stream: entries open, how many have
        joined, and the winner. It follows the announcements this page posts in chat, so keep &ldquo;Post in
        chat&rdquo; on.
      </p>
      <div className="rf__copyrow">
        <code>{url}</code>
        <button
          className="chip"
          type="button"
          onClick={() => navigator.clipboard?.writeText(url).then(() => {
            setCopied(true);
            setTimeout(() => setCopied(false), 1500);
          })}
        >
          {copied ? "Copied" : "Copy"}
        </button>
      </div>
    </section>
  );
}
