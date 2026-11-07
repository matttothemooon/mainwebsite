"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { resolveIcon } from "@/lib/icons";
import { cardMeta, cardTitle } from "./Experience";
import IconPreview from "./IconPreview";

const BLANK_ENTRY = {
  role: "",
  name: "",
  description: "",
  url: "",
  discordUrl: "",
  date: "",
  twitch: "",
  avatar: "",
  followers: null,
};

const BLANK_LINK = { label: "", url: "", iconUrl: "" };
const BLANK_GEAR = { name: "", items: [] };
const BLANK_GEAR_ITEM = { label: "", value: "", url: "", imageUrl: "" };
const BLANK_PAGE = { title: "", slug: "", category: "", description: "", content: "", published: false };

function pageSlug(value) {
  return value
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 80)
    .replace(/-+$/g, "");
}

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
  const [me, setMe] = useState(null);
  const [activeSection, setActiveSection] = useState("profile");

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

        // Who is signed in. Cosmetic, so a failure here is ignored.
        fetch("/api/admin/me")
          .then((r) => (r.ok ? r.json() : null))
          .then((d) => d?.me && setMe(d.me))
          .catch(() => {});
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

  useEffect(() => {
    if (state !== "ready") return;
    const sections = ["profile", "links", "mods-active", "mods-past", "pages", "gear"]
      .map((id) => document.getElementById(id))
      .filter(Boolean);
    const observer = new IntersectionObserver(
      (entries) => {
        const visible = entries
          .filter((entry) => entry.isIntersecting)
          .sort((a, b) => a.boundingClientRect.top - b.boundingClientRect.top);
        if (visible[0]) {
          setActiveSection(
            visible[0].target.id === "mods-past" ? "mods-active" : visible[0].target.id,
          );
        }
      },
      { rootMargin: "-15% 0px -70% 0px" },
    );
    sections.forEach((section) => observer.observe(section));
    return () => observer.disconnect();
  }, [state]);

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

  const patchGear = (i, patch) =>
    edit((p) => {
      p.gear[i] = { ...p.gear[i], ...patch };
      return p;
    });

  const patchPage = (i, patch) =>
    edit((p) => {
      p.pages[i] = { ...p.pages[i], ...patch };
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
      gear: profile.gear
        .map((category) => ({
          ...category,
          items: category.items.filter((item) => item.label.trim() && item.value.trim()),
        }))
        .filter((category) => category.name.trim()),
      pages: profile.pages
        .filter((page) => page.title.trim())
        .map((page) => ({
          ...page,
          slug: page.slug.trim() || pageSlug(page.title),
        })),
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
      setStatus({ text: data.warning || "saved.", kind: data.warning ? "err" : "ok" });
    } catch (err) {
      setStatus({ text: err.message, kind: "err" });
    } finally {
      setSaving(false);
    }
  }

  // Ctrl/Cmd+S saves. Held in a ref so the listener always calls the latest
  // save() without being re-attached on every keystroke.
  const saveRef = useRef(save);
  saveRef.current = save;
  useEffect(() => {
    const onKey = (e) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "s") {
        e.preventDefault();
        if (profile) saveRef.current();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [profile]);

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
      <div className="admin-layout">
        <aside className="admin-sidebar">
          <a className="admin-sidebar__brand" href="/" aria-label="Mattothemoon home">
            <span className="admin-sidebar__brand-mark">M</span>
            <span>mattothemoon</span>
          </a>
          <nav className="admin-sidebar__nav" aria-label="Admin sections">
            <AdminNavLink
              href="#profile"
              icon="dashboard"
              active={activeSection === "profile"}
              onClick={() => setActiveSection("profile")}
            >
              Dashboard
            </AdminNavLink>
            <AdminNavLink
              href="#links"
              icon="socials"
              active={activeSection === "links"}
              onClick={() => setActiveSection("links")}
            >
              Socials &amp; icons
            </AdminNavLink>
            <AdminNavLink
              href="#mods-active"
              icon="mods"
              active={activeSection.startsWith("mods-")}
              onClick={() => setActiveSection("mods-active")}
            >
              Mod list
            </AdminNavLink>
            <AdminNavLink
              href="#pages"
              icon="guides"
              active={activeSection === "pages"}
              onClick={() => setActiveSection("pages")}
            >
              Guides
            </AdminNavLink>
            <AdminNavLink
              href="#gear"
              icon="gear"
              active={activeSection === "gear"}
              onClick={() => setActiveSection("gear")}
            >
              Gear
            </AdminNavLink>
          </nav>
          <div className="admin-sidebar__account">
            {me?.avatar ? (
              // eslint-disable-next-line @next/next/no-img-element -- Discord CDN avatar
              <img src={`https://cdn.discordapp.com/avatars/${me.id}/${me.avatar}.webp?size=64`} alt="" />
            ) : (
              <span className="admin-sidebar__avatar" aria-hidden="true" />
            )}
            <span className="admin-sidebar__account-name">{me?.name || "signed in"}</span>
            <a href="/api/auth/logout" aria-label="Sign out" title="Sign out">
              <AdminIcon name="signout" />
            </a>
          </div>
        </aside>

        <main className="admin-main">
          <header className="admin-header">
            <div>
              <p className="admin-eyebrow">SITE MANAGEMENT</p>
              <h1>Dashboard</h1>
              <p className="admin-header__description">
                Manage your profile, mod list, socials, and guides.
              </p>
            </div>
            <div className="admin-header__actions">
              <a className="btn" href="/" target="_blank" rel="noreferrer">view site</a>
              {dirty && (
                <button className="btn" type="button" onClick={() => window.location.reload()} disabled={saving}>
                  discard
                </button>
              )}
              <button className="btn btn--primary" type="button" onClick={save} disabled={saving || !dirty}>
                {saving ? "saving…" : "save changes"}
              </button>
            </div>
          </header>

          {devBypass && (
            <div className="dev-banner">
              local dev — auth bypassed, saving to <code>.dev-profile.json</code>
            </div>
          )}

      <section className="section" id="profile">
        <h2 className="section__title">profile</h2>
        <div className="field">
          <label htmlFor="f-name">display name</label>
          <input id="f-name" maxLength={60} value={profile.name} onChange={setField("name")} />
        </div>
        <div className="field">
          <label htmlFor="f-bio">bio</label>
          <textarea id="f-bio" maxLength={280} value={profile.bio} onChange={setField("bio")} />
        </div>
        <div className="field">
          <label htmlFor="f-about">about me</label>
          <textarea
            id="f-about"
            maxLength={600}
            value={profile.about || ""}
            onChange={setField("about")}
            placeholder="A little more about what you do, care about, and share here"
          />
        </div>
      </section>

      <section className="section" id="links">
        <h2 className="section__title">links</h2>
        <p className="hint" style={{ marginBottom: "var(--gap-sm)" }}>
          Links show an icon and label. The label also names the link for screen
          readers and picks the icon when the URL has no domain to read (like
          <code> /discord</code>).
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
        <section className="section" id={`mods-${group}`} key={group}>
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

      <section className="section" id="gear">
        <h2 className="section__title">what i use</h2>
        <p className="hint">Add, reorder, or remove guide sections and products.</p>
        {profile.gear.map((category, i) => (
          <GearCategory
            key={i}
            category={category}
            onChange={(patch) => patchGear(i, patch)}
            onMove={(d) => edit((p) => ({ ...p, gear: move(p.gear, i, d) }))}
            onRemove={() => edit((p) => ({ ...p, gear: p.gear.filter((_, j) => j !== i) }))}
            onStatus={setStatus}
          />
        ))}
        <button className="btn" onClick={() => edit((p) => ({ ...p, gear: [...p.gear, { ...BLANK_GEAR }] }))}>
          + add section
        </button>
      </section>

      <section className="section" id="pages">
        <h2 className="section__title">pages</h2>
        <p className="hint" style={{ marginBottom: "var(--gap-sm)" }}>
          Add guide pages or a simple resource list using Markdown links. Categories group published pages; drafts stay private until published.
        </p>
        {profile.pages.map((page, i) => (
          <div className="entry page-editor" key={`${page.slug}-${i}`}>
            <div className="entry__head">
              <span className="entry__title">{page.title || "(new page)"}</span>
              <div className="entry__actions">
                <button className="btn btn--icon" title="move up" onClick={() => edit((p) => ({ ...p, pages: move(p.pages, i, -1) }))}>↑</button>
                <button className="btn btn--icon" title="move down" onClick={() => edit((p) => ({ ...p, pages: move(p.pages, i, 1) }))}>↓</button>
                <button className="btn btn--icon btn--danger" title="remove page" onClick={() => edit((p) => ({ ...p, pages: p.pages.filter((_, j) => j !== i) }))}>×</button>
              </div>
            </div>
            <div className="grid">
              <Field
                label="page title"
                value={page.title}
                onChange={(e) => {
                  const title = e.target.value;
                  patchPage(i, { title, ...(!page.slug ? { slug: pageSlug(title) } : {}) });
                }}
                maxLength={100}
                placeholder="Moderation"
              />
              <Field
                label="URL slug"
                value={page.slug}
                onChange={(e) => patchPage(i, { slug: pageSlug(e.target.value) })}
                maxLength={80}
                placeholder="my-guide"
              />
              <Field
                label="guide category"
                value={page.category || ""}
                onChange={(e) => patchPage(i, { category: e.target.value })}
                maxLength={60}
                placeholder="Moderation"
              />
              <Field
                label="short description"
                value={page.description}
                onChange={(e) => patchPage(i, { description: e.target.value })}
                maxLength={300}
                full
                placeholder="A quick introduction to this page"
              />
              <div className="field grid--full">
                <label htmlFor={`page-content-${i}`}>page content</label>
                <textarea
                  id={`page-content-${i}`}
                  className="page-editor__content"
                  maxLength={20000}
                  value={page.content}
                  onChange={(e) => patchPage(i, { content: e.target.value })}
                  placeholder={"## What this page is about\n\nWrite your content here. You can use headings, **bold text**, links, and bullet lists."}
                />
                <p className="hint">
                  Supports Markdown headings, bold/italic text, links, images, quotes, and bullet lists.
                </p>
              </div>
              <label className="page-editor__published grid--full">
                <input
                  type="checkbox"
                  checked={page.published}
                  onChange={(e) => patchPage(i, { published: e.target.checked })}
                />
                publish this page
              </label>
            </div>
            {page.slug && (
              <p className="hint page-editor__url">
                URL: <a href={`/pages/${page.slug}`} target="_blank" rel="noreferrer">/pages/{page.slug}</a>
                {page.published ? " · published" : " · draft"}
              </p>
            )}
          </div>
        ))}
        <button
          className="btn"
          onClick={() => edit((p) => ({ ...p, pages: [...p.pages, { ...BLANK_PAGE }] }))}
        >
          + add page
        </button>
      </section>

      <div className="savebar">
        <button className="btn" onClick={save} disabled={saving}>
          save changes
        </button>
        <span className={`status-msg${status.kind ? ` status-msg--${status.kind}` : ""}`}>
          {status.text}
        </span>
      </div>
        </main>
      </div>
    </Shell>
  );
}

