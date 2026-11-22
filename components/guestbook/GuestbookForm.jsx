"use client";

import { useState } from "react";

export default function GuestbookForm({ maxName, maxMessage, configured }) {
  const [name, setName] = useState("");
  const [message, setMessage] = useState("");
  const [state, setState] = useState({ sending: false, error: "", sent: false });

  async function submit(e) {
    e.preventDefault();
    setState({ sending: true, error: "", sent: false });
    try {
      const res = await fetch("/api/guestbook", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, message, website: e.currentTarget.website.value }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || "Could not send your message.");
      setName("");
      setMessage("");
      setState({ sending: false, error: "", sent: true });
    } catch (err) {
      setState({ sending: false, error: err.message, sent: false });
    }
  }

  if (state.sent) {
    return (
      <div className="card gb-form gb-form--sent" role="status">
        <b>Thanks for signing!</b>
        <p>Your message will show up here once it&apos;s been approved.</p>
        <button className="chip" type="button" onClick={() => setState({ sending: false, error: "", sent: false })}>
          Write another
        </button>
      </div>
    );
  }

  return (
    <form className="card gb-form" onSubmit={submit}>
      <label className="gb-form__field">
        <span>Name</span>
        <input value={name} onChange={(e) => setName(e.target.value)} maxLength={maxName} required autoComplete="nickname" />
      </label>
      <label className="gb-form__field">
        <span className="gb-form__label-row">
          Message <small>{message.length}/{maxMessage}</small>
        </span>
        <textarea value={message} onChange={(e) => setMessage(e.target.value)} maxLength={maxMessage} rows={3} required />
      </label>
      <label className="gb-form__honeypot" aria-hidden="true">
        Leave empty <input name="website" tabIndex={-1} autoComplete="off" />
      </label>
      <div className="gb-form__actions">
        <button className="btn-primary" type="submit" disabled={state.sending || !configured}>
          {state.sending ? "Sending…" : "Sign the guestbook"}
        </button>
        <span className={state.error ? "gb-form__error" : "gb-form__note"} role={state.error ? "alert" : undefined}>
          {state.error || (configured ? "Messages appear after they're approved. No links." : "The guestbook isn't switched on yet.")}
        </span>
      </div>
    </form>
  );
}
