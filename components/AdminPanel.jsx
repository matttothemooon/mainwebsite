"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { hasKnownIcon } from "@/lib/icons";
import { cardMeta, cardTitle } from "./Experience";
import IconPreview from "./IconPreview";

const BLANK_ENTRY = {
  role: "",
  name: "",
  url: "",
  date: "",
  twitch: "",
  avatar: "",
  followers: null,
};

const BLANK_LINK = { label: "", url: "", iconUrl: "" };

function move(list, index, delta) {
  const target = index + delta;
  if (target < 0 || target >= list.length) return list;
  const next = [...list];
  [next[index], next[target]] = [next[target], next[index]];
  return next;
}

export default function AdminPanel() {
  const [state, setState] = useState("loading"); // loading | signin | ready | error
  const [message, setMessage] = useState("loading…");
  const [profile, setProfile] = useState(null);
  const [twitchEnabled, setTwitchEnabled] = useState(false);
  const [devBypass, setDevBypass] = useState(false);
  const [status, setStatus] = useState({ text: "", kind: "" });
  const [dirty, setDirty] = useState(false);
  const [saving, setSaving] = useState(false);

  /* ---------- load ---------- */

  useEffect(() => {
    (async () => {
      try {
        const res = await fetch("/api/admin/profile");
        if (res.status === 401) {
          setState("signin");
          return;
        }
        if (!res.ok) throw new Error(`could not load profile (${res.status})`);

        const data = await res.json();
        setProfile(data.profile);
        setTwitchEnabled(Boolean(data.twitchEnabled));
        setDevBypass(Boolean(data.devAuthBypass));
        setState("ready");
      } catch (err) {
        setMessage(err.message);
        setState("error");
      }
    })();
  }, []);

  useEffect(() => {
    if (!dirty) return;
    const warn = (e) => e.preventDefault();
    window.addEventListener("beforeunload", warn);
    return () => window.removeEventListener("beforeunload", warn);
  }, [dirty]);

  /* ---------- mutation helpers ---------- */

  const edit = useCallback((mutate) => {
    setProfile((prev) => mutate(structuredClone(prev)));
    setDirty(true);
    setStatus({ text: "unsaved changes", kind: "" });
  }, []);

  const setField = (key) => (e) => edit((p) => ({ ...p, [key]: e.target.value }));

  const patchLink = (i, patch) =>
    edit((p) => {
      p.links[i] = { ...p.links[i], ...patch };
      return p;
    });

  const patchEntry = (group, i, patch) =>
    edit((p) => {
      p.experience[group][i] = { ...p.experience[group][i], ...patch };
      return p;
    });

  /* ---------- save ---------- */

  async function save() {
    setSaving(true);
    setStatus({ text: "saving…", kind: "" });

    // Strip empty rows rather than saving blanks the homepage would skip.
    const payload = {
      ...profile,
      links: profile.links.filter((l) => l.label.trim() && l.url.trim()),
      experience: {
        active: profile.experience.active.filter((e) => e.name.trim()),
        past: profile.experience.past.filter((e) => e.name.trim()),
      },
    };

    try {
      const res = await fetch("/api/admin/profile", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "save failed");

      // Re-render from what the server actually stored, so any value it
      // rejected or normalised is visible straight away.
      setProfile(data.profile);
      setDirty(false);
      setStatus({ text: "saved.", kind: "ok" });
    } catch (err) {
      setStatus({ text: err.message, kind: "err" });
    } finally {
      setSaving(false);
    }
  }

  /* ---------- render ---------- */

  if (state === "loading" || state === "error") {
    return (
      <Shell>
        <p className="bio">{state === "loading" ? "loading…" : message}</p>
      </Shell>
    );
  }

  if (state === "signin") {
    return (
      <Shell>
        <p className="bio">sign in to edit this site</p>
        <div className="signin">
          <a className="btn" href="/api/auth/login">
            sign in with discord
          </a>
          <p className="signin-note">
            Only Discord accounts on the allowlist can edit this site.
          </p>
        </div>
      </Shell>
    );
  }

  return (
    <Shell>
      <p className="bio">edit everything on the homepage</p>

      {devBypass && (
        <div className="dev-banner">
          local dev — auth bypassed, saving to <code>.dev-profile.json</code>
        </div>
      )}

      <section className="section">
        <h2 className="section__title">profile</h2>
        <div className="field">
          <label htmlFor="f-name">display name</label>
          <input id="f-name" maxLength={60} value={profile.name} onChange={setField("name")} />
        </div>
        <div className="field">
          <label htmlFor="f-bio">bio</label>
          <textarea id="f-bio" maxLength={280} value={profile.bio} onChange={setField("bio")} />
        </div>
      </section>

      <section className="section">
        <h2 className="section__title">links</h2>
        <p className="hint" style={{ marginBottom: "var(--gap-sm)" }}>
          Links show as icons only. The label is not displayed — it names the link
          for screen readers and picks the icon when the URL has no domain to read
          (like <code>/discord</code>).
        </p>

        {profile.links.map((link, i) => (
          <LinkRow
            key={i}
            link={link}
            onChange={(patch) => patchLink(i, patch)}
            onMove={(d) => edit((p) => ({ ...p, links: move(p.links, i, d) }))}
            onRemove={() => edit((p) => ({ ...p, links: p.links.filter((_, j) => j !== i) }))}
            onStatus={setStatus}
          />
        ))}

        <button className="btn" onClick={() => edit((p) => ({ ...p, links: [...p.links, { ...BLANK_LINK }] }))}>
          + add link
        </button>
      </section>

      {["active", "past"].map((group) => (
        <section className="section" key={group}>
          <h2 className="section__title">mod experience — {group}</h2>

          {profile.experience[group].map((entry, i) => (
            <EntryCard
              key={i}
              entry={entry}
              twitchEnabled={twitchEnabled}
              onChange={(patch) => patchEntry(group, i, patch)}
              onMove={(d) =>
                edit((p) => {
                  p.experience[group] = move(p.experience[group], i, d);
                  return p;
                })
              }
              onRemove={() =>
                edit((p) => {
                  p.experience[group] = p.experience[group].filter((_, j) => j !== i);
                  return p;
                })
              }
              onStatus={setStatus}
            />
          ))}

          <button
            className="btn"
            onClick={() =>
              edit((p) => {
                p.experience[group] = [...p.experience[group], { ...BLANK_ENTRY }];
                return p;
              })
            }
          >
            + add entry
          </button>
        </section>
      ))}

      <div className="savebar">
        <button className="btn" onClick={save} disabled={saving}>
          save changes
        </button>
        <span className={`status-msg${status.kind ? ` status-msg--${status.kind}` : ""}`}>
          {status.text}
        </span>
        <a
          href="/api/auth/logout"
          style={{ marginLeft: "auto", color: "var(--text-dim)", fontSize: "0.8rem" }}
        >
          sign out
        </a>
      </div>
    </Shell>
  );
}

