"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { resolveIcon } from "@/lib/icons";
import { cardMeta, cardTitle } from "@/lib/streamerCard";
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
const BLANK_SERVICE = { title: "", text: "" };
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
  const [twitchConnection, setTwitchConnection] = useState(null);
  const [followerCounts, setFollowerCounts] = useState(null);
  const [twitchCallbackUrl, setTwitchCallbackUrl] = useState("");
  const [discordConnection, setDiscordConnection] = useState(null);
  const [spotifyInfo, setSpotifyInfo] = useState(null); // { enabled, connection, callbackUrl }
  const [discordServers, setDiscordServers] = useState(null);
  const [photoCheck, setPhotoCheck] = useState(null); // { running, summary, problems }
  const [guestbookWaiting, setGuestbookWaiting] = useState(0);
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
        setTwitchConnection(data.twitchConnection || null);
        setFollowerCounts(data.followerCounts || null);
        setTwitchCallbackUrl(data.twitchCallbackUrl || "");
        setDiscordConnection(data.discordConnection || null);
        setDiscordServers(data.discordServers || null);
        setSpotifyInfo(data.spotify || null);

        // Result of coming back from Discord's or Twitch's sign-in page.
        const query = new URLSearchParams(window.location.search);
        const detail = query.get("detail");

        const discordOutcome = query.get("discord");
        const discordMessages = {
          connected: ["Discord connected. Your servers are listed under Discord servers.", "ok"],
          cancelled: ["Discord connection was cancelled.", "err"],
          expired: ["Discord connection took too long or came from another tab. Try again.", "err"],
          "signed-out": ["Your admin session ended. Sign in and try again.", "err"],
          error: ["Discord connection failed.", "err"],
          "not-configured": ["Discord login isn't configured on this deployment.", "err"],
        };
        if (discordMessages[discordOutcome]) {
          setStatus({
            text: discordMessages[discordOutcome][0] + (detail ? ` Reason: ${detail}` : ""),
            kind: discordMessages[discordOutcome][1],
          });
          window.history.replaceState(null, "", window.location.pathname + window.location.hash);
        }

        const spotifyOutcome = query.get("spotify");
        const spotifyMessages = {
          connected: ["Spotify connected. Your music now shows on the homepage.", "ok"],
          cancelled: ["Spotify sign-in was cancelled.", "err"],
          expired: ["Spotify sign-in took too long or came from another tab. Try again.", "err"],
          error: ["Spotify sign-in failed.", "err"],
          "not-configured": ["Set SPOTIFY_CLIENT_ID / SPOTIFY_CLIENT_SECRET in Vercel first.", "err"],
        };
        if (spotifyMessages[spotifyOutcome]) {
          setStatus({
            text: spotifyMessages[spotifyOutcome][0] + (detail ? ` Reason: ${detail}` : ""),
            kind: spotifyMessages[spotifyOutcome][1],
          });
          window.history.replaceState(null, "", window.location.pathname + window.location.hash);
        }

        const outcome = query.get("twitch");
        const messages = {
          connected: ["Twitch connected. Follower counts now update automatically.", "ok"],
          cancelled: ["Twitch sign-in was cancelled.", "err"],
          expired: ["Twitch sign-in took too long or came from another tab. Try again.", "err"],
          error: ["Twitch sign-in failed.", "err"],
          "not-configured": ["Set TWITCH_CLIENT_ID / TWITCH_CLIENT_SECRET first.", "err"],
        };
        if (messages[outcome]) {
          setStatus({
            text: messages[outcome][0] + (detail ? ` Reason: ${detail}` : ""),
            kind: messages[outcome][1],
          });
          window.history.replaceState(null, "", window.location.pathname + window.location.hash);
        }
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
    const sections = ["profile", "links", "mods-active", "mods-past", "discord", "work", "pages", "gear", "downloads", "apps", "faq", "guestbook", "haste"]
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

  const patchWork = (patch) =>
    edit((p) => ({ ...p, work: { ...p.work, ...patch } }));

  const patchService = (i, patch) =>
    edit((p) => {
      p.work.services[i] = { ...p.work.services[i], ...patch };
      return p;
    });

  const patchPage = (i, patch) =>
    edit((p) => {
      p.pages[i] = { ...p.pages[i], ...patch };
      return p;
    });

  // Checks every gear photo still loads and fills in missing or broken ones
  // from the product links. Changes are applied like any edit; saving is
  // still a separate step.
  async function recheckPhotos() {
    const items = [];
    profile.gear.forEach((category, ci) =>
      category.items.forEach((item, ii) => {
        if (item.value.trim()) items.push({ key: `${ci}:${ii}`, url: item.url, imageUrl: item.imageUrl, name: item.value });
      })
    );
    setPhotoCheck({ running: true, summary: `checking ${items.length} products…`, problems: [] });
    try {
      const res = await fetch("/api/admin/gear-photos", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ items: items.map(({ name, ...rest }) => rest) }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "photo check failed");

      const byKey = Object.fromEntries(items.map((i) => [i.key, i]));
      const updates = data.results.filter((r) => r.imageUrl);
      if (updates.length) {
        edit((p) => {
          for (const r of updates) {
            const [ci, ii] = r.key.split(":").map(Number);
            if (p.gear[ci]?.items[ii]) p.gear[ci].items[ii].imageUrl = r.imageUrl;
          }
          return p;
        });
      }
      const count = (s) => data.results.filter((r) => r.status === s).length;
      const found = count("found") + count("replaced");
      const problems = data.results
        .filter((r) => r.status === "missing" || r.status === "broken")
        .map((r) => ({ name: byKey[r.key]?.name, status: r.status }));
      setPhotoCheck({
        running: false,
        summary:
          `${count("ok")} fine, ${found} found` +
          (problems.length ? `, ${problems.length} still need a photo` : "") +
          (found ? " — remember to save" : ""),
        problems,
      });
    } catch (err) {
      setPhotoCheck({ running: false, summary: err.message, problems: [] });
    }
  }

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
      work: {
        ...profile.work,
        services: (profile.work?.services || []).filter((s) => s.title.trim()),
      },
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
              href="#discord"
              icon="discord"
              active={activeSection === "discord"}
              onClick={() => setActiveSection("discord")}
            >
              Discord servers
            </AdminNavLink>
            <AdminNavLink
              href="#work"
              icon="work"
              active={activeSection === "work"}
              onClick={() => setActiveSection("work")}
            >
              Work with me
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
            <AdminNavLink href="#downloads" icon="download" active={activeSection === "downloads"} onClick={() => setActiveSection("downloads")}>
              Settings files
            </AdminNavLink>
            <AdminNavLink href="#apps" icon="apps" active={activeSection === "apps"} onClick={() => setActiveSection("apps")}>
              Bots &amp; apps
            </AdminNavLink>
            <AdminNavLink href="#faq" icon="faq" active={activeSection === "faq"} onClick={() => setActiveSection("faq")}>
              FAQ
            </AdminNavLink>
            <AdminNavLink
              href="#guestbook"
              icon="guestbook"
              active={activeSection === "guestbook"}
              onClick={() => setActiveSection("guestbook")}
            >
              Guestbook{guestbookWaiting > 0 ? ` (${guestbookWaiting})` : ""}
            </AdminNavLink>
            <AdminNavLink
              href="#haste"
              icon="haste"
              active={activeSection === "haste"}
              onClick={() => setActiveSection("haste")}
            >
              Pastes
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
          <p className="hint">Write {"{years}"} to show your years moderating from the stats setting.</p>
        </div>
        <div className="field">
          <label htmlFor="f-season">seasonal theme</label>
          <select
            id="f-season"
            value={profile.themes?.mode || "auto"}
            onChange={(e) => edit((p) => ({ ...p, themes: { ...p.themes, mode: e.target.value } }))}
          >
            <option value="auto">Automatic (by date)</option>
            <option value="off">Off</option>
            <option value="halloween">Halloween, always (preview)</option>
            <option value="holidays">Holidays, always (preview)</option>
            <option value="valentine">Valentine&apos;s, always (preview)</option>
            <option value="anniversary">Twitch anniversary, always (preview)</option>
          </select>
          <p className="hint">
            Automatic: Halloween Oct 20–31, holidays Dec 10–Jan 1, Valentine&apos;s Feb 12–14, and your Twitch anniversary
            on its day. Visitors with reduced motion get the colours without the falling bits.
          </p>
        </div>
        <div className="field">
          <label htmlFor="f-anniversary">twitch anniversary (the day you started)</label>
          <input
            id="f-anniversary"
            type="date"
            value={profile.themes?.since && profile.themes?.anniversary ? `${profile.themes.since}-${profile.themes.anniversary}` : ""}
            onChange={(e) => {
              const [y, m, d] = e.target.value.split("-");
              edit((p) => ({
                ...p,
                themes: { ...p.themes, anniversary: m && d ? `${m}-${d}` : "", since: y ? Number(y) : null },
              }));
            }}
          />
          <p className="hint">On this day each year the site shows confetti and &ldquo;N years on Twitch today&rdquo;.</p>
        </div>
        <PrefixField
          label="mod help discord server (linked from the Tools page and /mod-kit)"
          kind="discord"
          value={profile.modServer || ""}
          onChange={(modServer) => edit((p) => ({ ...p, modServer }))}
          placeholder="invite code"
        />
        <ListField
          id="f-roles"
          label="rotating roles (one per line)"
          hint={'Shown one at a time after "I\'m a" under your name. Leave empty to hide that line.'}
          values={profile.home?.roles || []}
          onChange={(roles) => edit((p) => ({ ...p, home: { ...p.home, roles } }))}
        />
        <ListField
          id="f-tags"
          label="streamer section tags (one per line)"
          hint={'The small pills under "Streamers I work with".'}
          values={profile.home?.tags || []}
          onChange={(tags) => edit((p) => ({ ...p, home: { ...p.home, tags } }))}
        />
        <div className="field">
          <label htmlFor="f-years">years moderating</label>
          <input
            id="f-years"
            type="number"
            min={0}
            max={80}
            value={profile.stats?.yearsModding ?? ""}
            onChange={(e) =>
              edit((p) => ({
                ...p,
                stats: { ...p.stats, yearsModding: e.target.value === "" ? null : Number(e.target.value) },
              }))
            }
            placeholder="e.g. 10"
          />
          <p className="hint">
            Shown as &ldquo;10+ years moderating&rdquo; in the stats under your bio. Leave empty to hide it.
            Combined followers and the community count come from your mod list.
          </p>
        </div>
        <SpotifyConnect info={spotifyInfo} setInfo={setSpotifyInfo} setStatus={setStatus} dirty={dirty} />
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

      {twitchEnabled && (
        <div className="twitch-connect">
          {twitchConnection ? (
            <>
              <span>
                <b>Twitch connected</b> as {twitchConnection.login}. Follower counts on the site update from Twitch
                every hour; the numbers below are only a fallback.
              </span>
              <button
                className="btn"
                type="button"
                onClick={async () => {
                  const res = await fetch("/api/admin/twitch/disconnect", { method: "POST" });
                  if (res.ok) {
                    setTwitchConnection(null);
                    setFollowerCounts(null);
                    setStatus({ text: "Twitch disconnected.", kind: "ok" });
                  } else {
                    setStatus({ text: "Could not disconnect Twitch.", kind: "err" });
                  }
                }}
              >
                disconnect
              </button>
            </>
          ) : (
            <>
              <span>
                <b>Keep follower counts up to date.</b> Sign in with your Twitch account once and the site reads each
                channel&apos;s follower count from Twitch automatically.
              </span>
              <a
                className="btn btn--primary"
                href="/api/admin/twitch/connect"
                onClick={(e) => {
                  if (dirty && !window.confirm("You have unsaved changes. Leave and connect Twitch anyway?")) e.preventDefault();
                }}
              >
                connect twitch
              </a>
              {twitchCallbackUrl && (
                <span className="twitch-connect__url">
                  Your Twitch app&apos;s OAuth Redirect URLs (dev.twitch.tv/console) must include exactly:{" "}
                  <code>{twitchCallbackUrl}</code>{" "}
                  <button
                    className="btn btn--icon"
                    type="button"
                    onClick={() => navigator.clipboard?.writeText(twitchCallbackUrl).then(() => setStatus({ text: "copied", kind: "ok" }))}
                  >
                    copy
                  </button>
                </span>
              )}
            </>
          )}
        </div>
      )}

      {twitchConnection && <ModSync profile={profile} edit={edit} dirty={dirty} />}

      {["active", "past"].map((group) => (
        <section className="section" id={`mods-${group}`} key={group}>
          <h2 className="section__title">mod experience — {group}</h2>

          {profile.experience[group].map((entry, i) => (
            <EntryCard
              key={i}
              entry={entry}
              twitchEnabled={twitchEnabled}
              liveFollowers={entry.twitch ? followerCounts?.[entry.twitch.toLowerCase()] : undefined}
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

      <section className="section" id="discord">
        <h2 className="section__title">discord servers</h2>
        <div className="twitch-connect">
          {discordConnection ? (
            <>
              <span>
                <b>Discord connected</b> as {discordConnection.username}. Servers you own or moderate are listed
                below with member counts, refreshed every hour. Untick any you don&apos;t want on the site, then save.
              </span>
              <button
                className="btn"
                type="button"
                onClick={async () => {
                  const res = await fetch("/api/admin/discord/disconnect", { method: "POST" });
                  if (res.ok) {
                    setDiscordConnection(null);
                    setDiscordServers(null);
                    setStatus({ text: "Discord disconnected.", kind: "ok" });
                  } else {
                    setStatus({ text: "Could not disconnect Discord.", kind: "err" });
                  }
                }}
              >
                disconnect
              </button>
            </>
          ) : (
            <>
              <span>
                <b>Show the Discord servers you help run.</b> Connect your Discord account and the site lists the
                servers you own or moderate, with live member and online counts.
              </span>
              <a
                className="btn btn--primary"
                href="/api/admin/discord/connect"
                onClick={(e) => {
                  if (dirty && !window.confirm("You have unsaved changes. Leave and connect Discord anyway?")) e.preventDefault();
                }}
              >
                connect discord
              </a>
            </>
          )}
        </div>
        {discordConnection && !discordServers?.length && (
          <p className="hint">No servers found where you&apos;re the owner or have moderator permissions.</p>
        )}
        {discordServers?.length > 0 && (
          <>
            <div className="dc-admin__bulk">
              <button className="btn" type="button" onClick={() => edit((p) => ({ ...p, discord: { hidden: [] } }))}>
                show all
              </button>
              <button
                className="btn"
                type="button"
                onClick={() => edit((p) => ({ ...p, discord: { hidden: discordServers.map((s) => s.id) } }))}
              >
                hide all
              </button>
              <span className="hint">
                {discordServers.filter((s) => !(profile.discord?.hidden || []).includes(s.id)).length} of {discordServers.length} shown
              </span>
            </div>
            <ul className="dc-admin">
              {discordServers.map((s) => {
                const shown = !(profile.discord?.hidden || []).includes(s.id);
                return (
                  <li key={s.id}>
                    <label>
                      <input
                        type="checkbox"
                        checked={shown}
                        onChange={(e) =>
                          edit((p) => {
                            const hidden = new Set(p.discord?.hidden || []);
                            if (e.target.checked) hidden.delete(s.id);
                            else hidden.add(s.id);
                            return { ...p, discord: { hidden: [...hidden] } };
                          })
                        }
                      />
                      {s.icon ? (
                        // eslint-disable-next-line @next/next/no-img-element -- Discord CDN icon
                        <img src={s.icon} alt="" width="28" height="28" />
                      ) : (
                        <span className="dc-admin__noicon" aria-hidden="true" />
                      )}
                      <span className="dc-admin__name">{s.name}</span>
                      <span className="dc-admin__meta">
                        {s.role} · {Number.isFinite(s.members) ? s.members.toLocaleString() : "?"} members
                      </span>
                    </label>
                  </li>
                );
              })}
            </ul>
          </>
        )}
      </section>

      <section className="section" id="work">
        <h2 className="section__title">work with me</h2>
        <p className="hint" style={{ marginBottom: "var(--gap-sm)" }}>
          Shown on the /work page. The services also fill the &ldquo;What I do&rdquo; cards on the homepage.
        </p>
        <label className="page-editor__published">
          <input
            type="checkbox"
            checked={Boolean(profile.work?.available)}
            onChange={(e) => patchWork({ available: e.target.checked })}
          />
          open to new communities (shows a green badge on the homepage and /work)
        </label>
        <div className="field">
          <label htmlFor="f-work-intro">intro</label>
          <textarea
            id="f-work-intro"
            maxLength={600}
            value={profile.work?.intro || ""}
            onChange={(e) => patchWork({ intro: e.target.value })}
            placeholder="A sentence or two about who you help and how"
          />
        </div>
        {(profile.work?.services || []).map((service, i) => (
          <div className="entry" key={i}>
            <div className="entry__head">
              <span className="entry__title">{service.title || "(new service)"}</span>
              <div className="entry__actions">
                <button className="btn btn--icon" title="move up" onClick={() => edit((p) => { p.work.services = move(p.work.services, i, -1); return p; })}>↑</button>
                <button className="btn btn--icon" title="move down" onClick={() => edit((p) => { p.work.services = move(p.work.services, i, 1); return p; })}>↓</button>
                <button className="btn btn--icon btn--danger" title="remove" onClick={() => edit((p) => { p.work.services = p.work.services.filter((_, j) => j !== i); return p; })}>×</button>
              </div>
            </div>
            <div className="grid">
              <Field label="service" value={service.title} onChange={(e) => patchService(i, { title: e.target.value })} maxLength={80} placeholder="Twitch moderation" full />
              <div className="field grid--full">
                <label htmlFor={`f-service-${i}`}>description</label>
                <textarea id={`f-service-${i}`} maxLength={300} value={service.text} onChange={(e) => patchService(i, { text: e.target.value })} />
              </div>
            </div>
          </div>
        ))}
        <button
          className="btn"
          disabled={(profile.work?.services || []).length >= 8}
          onClick={() => edit((p) => ({ ...p, work: { ...p.work, services: [...(p.work?.services || []), { ...BLANK_SERVICE }] } }))}
        >
          + add service
        </button>
      </section>

      <section className="section" id="gear">
        <h2 className="section__title">what i use</h2>
        <p className="hint">Add, reorder, or remove guide sections and products.</p>
        <div className="photo-check">
          <button className="btn" type="button" onClick={recheckPhotos} disabled={photoCheck?.running}>
            {photoCheck?.running ? "checking…" : "re-check all photos"}
          </button>
          <span className="hint">
            {photoCheck?.summary ||
              "Checks every photo still loads, and finds photos for products that have none from their product links."}
          </span>
          {photoCheck?.problems?.length > 0 && (
            <ul className="photo-check__list">
              {photoCheck.problems.map((p, i) => (
                <li key={i}>
                  {p.name} — {p.status === "broken" ? "photo no longer loads and no replacement found" : "no photo found on its product page"}; upload one below
                </li>
              ))}
            </ul>
          )}
        </div>
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

      <DownloadsSection profile={profile} edit={edit} onStatus={setStatus} />
      <AppsSection profile={profile} edit={edit} />
      <FaqSection profile={profile} edit={edit} />

      <GuestbookSection onStatus={setStatus} onWaiting={setGuestbookWaiting} />

      <PastesSection onStatus={setStatus} />

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

/* ---------- Twitch mod list sync ---------- */

// Compares the channels you moderate on Twitch with the mod list.
function ModSync({ profile, edit, dirty }) {
  const [data, setData] = useState(null);

  useEffect(() => {
    fetch("/api/admin/twitch/moderated")
      .then((r) => r.json())
      .then(setData)
      .catch((err) => setData({ error: err.message }));
  }, []);

  if (!data) return <div className="mod-sync"><p className="hint">checking the channels you mod on Twitch…</p></div>;
  if (data.error) return <div className="mod-sync"><p className="hint">Could not read your Twitch mod list: {data.error}</p></div>;
  if (data.needsReconnect) {
    return (
      <div className="mod-sync">
        <span>
          <b>Sync your mod list from Twitch.</b> Reconnect Twitch once to let the site see which channels you moderate.
        </span>
        <a
          className="btn btn--primary"
          href="/api/admin/twitch/connect"
          onClick={(e) => {
            if (dirty && !window.confirm("You have unsaved changes. Leave and reconnect Twitch anyway?")) e.preventDefault();
          }}
        >
          reconnect twitch
        </a>
      </div>
    );
  }
  if (!data.channels) return null;

  const listed = (group) => new Set(profile.experience[group].map((e) => (e.twitch || "").toLowerCase()).filter(Boolean));
  const active = listed("active");
  const past = listed("past");
  const modded = new Set(data.channels.map((c) => c.login));
  const missing = data.channels.filter((c) => !active.has(c.login));
  // Active entries with a Twitch name you no longer mod. (Discord-only roles
  // without a Twitch mod badge show here too, so this only suggests.)
  const gone = profile.experience.active.filter((e) => e.twitch && !modded.has(e.twitch.toLowerCase()));

  const entryFor = (c) => ({
    role: "Twitch Mod",
    name: c.name,
    description: "",
    url: `https://twitch.tv/${c.login}`,
    discordUrl: "",
    date: "present",
    twitch: c.login,
    avatar: c.avatar || "",
    followers: c.followers,
  });
  const add = (channels) =>
    edit((p) => {
      const logins = new Set(channels.map((c) => c.login));
      p.experience.past = p.experience.past.filter((e) => !logins.has((e.twitch || "").toLowerCase()));
      p.experience.active = [...p.experience.active, ...channels.map(entryFor)];
      return p;
    });
  const moveToPast = (entry) =>
    edit((p) => {
      p.experience.active = p.experience.active.filter((e) => e !== p.experience.active.find((x) => x.twitch === entry.twitch));
      p.experience.past = [{ ...entry, date: entry.date === "present" ? "" : entry.date }, ...p.experience.past];
      return p;
    });
  const fmt = (n) => (Number.isFinite(n) ? `${n >= 1e6 ? `${(n / 1e6).toFixed(1)}M` : n >= 1e3 ? `${Math.round(n / 1e3)}K` : n} followers` : "");

  return (
    <div className="mod-sync mod-sync--list">
      <div className="mod-sync__head">
        <span>
          <b>Channels you mod on Twitch: {data.channels.length}.</b>{" "}
          {missing.length ? `${missing.length} aren't on your list yet.` : "Your list includes all of them."}
        </span>
        {missing.length > 1 && (
          <button className="btn btn--primary" type="button" onClick={() => add(missing)}>
            add all {missing.length}
          </button>
        )}
      </div>
      {missing.length > 0 && (
        <ul className="mod-sync__items">
          {missing.map((c) => (
            <li key={c.login}>
              {c.avatar ? (
                // eslint-disable-next-line @next/next/no-img-element -- Twitch avatar
                <img src={c.avatar} alt="" width="28" height="28" />
              ) : (
                <span className="mod-sync__noava" aria-hidden="true" />
              )}
              <span className="mod-sync__name">
                {c.name} {past.has(c.login) && <small>(in past)</small>}
              </span>
              <span className="mod-sync__meta">{fmt(c.followers)}</span>
              <button className="btn" type="button" onClick={() => add([c])}>+ add</button>
            </li>
          ))}
        </ul>
      )}
      {gone.length > 0 && (
        <>
          <p className="hint">
            On your active list but you&apos;re not a Twitch mod there anymore (fine to keep if your role there is on
            Discord):
          </p>
          <ul className="mod-sync__items">
            {gone.map((e) => (
              <li key={e.twitch}>
                <span className="mod-sync__name">{e.name}</span>
                <span className="mod-sync__meta">{e.role}</span>
                <button className="btn" type="button" onClick={() => moveToPast(e)}>move to past</button>
              </li>
            ))}
          </ul>
        </>
      )}
      {(missing.length > 0 || gone.length > 0) && <p className="hint">Changes apply to the lists below; remember to save.</p>}
    </div>
  );
}

/* ---------- settings files, bots & apps, faq ---------- */

const kb = (n) => (n >= 1024 * 1024 ? `${(n / 1024 / 1024).toFixed(1)} MB` : `${Math.max(1, Math.round(n / 1024))} KB`);

function DownloadsSection({ profile, edit, onStatus }) {
  const items = profile.downloads || [];
  const patch = (i, change) =>
    edit((p) => {
      p.downloads[i] = { ...p.downloads[i], ...change };
      return p;
    });
  const [busy, setBusy] = useState(-1);

  async function upload(i, file) {
    if (!file) return;
    setBusy(i);
    try {
      const body = new FormData();
      body.append("file", file);
      const res = await fetch("/api/admin/files", { method: "POST", body });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || `upload failed (${res.status})`);
      const old = items[i].file;
      patch(i, { file: data });
      if (old) fetch(`/api/admin/files?id=${old.id}`, { method: "DELETE" }).catch(() => {});
      onStatus({ text: `Uploaded ${data.name}. Save to publish it.`, kind: "ok" });
    } catch (err) {
      onStatus({ text: err.message, kind: "err" });
    } finally {
      setBusy(-1);
    }
  }

  return (
    <section className="section" id="downloads">
      <h2 className="section__title">settings files</h2>
      <p className="hint" style={{ marginBottom: "var(--gap-sm)" }}>
        Files people can download from the Tools page, like your Chatterino settings.json or an FFZ backup. Each one
        shows once it has a file. In the steps, every line is a numbered step; start a line with &ldquo;- &rdquo; for
        a detail under the step above.
      </p>
      {items.map((d, i) => (
        <div className="entry" key={d.id}>
          <div className="entry__head">
            <span className="entry__title">
              {d.title || "(new file)"} {d.file ? `· ${d.file.name} (${kb(d.file.size)})` : "· no file yet, hidden"}
            </span>
            <div className="entry__actions">
              <button className="btn btn--icon" title="move up" onClick={() => edit((p) => ({ ...p, downloads: move(p.downloads, i, -1) }))}>↑</button>
              <button className="btn btn--icon" title="move down" onClick={() => edit((p) => ({ ...p, downloads: move(p.downloads, i, 1) }))}>↓</button>
              <button
                className="btn btn--icon btn--danger"
                title="remove"
                onClick={() => {
                  if (d.file) fetch(`/api/admin/files?id=${d.file.id}`, { method: "DELETE" }).catch(() => {});
                  edit((p) => ({ ...p, downloads: p.downloads.filter((_, j) => j !== i) }));
                }}
              >
                ×
              </button>
            </div>
          </div>
          <div className="grid">
            <Field label="title" value={d.title} onChange={(e) => patch(i, { title: e.target.value })} maxLength={80} />
            <div className="field">
              <label htmlFor={`f-dl-file-${i}`}>file (up to 3 MB)</label>
              <input id={`f-dl-file-${i}`} type="file" disabled={busy === i} onChange={(e) => upload(i, e.target.files?.[0])} />
            </div>
            <Field label="description" value={d.description} onChange={(e) => patch(i, { description: e.target.value })} maxLength={300} full />
            <div className="field grid--full">
              <label htmlFor={`f-dl-steps-${i}`}>how to use it</label>
              <textarea id={`f-dl-steps-${i}`} rows={6} maxLength={1500} value={d.steps} onChange={(e) => patch(i, { steps: e.target.value })} />
            </div>
          </div>
        </div>
      ))}
      <button
        className="btn"
        disabled={items.length >= 20}
        onClick={() =>
          edit((p) => ({
            ...p,
            downloads: [...(p.downloads || []), { id: Math.random().toString(36).slice(2, 10), title: "", description: "", steps: "", file: null }],
          }))
        }
      >
        + add file
      </button>
    </section>
  );
}

function AppsSection({ profile, edit }) {
  const items = profile.recommendations || [];
  const patch = (i, change) =>
    edit((p) => {
      p.recommendations[i] = { ...p.recommendations[i], ...change };
      return p;
    });
  return (
    <section className="section" id="apps">
      <h2 className="section__title">bots &amp; apps</h2>
      <p className="hint" style={{ marginBottom: "var(--gap-sm)" }}>
        Shown on the Tools page, grouped by category (e.g. Twitch bots, Mobile chat).
      </p>
      {items.map((r, i) => (
        <div className="entry" key={i}>
          <div className="entry__head">
            <span className="entry__title">{r.name || "(new)"} <span className="hint">· {r.category}</span></span>
            <div className="entry__actions">
              <button className="btn btn--icon" title="move up" onClick={() => edit((p) => ({ ...p, recommendations: move(p.recommendations, i, -1) }))}>↑</button>
              <button className="btn btn--icon" title="move down" onClick={() => edit((p) => ({ ...p, recommendations: move(p.recommendations, i, 1) }))}>↓</button>
              <button className="btn btn--icon btn--danger" title="remove" onClick={() => edit((p) => ({ ...p, recommendations: p.recommendations.filter((_, j) => j !== i) }))}>×</button>
            </div>
          </div>
          <div className="grid">
            <Field label="name" value={r.name} onChange={(e) => patch(i, { name: e.target.value })} maxLength={60} />
            <Field label="category" value={r.category} onChange={(e) => patch(i, { category: e.target.value })} maxLength={40} list="rec-categories" />
            <Field label="link" value={r.url} onChange={(e) => patch(i, { url: e.target.value })} maxLength={500} placeholder="https://" />
            <Field label="short note" value={r.note} onChange={(e) => patch(i, { note: e.target.value })} maxLength={160} />
          </div>
        </div>
      ))}
      <datalist id="rec-categories">
        {[...new Set(items.map((r) => r.category))].map((c) => (
          <option key={c} value={c} />
        ))}
      </datalist>
      <button
        className="btn"
        disabled={items.length >= 60}
        onClick={() => edit((p) => ({ ...p, recommendations: [...(p.recommendations || []), { category: "Twitch bots", name: "", note: "", url: "" }] }))}
      >
        + add bot or app
      </button>
    </section>
  );
}

function FaqSection({ profile, edit }) {
  const items = profile.faq || [];
  const patch = (i, change) =>
    edit((p) => {
      p.faq[i] = { ...p.faq[i], ...change };
      return p;
    });
  return (
    <section className="section" id="faq">
      <h2 className="section__title">faq</h2>
      <p className="hint" style={{ marginBottom: "var(--gap-sm)" }}>
        Shown on /faq. Answers support links like [Tools page](/what-i-use), **bold** and lists.
      </p>
      {items.map((f, i) => (
        <div className="entry" key={i}>
          <div className="entry__head">
            <span className="entry__title">{f.q || "(new question)"}</span>
            <div className="entry__actions">
              <button className="btn btn--icon" title="move up" onClick={() => edit((p) => ({ ...p, faq: move(p.faq, i, -1) }))}>↑</button>
              <button className="btn btn--icon" title="move down" onClick={() => edit((p) => ({ ...p, faq: move(p.faq, i, 1) }))}>↓</button>
              <button className="btn btn--icon btn--danger" title="remove" onClick={() => edit((p) => ({ ...p, faq: p.faq.filter((_, j) => j !== i) }))}>×</button>
            </div>
          </div>
          <div className="grid">
            <Field label="question" value={f.q} onChange={(e) => patch(i, { q: e.target.value })} maxLength={200} full />
            <div className="field grid--full">
              <label htmlFor={`f-faq-a-${i}`}>answer</label>
              <textarea id={`f-faq-a-${i}`} rows={4} maxLength={2000} value={f.a} onChange={(e) => patch(i, { a: e.target.value })} />
            </div>
          </div>
        </div>
      ))}
      <button className="btn" disabled={items.length >= 50} onClick={() => edit((p) => ({ ...p, faq: [...(p.faq || []), { q: "", a: "" }] }))}>
        + add question
      </button>
    </section>
  );
}

/* ---------- spotify ---------- */

function SpotifyConnect({ info, setInfo, setStatus, dirty }) {
  if (!info) return null;
  const copy = () => navigator.clipboard?.writeText(info.callbackUrl).then(() => setStatus({ text: "copied", kind: "ok" }));
  return (
    <div className="twitch-connect" style={{ marginTop: "var(--gap-sm)" }}>
      {!info.enabled ? (
        <span>
          <b>Spotify now playing.</b> Create an app at developer.spotify.com/dashboard, add{" "}
          <code>{info.callbackUrl}</code> as its Redirect URI, then set SPOTIFY_CLIENT_ID and SPOTIFY_CLIENT_SECRET in
          Vercel and redeploy.{" "}
          <button className="btn btn--icon" type="button" onClick={copy}>copy</button>
        </span>
      ) : info.connection ? (
        <>
          <span>
            <b>Spotify connected</b> as {info.connection.name}. The homepage shows what you&apos;re playing, or your
            last song.
          </span>
          <button
            className="btn"
            type="button"
            onClick={async () => {
              const res = await fetch("/api/admin/spotify/disconnect", { method: "POST" });
              if (res.ok) {
                setInfo({ ...info, connection: null });
                setStatus({ text: "Spotify disconnected.", kind: "ok" });
              } else {
                setStatus({ text: "Could not disconnect Spotify.", kind: "err" });
              }
            }}
          >
            disconnect
          </button>
        </>
      ) : (
        <>
          <span>
            <b>Show your music.</b> Sign in with Spotify once and the homepage shows what you&apos;re playing, even
            with Discord closed.
          </span>
          <a
            className="btn btn--primary"
            href="/api/admin/spotify/connect"
            onClick={(e) => {
              if (dirty && !window.confirm("You have unsaved changes. Leave and connect Spotify anyway?")) e.preventDefault();
            }}
          >
            connect spotify
          </a>
          <span className="twitch-connect__url">
            Your Spotify app&apos;s Redirect URIs must include exactly: <code>{info.callbackUrl}</code>{" "}
            <button className="btn btn--icon" type="button" onClick={copy}>copy</button>
          </span>
        </>
      )}
    </div>
  );
}

/* ---------- guestbook ---------- */

function GuestbookSection({ onStatus, onWaiting }) {
  const [data, setData] = useState(null);
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    try {
      const res = await fetch("/api/admin/guestbook");
      const json = await res.json();
      setData(res.ok ? json : { error: json.error || "could not load the guestbook" });
      onWaiting(json.pending?.length || 0);
    } catch (err) {
      setData({ error: err.message });
    }
  }, [onWaiting]);
  useEffect(() => {
    load();
  }, [load]);

  async function act(action, entry) {
    if (action === "delete" && !window.confirm(`Delete the message from ${entry.name}?`)) return;
    setBusy(true);
    const res = await fetch("/api/admin/guestbook", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action, id: entry.id }),
    });
    const json = await res.json().catch(() => ({}));
    setBusy(false);
    onStatus(res.ok ? { text: action === "approve" ? `approved ${entry.name}'s message` : "message deleted", kind: "ok" } : { text: json.error || "failed", kind: "err" });
    load();
  }

  const when = (iso) => new Date(iso).toLocaleString([], { dateStyle: "medium", timeStyle: "short" });

  return (
    <section className="section" id="guestbook">
      <h2 className="section__title">guestbook</h2>
      <p className="hint" style={{ marginBottom: "var(--gap-sm)" }}>
        New messages at <a href="/guestbook" target="_blank" rel="noreferrer">/guestbook</a> wait here until you approve them.
      </p>
      {!data && <p className="hint">loading…</p>}
      {data?.error && <p className="hint">Could not load the guestbook: {data.error}</p>}
      {data?.configured === false && <p className="hint">The guestbook uses the same Vercel Blob store as pastes; connect one to switch it on.</p>}
      {data?.pending && (
        <>
          <h3 className="gb-admin__title">waiting for review ({data.pending.length})</h3>
          {data.pending.length ? (
            <ul className="gb-admin">
              {data.pending.map((e) => (
                <li key={e.id}>
                  <div>
                    <b>{e.name}</b> <span className="gb-admin__meta">{when(e.createdAt)}</span>
                    <p>{e.message}</p>
                  </div>
                  <div className="gb-admin__actions">
                    <button className="btn btn--primary" type="button" disabled={busy} onClick={() => act("approve", e)}>approve</button>
                    <button className="btn btn--icon btn--danger" type="button" title="delete" disabled={busy} onClick={() => act("delete", e)}>×</button>
                  </div>
                </li>
              ))}
            </ul>
          ) : (
            <p className="hint">Nothing waiting.</p>
          )}
          <h3 className="gb-admin__title">on the site ({data.approved.length})</h3>
          {data.approved.length ? (
            <ul className="gb-admin">
              {data.approved.map((e) => (
                <li key={e.id}>
                  <div>
                    <b>{e.name}</b> <span className="gb-admin__meta">{when(e.createdAt)}</span>
                    <p>{e.message}</p>
                  </div>
                  <div className="gb-admin__actions">
                    <button className="btn btn--icon btn--danger" type="button" title="delete" disabled={busy} onClick={() => act("delete", e)}>×</button>
                  </div>
                </li>
              ))}
            </ul>
          ) : (
            <p className="hint">No approved messages yet.</p>
          )}
        </>
      )}
    </section>
  );
}

