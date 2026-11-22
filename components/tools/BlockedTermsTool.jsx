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

export default function BlockedTermsTool() {
  const [input, setInput] = useState("");
  const [opts, setOpts] = useState({ leet: true, spacing: true, lookalike: true, doubled: false, wildcard: false });

  const words = useMemo(
    () => [...new Set(input.split(/[\n,]+/).map((w) => w.trim().toLowerCase()).filter(Boolean))].slice(0, 25),
    [input]
  );
  const terms = useMemo(() => [...new Set(words.flatMap((w) => variantsFor(w, opts)))], [words, opts]);
  const regexes = useMemo(() => words.map(regexFor).filter(Boolean), [words]);
  const longRegex = regexes.find((r) => r.length > 260);

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
              <div className="bt__copy">
                <Copy text={regexes.join("\n")} label="Copy regex" />
              </div>
            </div>
            <p className="bt__hint">
              One pattern per word that catches all of the above, plus repeated letters and junk between letters
              (s.c.a.a.m, $-c-4-m). Paste into Discord AutoMod&apos;s &ldquo;Regex patterns&rdquo; (up to 10 per rule, 260
              characters each).
            </p>
            {longRegex && <p className="bt__warn">One pattern is over Discord&apos;s 260-character limit; try a shorter word.</p>}
            <pre className="bt__regex">{regexes.join("\n")}</pre>
          </section>
        </>
      )}
    </div>
  );
}
