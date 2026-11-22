"use client";

import { useMemo, useState } from "react";

function CopyUsage({ text }) {
  const [done, setDone] = useState(false);
  return (
    <button
      type="button"
      className="cmd__copy"
      aria-label={`Copy ${text}`}
      onClick={async () => {
        try {
          await navigator.clipboard.writeText(text);
          setDone(true);
          setTimeout(() => setDone(false), 1200);
        } catch {}
      }}
    >
      {done ? "Copied" : "Copy"}
    </button>
  );
}

export default function CommandSheet({ commands, sources, groups }) {
  const [query, setQuery] = useState("");
  const [tool, setTool] = useState("all");

  const shown = useMemo(() => {
    const q = query.trim().toLowerCase();
    return commands.filter(
      (c) =>
        (tool === "all" || c.tool === tool) &&
        (!q || `${c.usage} ${c.what} ${c.group}`.toLowerCase().includes(q))
    );
  }, [commands, query, tool]);

  return (
    <div className="cmd">
      <div className="cmd__controls">
        <input
          type="search"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search: timeout, slow, nuke, title…"
          aria-label="Search commands"
        />
        <div className="cmd__tools" role="tablist" aria-label="Filter by tool">
          {[["all", "All"], ...Object.entries(sources).map(([k, v]) => [k, v.label])].map(([key, label]) => (
            <button key={key} type="button" role="tab" aria-selected={tool === key} className={`cmd__tool${tool === key ? " is-on" : ""}`} onClick={() => setTool(key)}>
              {label}
            </button>
          ))}
        </div>
      </div>

      {groups.map((group) => {
        const rows = shown.filter((c) => c.group === group);
        if (!rows.length) return null;
        return (
          <section key={group} className="cmd__group" aria-label={group}>
            <h2>{group}</h2>
            <ul>
              {rows.map((c) => (
                <li key={`${c.tool}-${c.usage}`} className="card cmd__row">
                  <div className="cmd__main">
                    <code>{c.usage}</code>
                    <p>{c.what}</p>
                  </div>
                  <div className="cmd__meta">
                    <span className={`cmd__badge cmd__badge--${c.tool}`}>{sources[c.tool].label}</span>
                    <span className="cmd__who">{c.who}</span>
                    <CopyUsage text={c.usage} />
                  </div>
                </li>
              ))}
            </ul>
          </section>
        );
      })}
      {!shown.length && <p className="sec-lede">No commands match &ldquo;{query}&rdquo;.</p>}
    </div>
  );
}
