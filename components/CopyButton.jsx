"use client";

import { useState } from "react";

export default function CopyButton({ url, disabled = false }) {
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState("");

  async function copy() {
    setError("");
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1800);
    } catch {
      setError("Couldn't copy it. You can select the URL and copy it instead.");
    }
  }

  return (
    <div className="overlay-hub__copy">
      <code>{url || "Enter a valid Twitch channel first"}</code>
      <button className="btn" type="button" onClick={copy} disabled={disabled}>
        {copied ? "copied" : "copy URL"}
      </button>
      {error && <span role="status">{error}</span>}
      {copied && <span className="sr-only" role="status">Overlay URL copied.</span>}
    </div>
  );
}
