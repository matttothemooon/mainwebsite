"use client";

import { useState } from "react";

const CATEGORIES = [
  "Moderation",
  "Community management",
  "Streaming and content",
  "Collaboration",
  "Other",
];

export default function ContactForm() {
  const [sending, setSending] = useState(false);
  const [status, setStatus] = useState("");
  const [message, setMessage] = useState("");

  async function submit(event) {
    event.preventDefault();
    setSending(true);
    setStatus("");

    const form = event.currentTarget;
    const fields = new FormData(form);
    try {
      const response = await fetch("/api/contact", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: fields.get("name"),
          email: fields.get("email"),
          category: fields.get("category"),
          message: fields.get("message"),
          website: fields.get("website"),
        }),
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || "Could not send your message.");
      form.reset();
      setMessage("");
      setStatus("Message sent. Thanks for reaching out.");
    } catch (error) {
      setStatus(error.message || "Could not send your message. Please try again.");
    } finally {
      setSending(false);
    }
  }

  return (
    <form className="tw-contact__form" id="contact-form" onSubmit={submit}>
      <div className="tw-contact__row">
        <label>
          <span className="tw-contact__label-title">Your Name <span className="tw-contact__required" aria-hidden="true">*</span></span>
          <input name="name" type="text" autoComplete="name" maxLength={100} required />
        </label>
        <label>
          <span className="tw-contact__label-title">Email <span className="tw-contact__required" aria-hidden="true">*</span></span>
          <input name="email" type="email" autoComplete="email" maxLength={254} required />
        </label>
      </div>
      <label>
        <span className="tw-contact__label-title">Category <span className="tw-contact__required" aria-hidden="true">*</span></span>
        <select name="category" defaultValue="" required>
          <option value="" disabled>Select a category</option>
          {CATEGORIES.map((category) => <option key={category}>{category}</option>)}
        </select>
      </label>
      <label>
        <span className="tw-contact__message-label">
          <span>Message <span className="tw-contact__required" aria-hidden="true">*</span></span>
          <span className="tw-contact__count" aria-live="polite">{message.length}/400</span>
        </span>
        <textarea
          name="message"
          rows={5}
          maxLength={400}
          value={message}
          onChange={(event) => setMessage(event.target.value)}
          required
        />
      </label>
      <label className="tw-contact__honeypot" aria-hidden="true">
        Leave this field empty
        <input name="website" type="text" tabIndex={-1} autoComplete="off" />
      </label>
      <button className="tw-contact__submit" type="submit" disabled={sending}>
        <span aria-hidden="true">➤</span>
        {sending ? "Sending…" : "Send Message"}
      </button>
      <p className="tw-contact__status" role="status" aria-live="polite">{status}</p>
    </form>
  );
}
