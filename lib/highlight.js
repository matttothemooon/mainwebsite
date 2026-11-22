// Server-side syntax highlighting for pastes. highlight.js escapes the code,
// so its HTML output is safe to insert.
import hljs from "highlight.js/lib/common";
import { LANGUAGES } from "./haste.js";

// Auto-detect only between the languages the editor offers; guessing from
// every language highlight.js knows mislabels short snippets (Python as SCSS).
const AUTO_SUBSET = Object.keys(LANGUAGES).filter((l) => l !== "auto" && l !== "plaintext" && hljs.getLanguage(l));

const AUTO_LIMIT = 64 * 1024; // auto-detecting very large pastes is slow

export function highlight(code, language = "auto") {
  try {
    if (language === "plaintext") return { html: escapeHtml(code), language: "plaintext" };
    if (language !== "auto" && hljs.getLanguage(language)) {
      return { html: hljs.highlight(code, { language, ignoreIllegals: true }).value, language };
    }
    if (code.length > AUTO_LIMIT) return { html: escapeHtml(code), language: "plaintext" };
    const result = hljs.highlightAuto(code, AUTO_SUBSET);
    return { html: result.value, language: result.language || "plaintext" };
  } catch {
    return { html: escapeHtml(code), language: "plaintext" };
  }
}

function escapeHtml(s) {
  return s.replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]);
}
