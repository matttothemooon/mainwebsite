import "./home.css";
import { getProfile } from "@/lib/storage";
import LinkIcon from "@/components/LinkIcon";
import ContactForm from "@/components/ContactForm";
import PresenceProvider from "@/components/PresenceProvider";
import DiscordAvatar from "@/components/DiscordAvatar";
import IntroGate from "@/components/home/IntroGate";
import RotatingRole from "@/components/home/RotatingRole";
import NowPlaying from "@/components/home/NowPlaying";
import Reveal from "@/components/home/Reveal";

// Content comes from the profile, so the admin panel keeps controlling it.
// The admin panel revalidates this path on save.
export const revalidate = 60;

export async function generateMetadata() {
  const { name, bio } = await getProfile({ fresh: true });
  return {
    title: name,
    description: bio,
    openGraph: { title: name, description: bio, url: "https://mattothemoon.xyz" },
    twitter: { card: "summary_large_image" },
  };
}

const ROLES = ["Community Mod", "Streamer", "Community Manager"];

const SERVICES = [
  {
    icon: "shield",
    title: "Twitch moderation",
    text: "Keeping chat welcoming on daily streams and major events: AutoMod, filters, bots and calling the hard cases.",
  },
  {
    icon: "users",
    title: "Discord community management",
    text: "Running servers end to end: roles, channels, staff teams, support and the day-to-day that keeps a community healthy.",
  },
];

const ICONS = {
  shield: "M12 2 4 5v6c0 5 3.4 9.4 8 11 4.6-1.6 8-6 8-11V5l-8-3Zm-1 13.6-3.3-3.3 1.4-1.4 1.9 1.9 4.6-4.6 1.4 1.4-6 6Z",
  users: "M16 11a3 3 0 1 0 0-6 3 3 0 0 0 0 6Zm-8 0a3 3 0 1 0 0-6 3 3 0 0 0 0 6Zm0 2c-2.7 0-8 1.3-8 4v2h16v-2c0-2.7-5.3-4-8-4Zm8 0c-.3 0-.7 0-1.1.1 1.3.9 2.1 2.2 2.1 3.9v2h7v-2c0-2.7-5.3-4-8-4Z",
};

const ARROW = (
  <svg className="arrow" viewBox="0 0 24 24" aria-hidden="true">
    <path d="M7 17 17 7M9 7h8v8" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);

const VERIFIED = (
  <svg className="verified" viewBox="0 0 24 24" aria-label="verified" role="img">
    <path fill="currentColor" d="m23 12-2.4-2.8.3-3.7-3.6-.8-1.9-3.2L12 2.9 8.6 1.5 6.7 4.7l-3.6.8.3 3.7L1 12l2.4 2.8-.3 3.7 3.6.8 1.9 3.2 3.4-1.4 3.4 1.4 1.9-3.2 3.6-.8-.3-3.7L23 12Zm-12.9 4.7-3.8-3.8 1.4-1.4 2.4 2.4 6.1-6.1 1.4 1.4-7.5 7.5Z" />
  </svg>
);

// "@handle" for the contact grid, read from the link's URL.
function handleFor(url) {
  try {
    if (url.startsWith("mailto:")) return url.slice(7);
    const u = new URL(url);
    const seg = u.pathname.split("/").filter(Boolean);
    const last = seg[seg.length - 1] || u.hostname.replace(/^www\./, "");
    if (u.hostname.includes("discord.com") && seg[0] === "users") return "profile";
    if (u.hostname.includes("discord.gg")) return "server";
    return last.startsWith("@") ? last : `@${last}`;
  } catch {
    return "";
  }
}

const titleCase = (s) => s.replace(/\b\w/g, (c) => c.toUpperCase());

