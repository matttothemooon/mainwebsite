"use client";

import { useMemo, useState } from "react";
import { variantsFor, regexFor } from "@/lib/variants";

const OPTIONS = [
  ["leet", "Number & symbol swaps", "sc4m, $cam"],
  ["spacing", "Spaced out", "s c a m, s.c.a.m"],
  ["lookalike", "Look-alike letters", "ѕсаm (other alphabets)"],
  ["doubled", "Doubled letters", "scaam"],
  ["wildcard", "Wrap in * wildcards", "*scam* also catches scammer"],
];

function Copy({ text, label }) {
  const [done, setDone] = useState(false);
  return (
    <button
      type="button"
      className="chip"
      disabled={!text}
      onClick={async () => {
        try {
          await navigator.clipboard.writeText(text);
          setDone(true);
          setTimeout(() => setDone(false), 1500);
        } catch {}
      }}
    >
      {done ? "Copied" : label}
    </button>
  );
}

// The same pattern works in all three (checked against Rust regex, RE2 and
// PCRE2); they differ in how a regex is marked and where it goes.
const REGEX_TARGETS = {
  discord: {
    label: "Discord AutoMod",
    format: (re) => re,
    how: "Discord: Server Settings → AutoMod → a custom keyword rule → \u201cRegex patterns\u201d. Up to 10 patterns per rule, 260 characters each.",
  },
  fossabot: {
    label: "Fossabot",
    format: (re) => `regex:${re}`,
    how: "Fossabot: add each line as a blocked term or keyword phrase. The regex: prefix tells Fossabot it\u2019s a regex (its engine is RE2).",
  },
  chatterino: {
    label: "Chatterino",
    format: (re) => re,
    how: "Chatterino: Settings → Highlights (to spot it) or Ignores (to hide it), add a row per line and tick the regex option.",
  },
};

export default function BlockedTermsTool() {
  const [input, setInput] = useState("");
  const [target, setTarget] = useState("discord");
  const [opts, setOpts] = useState({ leet: true, spacing: true, lookalike: true, doubled: false, wildcard: false });

  const words = useMemo(
    () => [...new Set(input.split(/[\n,]+/).map((w) => w.trim().toLowerCase()).filter(Boolean))].slice(0, 25),
    [input]
  );
  const terms = useMemo(() => [...new Set(words.flatMap((w) => variantsFor(w, opts)))], [words, opts]);
  const regexes = useMemo(() => words.map(regexFor).filter(Boolean), [words]);
  const longRegex = regexes.find((r) => r.length > 260);
  const regexOut = regexes.map(REGEX_TARGETS[target].format).join("\n");

  return (
    <div className="bt">
      <div className="card bt__input">
        <label htmlFor="bt-words" className="bt__label">Words to block <small>one per line or comma-separated</small></label>
        <textarea
          id="bt-words"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          rows={4}
          placeholder={"scam\nfree nitro"}
          spellCheck={false}
          autoCapitalize="off"
        />
        <div className="bt__options" role="group" aria-label="Variants to include">
          {OPTIONS.map(([key, label, example]) => (
            <label key={key} className={`bt__opt${opts[key] ? " is-on" : ""}`}>
              <input type="checkbox" checked={opts[key]} onChange={(e) => setOpts({ ...opts, [key]: e.target.checked })} />
              <span>
                <b>{label}</b>
                <small>{example}</small>
              </span>
            </label>
          ))}
        </div>
      </div>

      {words.length > 0 && (
        <>
          <section className="card bt__out" aria-labelledby="bt-terms">
            <div className="bt__out-head">
              <h2 id="bt-terms">Terms <span className="sec-count">{terms.length}</span></h2>
              <div className="bt__copy">
                <Copy text={terms.join("\n")} label="Copy list" />
                <Copy text={terms.join(", ")} label="Copy comma-separated" />
              </div>
            </div>
            <p className="bt__hint">
              Twitch: Creator Dashboard → Settings → Moderation → Blocked Terms. Discord: Server Settings → AutoMod →
              Block Custom Words (paste the comma-separated list).
            </p>
            <ul className="bt__terms">
              {terms.map((t) =>
                /[^\x00-\x7f]/.test(t) ? (
                  <li key={t} className="is-lookalike" title="Uses look-alike letters from other alphabets">{t}</li>
                ) : (
                  <li key={t}>{t}</li>
                )
              )}
            </ul>
            {terms.some((t) => /[^\x00-\x7f]/.test(t)) && (
              <p className="bt__legend">Dashed ones look normal but use letters from other alphabets (like Cyrillic а, с, о).</p>
            )}
          </section>

          <section className="card bt__out" aria-labelledby="bt-regex">
            <div className="bt__out-head">
              <h2 id="bt-regex">Regex <span className="sec-count">{regexes.length}</span></h2>
              <div className="bt__tabs" role="tablist" aria-label="Where you'll use the regex">
                {Object.entries(REGEX_TARGETS).map(([key, t]) => (
                  <button
                    key={key}
                    type="button"
                    role="tab"
                    aria-selected={target === key}
                    className={`bt__tab${target === key ? " is-on" : ""}`}
                    onClick={() => setTarget(key)}
                  >
                    {t.label}
                  </button>
                ))}
              </div>
            </div>
            <p className="bt__hint">
              One pattern per word that catches all of the above, plus repeated letters and junk between letters
              (s.c.a.a.m, $-c-4-m). {REGEX_TARGETS[target].how}
            </p>
            {target === "discord" && longRegex && (
              <p className="bt__warn">One pattern is over Discord&apos;s 260-character limit; try a shorter word.</p>
            )}
            <pre className="bt__regex">{regexOut}</pre>
            <div className="bt__copy bt__copy--end">
              <Copy text={regexOut} label={`Copy for ${REGEX_TARGETS[target].label}`} />
            </div>
          </section>
        </>
      )}
    </div>
  );
}