function Shell({ children }) {
  return (
    <div className="admin-wrap">{children}</div>
  );
}

function AdminNavLink({ href, icon, active, onClick, children }) {
  return (
    <a
      className={`admin-sidebar__link${active ? " is-active" : ""}`}
      href={href}
      onClick={onClick}
      aria-current={active ? "location" : undefined}
    >
      <AdminIcon name={icon} />
      <span>{children}</span>
    </a>
  );
}

function AdminIcon({ name }) {
  const paths = {
    dashboard: <><path d="m3 10 9-7 9 7" /><path d="M5 9v12h14V9M9 21v-7h6v7" /></>,
    socials: <><circle cx="18" cy="5" r="3" /><circle cx="6" cy="12" r="3" /><circle cx="18" cy="19" r="3" /><path d="m8.7 10.7 6.6-4.4m-6.6 7 6.6 4.4" /></>,
    mods: <><path d="M16 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" /><circle cx="10" cy="7" r="4" /><path d="M20 21v-2a4 4 0 0 0-3-3.9M16 3.1a4 4 0 0 1 0 7.8" /></>,
    guides: <><path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20" /><path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2Z" /></>,
    gear: <><circle cx="12" cy="12" r="3" /><path d="m19.4 15 .1.1 1.4 1.1-1.4 2.4-1.7-.7a8 8 0 0 1-1.7 1l-.3 1.8h-2.8l-.3-1.8a8 8 0 0 1-1.7-1l-1.7.7-1.4-2.4L7.3 15a8 8 0 0 1 0-2l-1.4-1.1 1.4-2.4 1.7.7a8 8 0 0 1 1.7-1l.3-1.8h2.8l.3 1.8a8 8 0 0 1 1.7 1l1.7-.7 1.4 2.4-1.4 1.1a8 8 0 0 1-.1 2Z" /></>,
    signout: <><path d="M10 17l5-5-5-5M15 12H3" /><path d="M12 3h7a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2h-7" /></>,
  };
  return (
    <svg aria-hidden="true" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">
      {paths[name]}
    </svg>
  );
}