export default async function Home() {
  const profile = await getProfile({ fresh: true });
  const links = profile.links || [];
  const active = profile.experience?.active || [];
  const past = profile.experience?.past || [];
  const communities = [
    ...active.map((e) => ({ ...e, past: false })),
    ...past.map((e) => ({ ...e, past: true })),
  ];
  const guides = (profile.pages || []).filter((p) => p.published);

  return (
    <div className="pf">
      <noscript>
        <style>{`.intro{display:none!important}.pf .h-in,.pf [data-reveal]{opacity:1!important;transform:none!important}`}</style>
      </noscript>
      <IntroGate />
      <Reveal />

      <PresenceProvider>
        <nav className="topnav" aria-label="Main navigation">
          <a href="/" aria-current="page">Home</a>
          <a href="/pages">Guides</a>
          <a href="/what-i-use">Tools</a>
        </nav>

        <main className="pf-col">
          <header className="hero">
            <div className="banner h-in" style={{ "--d": "0ms" }}>
              <span className="banner__stars" aria-hidden="true">
                {Array.from({ length: 14 }, (_, i) => <i key={i} />)}
              </span>
              <span className="banner__moon" aria-hidden="true" />
              <span className="banner__logo" role="img" aria-label={profile.name}>
                <span className="banner__word">mattothemoon</span>
                <span className="banner__sheen" aria-hidden="true" />
              </span>
            </div>

            <div className="hero-row">
              <span className="h-in" style={{ "--d": "90ms" }}>
                <DiscordAvatar />
              </span>
              {communities.length > 0 && (
                <span className="chip h-in" style={{ "--d": "135ms" }}>
                  <svg viewBox="0 0 24 24" aria-hidden="true"><path fill="currentColor" d={ICONS.users} /></svg>
                  <b>{communities.length}</b> communities
                </span>
              )}
            </div>

            <h1 className="hero-name h-in" style={{ "--d": "180ms" }}>
              {profile.name}
              {VERIFIED}
            </h1>
            <p className="hero-role h-in" style={{ "--d": "225ms" }}>
              <span className="hero-role__pre">I&apos;m a</span>
              <RotatingRole roles={ROLES} />
            </p>
            <div className="hero-bio h-in" style={{ "--d": "270ms" }}>
              {profile.about ? <p>{profile.about}</p> : <p>{profile.bio}</p>}
            </div>

            {links.length > 0 && (
              <ul className="socials h-in" style={{ "--d": "315ms" }}>
                {links.map((link, i) => {
                  const external = !link.url.startsWith("/");
                  return (
                    <li key={`${link.url}-${i}`}>
                      <a
                        href={link.url}
                        aria-label={link.label}
                        {...(external ? { target: "_blank", rel: "noopener noreferrer" } : {})}
                      >
                        <LinkIcon link={link} />
                        <span className="tip">{titleCase(link.label)}</span>
                      </a>
                    </li>
                  );
                })}
              </ul>
            )}
          </header>

          <div className="h-in" style={{ "--d": "360ms" }}>
            <NowPlaying />
          </div>

          <section className="sec" aria-labelledby="do-title">
            <h2 id="do-title" className="sec-title" data-reveal>What I do</h2>
            <ul className="services">
              {SERVICES.map((s, i) => (
                <li className="card service" data-reveal style={{ "--d": `${(i + 1) * 70}ms` }} key={s.title}>
                  <span className="service__icon">
                    <svg viewBox="0 0 24 24" aria-hidden="true"><path fill="currentColor" d={ICONS[s.icon]} /></svg>
                  </span>
                  <div>
                    <h3>{s.title}</h3>
                    <p>{s.text}</p>
                  </div>
                </li>
              ))}
            </ul>
          </section>

          {communities.length > 0 && (
            <section className="sec" aria-labelledby="st-title">
              <div className="sec-head" data-reveal>
                <h2 id="st-title" className="sec-title">Streamers I work with</h2>
                {active.length > 0 && (
                  <span className="sec-live"><span className="dot" aria-hidden="true" />{active.length} active</span>
                )}
              </div>
              <p className="sec-lede" data-reveal>The communities I help moderate and manage.</p>
              <ul className="tags" data-reveal aria-label="What I do for streamers">
                <li>Moderation</li>
                <li>Discord management</li>
                <li>Bots &amp; filters</li>
              </ul>
              <ul className="st-grid">
                {communities.map((entry, i) => {
                  const Tag = entry.url ? "a" : "div";
                  return (
                    <li key={`${entry.name}-${i}`} data-reveal style={{ "--d": `${Math.min(i * 30, 300)}ms` }}>
                      <Tag
                        className={`card st${entry.past ? " is-past" : ""}`}
                        {...(entry.url ? { href: entry.url, target: "_blank", rel: "noopener noreferrer" } : {})}
                        title={entry.description || undefined}
                      >
                        <span className="st__ava">
                          {entry.avatar ? (
                            // eslint-disable-next-line @next/next/no-img-element -- admin-supplied URL
                            <img src={entry.avatar} alt="" loading="lazy" width="48" height="48" />
                          ) : (
                            <span className="st__initial">{entry.name.slice(0, 1)}</span>
                          )}
                        </span>
                        <span className="st__text">
                          <span className="st__name">{entry.name}{!entry.past && VERIFIED}</span>
                          <span className="st__sub">
                            {entry.role}
                            {entry.past && entry.date ? ` · ${entry.date}` : ""}
                          </span>
                        </span>
                        {entry.past && <span className="st__badge">Past</span>}
                      </Tag>
                    </li>
                  );
                })}
              </ul>
            </section>
          )}

          <section className="sec" aria-labelledby="guides-title">
            <h2 id="guides-title" className="sec-title" data-reveal>Guides &amp; setup</h2>
            <div className="guides">
              {guides.map((g, i) => (
                <a className="card guide" href={`/pages/${g.slug}`} key={g.slug} data-reveal style={{ "--d": `${i * 70}ms` }}>
                  <span className="guide__kind">{g.category || "Guide"}</span>
                  <h3>{g.title}</h3>
                  {g.description && <p>{g.description}</p>}
                  <span className="cta">Read guide {ARROW}</span>
                </a>
              ))}
              <a className="card guide" href="/what-i-use" data-reveal style={{ "--d": `${guides.length * 70}ms` }}>
                <span className="guide__kind">Gear</span>
                <h3>What I use</h3>
                <p>The PC, peripherals and desk setup behind my streams.</p>
                <span className="cta">See my setup {ARROW}</span>
              </a>
            </div>
            <a className="more-link" href="/pages" data-reveal>All guides {ARROW}</a>
          </section>

          <section id="contact" className="sec" aria-labelledby="contact-title">
            <h2 id="contact-title" className="sec-title" data-reveal>Get in touch</h2>
            <p className="sec-lede" data-reveal>Want to reach out? Find me on any of these, or send a message below.</p>
            <ul className="contact-grid">
              {links.map((link, i) => {
                const external = !link.url.startsWith("/");
                return (
                  <li key={`${link.url}-${i}`} data-reveal style={{ "--d": `${Math.min(i * 40, 280)}ms` }}>
                    <a
                      className="card contact"
                      href={link.url}
                      {...(external ? { target: "_blank", rel: "noopener noreferrer" } : {})}
                    >
                      <span className="contact__icon"><LinkIcon link={link} /></span>
                      <span className="contact__label">{titleCase(link.label)}</span>
                      <span className="contact__handle">{handleFor(link.url)}</span>
                      {ARROW}
                    </a>
                  </li>
                );
              })}
            </ul>
            <div className="card form-card" data-reveal>
              <h3>Send a message</h3>
              <ContactForm />
            </div>
          </section>
        </main>

        <footer className="pf-foot">
          <span className="pf-foot__mark" aria-hidden="true">mattothemoon</span>
          <span>mattothemoon.xyz &copy; {new Date().getFullYear()}</span>
        </footer>
      </PresenceProvider>
    </div>
  );
}
