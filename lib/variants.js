// lib/variants.js
// Spelling variants of a word, for blocked-term lists: number/symbol swaps
// (sc4m), spacing (s c a m), look-alike letters from other alphabets (ѕсаm)
// and doubled letters (scaam). Plus one regex that catches all of them.

export const LEET = {
  a: ["4", "@"],
  b: ["8"],
  e: ["3"],
  g: ["9"],
  i: ["1", "!"],
  l: ["1"],
  o: ["0"],
  s: ["5", "$"],
  t: ["7"],
  z: ["2"],
};

// Cyrillic and other letters that look like Latin ones.
export const LOOKALIKE = {
  a: "а",
  c: "с",
  e: "е",
  i: "і",
  j: "ј",
  k: "к",
  o: "о",
  p: "р",
  s: "ѕ",
  x: "х",
  y: "у",
};

const SEPARATORS = [" ", ".", "-", "_"];

const unique = (list) => [...new Set(list.filter(Boolean))];

export function variantsFor(rawWord, { leet = true, spacing = true, lookalike = true, doubled = false, wildcard = false, max = 60 } = {}) {
  const word = String(rawWord || "").trim().toLowerCase();
  if (!word) return [];
  const chars = [...word];
  const out = [word];

  if (leet) {
    // Each single swap, then every swappable letter swapped at once.
    chars.forEach((c, i) => {
      for (const alt of LEET[c] || []) out.push([...chars.slice(0, i), alt, ...chars.slice(i + 1)].join(""));
    });
    out.push(chars.map((c) => LEET[c]?.[0] || c).join(""));
    out.push(chars.map((c) => LEET[c]?.[1] || LEET[c]?.[0] || c).join(""));
  }
  if (spacing && chars.length > 1 && !word.includes(" ")) {
    for (const sep of SEPARATORS) out.push(chars.join(sep));
  }
  if (lookalike) {
    out.push(chars.map((c) => LOOKALIKE[c] || c).join(""));
    chars.forEach((c, i) => {
      if (LOOKALIKE[c]) out.push([...chars.slice(0, i), LOOKALIKE[c], ...chars.slice(i + 1)].join(""));
    });
  }
  if (doubled) {
    chars.forEach((c, i) => {
      if (/[a-z]/.test(c)) out.push([...chars.slice(0, i + 1), c, ...chars.slice(i + 1)].join(""));
    });
  }

  let list = unique(out).slice(0, max);
  if (wildcard) list = list.map((v) => (v.includes(" ") ? v : `*${v}*`));
  return list;
}

// Characters that mean something inside a regex character class.
const escapeClass = (c) => c.replace(/[\\\]\[^-]/g, "\\$&");

// One case-insensitive regex (Discord AutoMod flavour) matching the word with
// any of the swaps above, repeated letters, and junk between letters.
export function regexFor(rawWord) {
  const word = String(rawWord || "").trim().toLowerCase();
  // Letters and digits only: spaces and punctuation are covered by the junk
  // allowed between letters, so "k-pop" also catches "kpop" and "k pop".
  const chars = [...word].filter((c) => /[\p{L}\p{N}]/u.test(c));
  if (!chars.length) {
    // A symbols-only term ("$$$"): match it literally.
    return word ? `(?i)${[...word].filter((c) => c !== " ").map((c) => `[${escapeClass(c)}]`).join("")}` : "";
  }
  const parts = chars.map((c) => {
    const options = unique([c, ...(LEET[c] || []), LOOKALIKE[c]]);
    const body = options.length === 1 && /[a-z0-9]/.test(c) ? c : `[${options.map(escapeClass).join("")}]`;
    return body;
  });
  // Every letter but the last may repeat with junk between repeats
  // (s.c.a.a.m); junk is also allowed between letters.
  const last = parts.pop();
  return `(?i)${parts.map((b) => `(?:${b}[\\W_]*)+`).join("")}${last}+`;
}

const escapeRegex = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

// Where a word-list term matches in a message, like Twitch Blocked Terms and
// Discord keyword lists: whole words unless the term uses * wildcards.
function termMatches(message, term) {
  const starts = term.startsWith("*");
  const ends = term.endsWith("*");
  const core = escapeRegex(term.replace(/^\*|\*$/g, ""));
  if (!core) return [];
  const re = new RegExp(`${starts ? "" : "(?<![\\p{L}\\p{N}])"}${core}${ends ? "" : "(?![\\p{L}\\p{N}])"}`, "giu");
  return [...message.matchAll(re)].map((m) => [m.index, m.index + m[0].length]);
}

function regexMatches(message, pattern) {
  try {
    const re = new RegExp(pattern.replace(/^\(\?i\)/, ""), "giu");
    return [...message.matchAll(re)].filter((m) => m[0]).map((m) => [m.index, m.index + m[0].length]);
  } catch {
    return [];
  }
}

// Tests a chat message against blocked terms and regexes.
// Returns { caught, byTerm: [{ term, ranges }], byRegex: [{ word, ranges }], ranges }.
export function testMessage(message, { terms = [], regexes = [] } = {}) {
  const text = String(message || "");
  const byTerm = terms.map((term) => ({ term, ranges: termMatches(text, term) })).filter((t) => t.ranges.length);
  const byRegex = regexes.map(({ word, pattern }) => ({ word, ranges: regexMatches(text, pattern) })).filter((r) => r.ranges.length);
  // Merged ranges, for highlighting.
  const all = [...byTerm, ...byRegex].flatMap((x) => x.ranges).sort((a, b) => a[0] - b[0]);
  const ranges = [];
  for (const r of all) {
    const last = ranges[ranges.length - 1];
    if (last && r[0] <= last[1]) last[1] = Math.max(last[1], r[1]);
    else ranges.push([...r]);
  }
  return { caught: ranges.length > 0, byTerm, byRegex, ranges };
}