function Shell({ children }) {
  return (
    <div className="terminal admin-wrap">
      <div className="terminal__bar">
        <span />
        <span />
        <span />
      </div>
      <main className="terminal__content">
        <h1>admin</h1>
        {children}
      </main>
    </div>
  );
}

/* ---------- links ---------- */

function LinkRow({ link, onChange, onMove, onRemove, onStatus }) {
  const fileRef = useRef(null);
  const [uploading, setUploading] = useState(false);
  const known = hasKnownIcon(link);

  async function upload(file) {
    if (!file) return;
    setUploading(true);
    onStatus({ text: `uploading ${file.name}…`, kind: "" });

    try {
      const body = new FormData();
      body.append("file", file);

      const res = await fetch("/api/admin/upload", { method: "POST", body });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "upload failed");

      onChange({ iconUrl: data.url });
      onStatus({ text: "icon uploaded — remember to save", kind: "ok" });
    } catch (err) {
      onStatus({ text: err.message, kind: "err" });
    } finally {
      setUploading(false);
      if (fileRef.current) fileRef.current.value = "";
    }
  }

  return (
    <div className="link-row">
      <div className="link-row__top">
        <IconPreview link={link} />
        <input
          placeholder="label (not shown)"
          aria-label="link label"
          maxLength={60}
          value={link.label}
          onChange={(e) => onChange({ label: e.target.value })}
        />
        <input
          placeholder="https://… or /path"
          aria-label="link url"
          maxLength={500}
          value={link.url}
          onChange={(e) => onChange({ url: e.target.value })}
        />
        <button className="btn btn--icon" title="move up" onClick={() => onMove(-1)}>
          ↑
        </button>
        <button className="btn btn--icon" title="move down" onClick={() => onMove(1)}>
          ↓
        </button>
        <button className="btn btn--icon btn--danger" title="remove" onClick={onRemove}>
          ×
        </button>
      </div>

      <div className="link-row__icon">
        <input
          ref={fileRef}
          type="file"
          accept="image/png,image/jpeg,image/webp,image/gif,image/svg+xml"
          style={{ display: "none" }}
          onChange={(e) => upload(e.target.files?.[0])}
        />
        <button className="btn" disabled={uploading} onClick={() => fileRef.current?.click()}>
          {uploading ? "uploading…" : link.iconUrl ? "replace icon" : "upload icon"}
        </button>

        {link.iconUrl && (
          <button className="btn btn--icon" onClick={() => onChange({ iconUrl: "" })}>
            use auto icon
          </button>
        )}

        <p className="hint">
          {link.iconUrl
            ? "using your uploaded icon — recoloured white to match the set"
            : known
              ? "icon detected automatically"
              : "no icon for this link — upload one, or it shows the generic link glyph"}
        </p>
      </div>
    </div>
  );
}