/* ---------- pastes (/haste) ---------- */

function PastesSection({ onStatus }) {
  const [data, setData] = useState(null); // { configured, pastes } | { error }
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    try {
      const res = await fetch("/api/admin/haste");
      const json = await res.json();
      setData(res.ok ? json : { error: json.error || "could not load pastes" });
    } catch (err) {
      setData({ error: err.message });
    }
  }, []);
  useEffect(() => {
    load();
  }, [load]);

  async function remove(ids, label) {
    if (!window.confirm(`Delete ${label}? This can't be undone.`)) return;
    setBusy(true);
    const query = ids.map((id) => `id=${encodeURIComponent(id)}`).join("&");
    const res = await fetch(`/api/admin/haste?${query}`, { method: "DELETE" });
    setBusy(false);
    onStatus(res.ok ? { text: `deleted ${label}`, kind: "ok" } : { text: "delete failed", kind: "err" });
    load();
  }

  const when = (iso) => new Date(iso).toLocaleString([], { dateStyle: "medium", timeStyle: "short" });
  const kb = (n) => (n < 1024 ? `${n} B` : `${(n / 1024).toFixed(1)} KB`);
  const pastes = data?.pastes || [];
  // How many pastes each visitor fingerprint made, to spot floods.
  const bySource = pastes.reduce((m, p) => m.set(p.ipHash, (m.get(p.ipHash) || 0) + 1), new Map());

  return (
    <section className="section" id="haste">
      <h2 className="section__title">pastes</h2>
      <p className="hint" style={{ marginBottom: "var(--gap-sm)" }}>
        Anyone can create pastes at <a href="/haste" target="_blank" rel="noreferrer">/haste</a>. They expire on their own;
        delete anything that shouldn&apos;t be there.
      </p>
      {!data && <p className="hint">loading…</p>}
      {data?.error && <p className="hint">Could not load pastes: {data.error}</p>}
      {data && data.configured === false && (
        <p className="hint">
          Pastes are off until a Vercel Blob store is connected: in Vercel, open this project → Storage → Create → Blob,
          connect it to the project, then redeploy.
        </p>
      )}
      {data?.configured && !pastes.length && <p className="hint">No pastes right now.</p>}
      {pastes.length > 0 && (
        <ul className="paste-admin">
          {pastes.map((p) => (
            <li key={p.id}>
              <a className="paste-admin__id" href={`/haste/${p.id}`} target="_blank" rel="noreferrer">{p.id}</a>
              <span className="paste-admin__preview">{p.preview || "(blank first line)"}</span>
              <span className="paste-admin__meta">
                {kb(p.size)} · {p.lines} lines · {when(p.createdAt)} · expires {when(p.expiresAt)}
                {bySource.get(p.ipHash) > 1 && (
                  <>
                    {" · "}
                    <button
                      className="paste-admin__source"
                      type="button"
                      disabled={busy}
                      title="Delete every paste from this visitor"
                      onClick={() =>
                        remove(
                          pastes.filter((x) => x.ipHash === p.ipHash).map((x) => x.id),
                          `all ${bySource.get(p.ipHash)} pastes from this visitor`
                        )
                      }
                    >
                      {bySource.get(p.ipHash)} from same visitor
                    </button>
                  </>
                )}
              </span>
              <button className="btn btn--icon btn--danger" type="button" title="delete" disabled={busy} onClick={() => remove([p.id], `paste ${p.id}`)}>
                ×
              </button>
            </li>
          ))}
        </ul>
      )}
    </section>
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
    download: <><path d="M12 4v11M7 10l5 5 5-5M5 20h14" /></>,
    apps: <><rect x="4" y="4" width="7" height="7" rx="1.5" /><rect x="13" y="4" width="7" height="7" rx="1.5" /><rect x="4" y="13" width="7" height="7" rx="1.5" /><rect x="13" y="13" width="7" height="7" rx="1.5" /></>,
    faq: <><circle cx="12" cy="12" r="9" /><path d="M9.5 9.5a2.5 2.5 0 1 1 3.5 2.3c-.6.3-1 .9-1 1.6v.6M12 17h.01" /></>,
    gear: <><circle cx="12" cy="12" r="3" /><path d="m19.4 15 .1.1 1.4 1.1-1.4 2.4-1.7-.7a8 8 0 0 1-1.7 1l-.3 1.8h-2.8l-.3-1.8a8 8 0 0 1-1.7-1l-1.7.7-1.4-2.4L7.3 15a8 8 0 0 1 0-2l-1.4-1.1 1.4-2.4 1.7.7a8 8 0 0 1 1.7-1l.3-1.8h2.8l.3 1.8a8 8 0 0 1 1.7 1l1.7-.7 1.4 2.4-1.4 1.1a8 8 0 0 1-.1 2Z" /></>,
    guestbook: <><path d="M4 4.5A2.5 2.5 0 0 1 6.5 2H20v17H6.5A2.5 2.5 0 0 0 4 21.5v-17Z" /><path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20M9 7h7M9 11h5" /></>,
    haste: <><path d="M8 4H6a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V6a2 2 0 0 0-2-2h-2" /><rect x="8" y="2" width="8" height="4" rx="1" /><path d="M8 12h8M8 16h5" /></>,
    discord: <><path d="M8 4.5c-1.6.3-3 .8-4.2 1.5C2 9 1.6 12 2 15c1.3 1 2.8 1.7 4.4 2.2l1-1.7M16 4.5c1.6.3 3 .8 4.2 1.5C22 9 22.4 12 22 15c-1.3 1-2.8 1.7-4.4 2.2l-1-1.7" /><path d="M7 16c3.3 1.3 6.7 1.3 10 0" /><circle cx="9" cy="11.5" r="1.3" /><circle cx="15" cy="11.5" r="1.3" /></>,
    work: <><rect x="3" y="7" width="18" height="13" rx="2" /><path d="M8 7V5a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2M3 13h18" /></>,
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
      onStatus({ text: "icon uploaded — remember to save; it shows on the site a minute or two later", kind: "ok" });
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

function EntryCard({ entry, twitchEnabled, liveFollowers, onChange, onMove, onRemove, onStatus }) {
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
        <div className="field">
          <Field
            label="follower count"
            type="number"
            value={entry.followers ?? ""}
            onChange={followers}
            placeholder="e.g. 125000"
          />
          {Number.isFinite(liveFollowers) && (
            <p className="hint follower-live">
              Twitch now: {liveFollowers.toLocaleString()} (used on the site automatically)
            </p>
          )}
        </div>

        <div className="twitch-row">
          <Field
            label="twitch name"
            value={entry.twitch}
            onChange={(e) => {
              const twitch = e.target.value;
              const patch = { twitch };
              // Keep the channel link in step while it's empty or still
              // pointing at the previous name.
              const old = PREFIXES.twitch.slug(entry.url);
              if (!entry.url || old.toLowerCase() === (entry.twitch || "").toLowerCase()) {
                patch.url = PREFIXES.twitch.build(twitch.trim());
              }
              onChange(patch);
            }}
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

        <PrefixField
          label="twitch channel"
          kind="twitch"
          value={entry.url}
          onChange={(url) => onChange({ url })}
          placeholder="chubsc"
          full
        />
        <PrefixField
          label="discord server invite"
          kind="discord"
          value={entry.discordUrl || ""}
          onChange={(discordUrl) => onChange({ discordUrl })}
          placeholder="abc123"
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
          ? '"fetch" pulls the avatar and display name from Twitch. Follower counts update automatically once Twitch is connected above; otherwise type them in.'
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
      onStatus({ text: "product image uploaded — remember to save; it shows on the site a minute or two later", kind: "ok" });
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
      onStatus({ text: "product image found — remember to save; it shows on the site a minute or two later", kind: "ok" });
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

// Inputs with a fixed start ("discord.gg/", "twitch.tv/") so only the end
// needs typing. Pasting a whole link works too: the known start is stripped.
const PREFIXES = {
  twitch: {
    shown: "twitch.tv/",
    strip: /^\s*(?:https?:\/\/)?(?:www\.|m\.)?twitch\.tv\//i,
    base: "https://twitch.tv/",
  },
  discord: {
    shown: "discord.gg/",
    strip: /^\s*(?:https?:\/\/)?(?:www\.)?(?:discord\.gg\/|discord(?:app)?\.com\/invite\/)/i,
    base: "https://discord.gg/",
  },
};
for (const p of Object.values(PREFIXES)) {
  // The part after the prefix, or the whole value when it's some other URL.
  p.slug = (value) => String(value || "").replace(p.strip, "");
  p.build = (typed) => {
    const rest = String(typed || "").replace(p.strip, "").trim().replace(/^\/+/, "");
    if (!rest) return "";
    if (/^[a-z]+:\/\//i.test(rest)) return rest; // some other site: keep as typed
    return p.base + rest.replace(/[\s?#].*$/, "");
  };
}

function PrefixField({ label, kind, value, onChange, placeholder, full }) {
  const id = `f-${kind}-${useRef(Math.random().toString(36).slice(2, 8)).current}`;
  const p = PREFIXES[kind];
  const slug = p.slug(value);
  const other = /^[a-z]+:\/\//i.test(slug);

  return (
    <div className={`field${full ? " grid--full" : ""}`}>
      <label htmlFor={id}>{label}</label>
      <div className={`prefix-input${other ? " prefix-input--other" : ""}`}>
        {!other && <span className="prefix-input__prefix" aria-hidden="true">{p.shown}</span>}
        <input
          id={id}
          value={slug}
          onChange={(e) => onChange(p.build(e.target.value))}
          placeholder={placeholder}
          maxLength={500}
          spellCheck={false}
          autoCapitalize="off"
          aria-describedby={`${id}-hint`}
        />
      </div>
      <span id={`${id}-hint`} className="sr-only">{`Starts with ${p.shown}`}</span>
    </div>
  );
}

// A textarea edited as one item per line. Blank lines are kept while typing
// and dropped on save by the server.
function ListField({ id, label, hint, values, onChange }) {
  const [text, setText] = useState(values.join("\n"));
  return (
    <div className="field">
      <label htmlFor={id}>{label}</label>
      <textarea
        id={id}
        rows={Math.max(3, values.length + 1)}
        value={text}
        onChange={(e) => {
          setText(e.target.value);
          onChange(e.target.value.split("\n").map((v) => v.trim()).filter(Boolean));
        }}
      />
      {hint && <p className="hint">{hint}</p>}
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