/* ---------- links ---------- */

function LinkRow({ link, onChange, onMove, onRemove, onStatus }) {
  const fileRef = useRef(null);
  const [uploading, setUploading] = useState(false);
  const icon = resolveIcon(link);

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
            : icon.favicon
              ? "using this site's favicon automatically — upload an icon to override it"
              : "brand icon detected automatically"}
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
          label="role summary"
          value={entry.description || ""}
          onChange={text("description")}
          maxLength={280}
          placeholder="A short note about what you did in this role"
          full
        />
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
          label="twitch channel url"
          value={entry.url}
          onChange={text("url")}
          maxLength={500}
          placeholder="https://twitch.tv/chubsc"
          full
        />
        <Field
          label="discord server url"
          type="url"
          value={entry.discordUrl || ""}
          onChange={text("discordUrl")}
          maxLength={500}
          placeholder="https://discord.gg/…"
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

function GearCategory({ category, onChange, onMove, onRemove, onStatus }) {
  const [uploading, setUploading] = useState(null);
  const patchItem = (i, patch) => onChange({
    items: category.items.map((item, j) => (j === i ? { ...item, ...patch } : item)),
  });
  const uploadImage = async (i, file) => {
    if (!file) return;
    setUploading(i);
    onStatus({ text: `uploading ${file.name}…`, kind: "" });
    try {
      const body = new FormData();
      body.append("file", file);
      const res = await fetch("/api/admin/upload", { method: "POST", body });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "upload failed");
      patchItem(i, { imageUrl: data.url });
      onStatus({ text: "product image uploaded — remember to save", kind: "ok" });
    } catch (err) {
      onStatus({ text: err.message, kind: "err" });
    } finally {
      setUploading(null);
    }
  };
  const fetchImage = async (i) => {
    const item = category.items[i];
    if (!item.url) {
      onStatus({ text: "add a product link first", kind: "err" });
      return;
    }
    setUploading(i);
    onStatus({ text: "finding product image…", kind: "" });
    try {
      const res = await fetch("/api/admin/product-image", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url: item.url }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "could not find image");
      patchItem(i, { imageUrl: data.url });
      onStatus({ text: "product image found — remember to save", kind: "ok" });
    } catch (err) {
      onStatus({ text: err.message, kind: "err" });
    } finally {
      setUploading(null);
    }
  };

  return (
    <div className="entry gear-editor">
      <div className="entry__head">
        <span className="entry__title">{category.name || "(new section)"}</span>
        <div className="entry__actions">
          <button className="btn btn--icon" title="move up" onClick={() => onMove(-1)}>↑</button>
          <button className="btn btn--icon" title="move down" onClick={() => onMove(1)}>↓</button>
          <button className="btn btn--icon btn--danger" title="remove section" onClick={onRemove}>×</button>
        </div>
      </div>
      <Field label="section name" value={category.name} onChange={(e) => onChange({ name: e.target.value })} maxLength={80} placeholder="Gaming PC" />
      {category.items.map((item, i) => (
        <div className="gear-editor__item" key={i}>
          <Field label="label" value={item.label} onChange={(e) => patchItem(i, { label: e.target.value })} maxLength={80} placeholder="GPU" />
          <Field label="product" value={item.value} onChange={(e) => patchItem(i, { value: e.target.value })} maxLength={200} placeholder="Product name" />
          <Field label="product link" type="url" value={item.url || ""} onChange={(e) => patchItem(i, { url: e.target.value })} maxLength={500} placeholder="https://…" />
          <label className="gear-editor__upload">
            product image
            <input type="file" accept="image/png,image/jpeg,image/webp,image/gif" onChange={(e) => uploadImage(i, e.target.files?.[0])} />
            <span>{uploading === i ? "uploading…" : item.imageUrl ? "replace image" : "upload image"}</span>
          </label>
          <button className="btn" disabled={uploading === i} onClick={() => fetchImage(i)}>
            {uploading === i ? "finding…" : "pull from link"}
          </button>
          <button className="btn btn--icon btn--danger" title="remove product" onClick={() => onChange({ items: category.items.filter((_, j) => j !== i) })}>×</button>
        </div>
      ))}
      <button className="btn" onClick={() => onChange({ items: [...category.items, { ...BLANK_GEAR_ITEM }] })}>+ add product</button>
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