/* ---------- experience ---------- */

function EntryCard({ entry, twitchEnabled, onChange, onMove, onRemove, onStatus }) {
  const [fetching, setFetching] = useState(false);

  async function autofill() {
    const login = (entry.twitch || "").trim();
    if (!login) return onStatus({ text: "enter a twitch name first", kind: "err" });

    setFetching(true);
    onStatus({ text: `looking up ${login}…`, kind: "" });

    try {
      const res = await fetch(`/api/admin/twitch?login=${encodeURIComponent(login)}`);
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "lookup failed");

      const patch = { twitch: data.twitch, avatar: data.avatar };
      if (!entry.name) patch.name = data.name;
      if (Number.isFinite(data.followers)) patch.followers = data.followers;
      onChange(patch);

      onStatus({
        text: Number.isFinite(data.followers)
          ? "pulled avatar, name and follower count"
          : "pulled avatar and name — enter the follower count manually",
        kind: "ok",
      });
    } catch (err) {
      onStatus({ text: err.message, kind: "err" });
    } finally {
      setFetching(false);
    }
  }

  const text = (key) => (e) => onChange({ [key]: e.target.value });

  const followers = (e) => {
    const n = parseInt(e.target.value, 10);
    onChange({ followers: Number.isFinite(n) && n >= 0 ? n : null });
  };

  // Built from the card's own helpers rather than re-deciding what it shows.
  const bits = [cardTitle(entry), cardMeta(entry)].filter(Boolean);

  return (
    <div className="entry">
      <div className="entry__head">
        <span className="entry__title">{entry.name || "(new entry)"}</span>
        <div className="entry__actions">
          <button className="btn btn--icon" title="move up" onClick={() => onMove(-1)}>
            ↑
          </button>
          <button className="btn btn--icon" title="move down" onClick={() => onMove(1)}>
            ↓
          </button>
          <button className="btn btn--icon btn--danger" title="remove" onClick={onRemove}>
            ×
          </button>
        </div>
      </div>

      <div className="grid">
        <Field label="name" value={entry.name} onChange={text("name")} maxLength={60} placeholder="ChubsC" />
        <Field label="role" value={entry.role} onChange={text("role")} maxLength={60} placeholder="Admin" />
        <Field label="date" value={entry.date} onChange={text("date")} maxLength={60} placeholder="present" />
        <Field
          label="follower count"
          type="number"
          value={entry.followers ?? ""}
          onChange={followers}
          placeholder="e.g. 125000"
        />

        <div className="twitch-row">
          <Field
            label="twitch name"
            value={entry.twitch}
            onChange={text("twitch")}
            maxLength={30}
            placeholder="chubsc"
          />
          <button
            className="btn"
            onClick={autofill}
            disabled={!twitchEnabled || fetching}
            title={
              twitchEnabled
                ? "look this channel up on Twitch"
                : "Set TWITCH_CLIENT_ID / TWITCH_CLIENT_SECRET to enable lookup"
            }
          >
            {fetching ? "…" : "fetch"}
          </button>
        </div>

        <Field
          label="link url"
          value={entry.url}
          onChange={text("url")}
          maxLength={500}
          placeholder="https://twitch.tv/chubsc"
          full
        />
        <Field
          label="profile picture url"
          value={entry.avatar}
          onChange={text("avatar")}
          maxLength={500}
          placeholder="https://…"
          full
        />
      </div>

      <div className="preview">
        {entry.avatar && (
          // eslint-disable-next-line @next/next/no-img-element -- admin-supplied URL
          <img className="preview__avatar" src={entry.avatar} alt="" />
        )}
        <span className="preview__text">
          {bits.length
            ? `hover card: ${bits.join(" · ")}`
            : "hover card appears once this entry has a name"}
        </span>
      </div>

      <p className="hint">
        {twitchEnabled
          ? '"fetch" pulls the avatar and display name from Twitch. Twitch no longer serves other channels\' follower counts to apps, so that number usually has to be typed in.'
          : "Fill these in by hand, or set TWITCH_CLIENT_ID / TWITCH_CLIENT_SECRET to enable Twitch lookup."}
      </p>
    </div>
  );
}

function Field({ label, full, ...props }) {
  const id = `f-${label.replace(/\s+/g, "-")}-${useRef(Math.random().toString(36).slice(2, 8)).current}`;

  return (
    <div className={`field${full ? " grid--full" : ""}`}>
      <label htmlFor={id}>{label}</label>
      <input id={id} {...props} />
    </div>
  );
}
