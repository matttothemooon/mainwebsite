"use client";

import { useEffect, useRef, useState } from "react";

export default function HasteEditor({ initial = "", initialLanguage = "auto", languages, expiries, defaultExpiry, maxBytes, configured }) {
  const [content, setContent] = useState(initial);
  const [language, setLanguage] = useState(initialLanguage);
  const [expiry, setExpiry] = useState(defaultExpiry);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const area = useRef(null);
  const bytes = new TextEncoder().encode(content).length;
  const tooBig = bytes > maxBytes;

  async function save() {
    if (saving || !content.trim() || tooBig || !configured) return;
    setSaving(true);
    setError("");
    try {
      const res = await fetch("/api/haste", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content, language, expiry }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || "Could not save the paste.");
      window.location.href = data.url;
    } catch (err) {
      setError(err.message);
      setSaving(false);
    }
  }

  // Ctrl/Cmd+S saves.
  const saveRef = useRef(save);
  saveRef.current = save;
  useEffect(() => {
    const onKey = (e) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "s") {
        e.preventDefault();
        saveRef.current();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  useEffect(() => {
    area.current?.focus();
  }, []);

  // Tab indents instead of leaving the box (Esc then Tab still moves focus on).
  const escaped = useRef(false);
  function onKeyDown(e) {
    if (e.key === "Escape") {
      escaped.current = true;
      return;
    }
    if (e.key !== "Tab" || escaped.current) {
      escaped.current = false;
      return;
    }
    e.preventDefault();
    const el = e.currentTarget;
    const { selectionStart: s, selectionEnd: end } = el;
    const next = `${content.slice(0, s)}  ${content.slice(end)}`;
    setContent(next);
    requestAnimationFrame(() => el.setSelectionRange(s + 2, s + 2));
  }

  const kb = (n) => (n < 1024 ? `${n} B` : `${(n / 1024).toFixed(1)} KB`);

  return (
    <div className="haste-editor">
      <div className="haste-bar">
        <span className="haste-bar__title">New paste</span>
        <div className="haste-bar__controls">
          <label>
            <span className="sr-only">Language</span>
            <select value={language} onChange={(e) => setLanguage(e.target.value)}>
              {Object.entries(languages).map(([value, label]) => (
                <option key={value} value={value}>{label}</option>
              ))}
            </select>
          </label>
          <label>
            <span className="sr-only">Expires after</span>
            <select value={expiry} onChange={(e) => setExpiry(e.target.value)}>
              {Object.entries(expiries).map(([value, label]) => (
                <option key={value} value={value}>Expires in {label}</option>
              ))}
            </select>
          </label>
          <button className="btn-primary" type="button" onClick={save} disabled={saving || !content.trim() || tooBig || !configured}>
            {saving ? "Saving…" : "Save"}
          </button>
        </div>
      </div>

      {!configured && (
        <p className="haste-note">Pastes aren&apos;t switched on for this site yet.</p>
      )}

      <textarea
        ref={area}
        className="haste-input"
        value={content}
        onChange={(e) => setContent(e.target.value)}
        onKeyDown={onKeyDown}
        placeholder="Paste or type something, then press Save (Ctrl+S)."
        spellCheck={false}
        autoCapitalize="off"
        autoComplete="off"
        aria-label="Paste content"
      />

      <div className="haste-foot">
        <span className={tooBig ? "haste-foot__over" : undefined}>
          {kb(bytes)} of {kb(maxBytes)}
        </span>
        {error ? <span className="haste-foot__error" role="alert">{error}</span> : <span>Anyone with the link can view it.</span>}
      </div>
    </div>
  );
}
