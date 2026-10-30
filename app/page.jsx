import "./home.css";
import { getProfile } from "@/lib/storage";
import SocialLinks from "@/components/SocialLinks";
import StatusBlock from "@/components/StatusBlock";
import Experience from "@/components/Experience";
import SiteNavigation from "@/components/SiteNavigation";

// Content comes from the profile, so the admin panel keeps controlling it.
// The admin panel revalidates this path on save.
export const revalidate = 60;

export async function generateMetadata() {
  const { name, bio } = await getProfile({ fresh: true });
  return {
    title: name,
    description: bio,
    openGraph: { title: name, description: bio, url: "https://mattothemoon.xyz" },
    twitter: { card: "summary" },
  };
}

// ---- tonight's moon -------------------------------------------------------
const SYNODIC = 29.530588853; // days between new moons
const REF_NEW_MOON = Date.UTC(2000, 0, 6, 18, 14); // a known new moon
const PHASES = [
  ["new moon", "🌑"], ["waxing crescent", "🌒"], ["first quarter", "🌓"], ["waxing gibbous", "🌔"],
  ["full moon", "🌕"], ["waning gibbous", "🌖"], ["last quarter", "🌗"], ["waning crescent", "🌘"],
];

function moonTonight(now = new Date()) {
  const days = (now.getTime() - REF_NEW_MOON) / 86400000;
  const p = ((days / SYNODIC) % 1 + 1) % 1; // 0 new, .5 full
  const lit = (1 - Math.cos(2 * Math.PI * p)) / 2;
  const [label, emoji] = PHASES[Math.round(p * 8) % 8];
  return { p, lit, label, emoji };
}

// Lit part of the disc as an SVG path. Waning phases are drawn mirrored.
function litPath(p, r = 50, c = 60) {
  const k = Math.cos(2 * Math.PI * p);
  const rx = Math.abs(k) * r;
  const back = k > 0 ? 0 : 1; // crescent bulges right, gibbous bulges left
  return `M ${c} ${c - r} A ${r} ${r} 0 0 1 ${c} ${c + r} A ${rx.toFixed(2)} ${r} 0 0 ${back} ${c} ${c - r} Z`;
}

function Moon({ moon }) {
  const waning = moon.p > 0.5;
  return (
    <svg className="tw-moon" viewBox="0 0 120 120" role="img" aria-label={`Tonight's moon: ${moon.label}, ${Math.round(moon.lit * 100)}% lit`}>
      <defs>
        <clipPath id="tw-lit"><path d={litPath(moon.p)} transform={waning ? "translate(120 0) scale(-1 1)" : undefined} /></clipPath>
      </defs>
      <circle cx="60" cy="60" r="50" className="tw-moon__dark" />
      <g clipPath="url(#tw-lit)">
        <circle cx="60" cy="60" r="50" className="tw-moon__lit" />
        <circle cx="44" cy="46" r="9" className="tw-moon__crater" />
        <circle cx="74" cy="64" r="12" className="tw-moon__crater" />
        <circle cx="52" cy="80" r="6" className="tw-moon__crater" />
        <circle cx="80" cy="38" r="5" className="tw-moon__crater" />
      </g>
    </svg>
  );
}

// ---- example chat, answered from the profile -------------------------------
function buildChat(profile, moon) {
  const active = (profile.experience?.active || []).map((e) => e.name);
  const socials = (profile.links || []).map((l) => l.label.toLowerCase());
  const list = (items) => (items.length > 1 ? `${items.slice(0, -1).join(", ")} and ${items.at(-1)}` : items[0] || "");

  const lines = [
    { user: "lena_ffm", color: "#ff7f50", text: "!whoami" },
    { me: profile.name, text: profile.bio },
  ];
  if (active.length) {
    lines.push({ user: "kaito", color: "#1e90ff", text: "!mods" });
    lines.push({ me: profile.name, text: `right now I'm keeping chat nice for ${list(active)}.` });
  }
  lines.push({ user: "copypasta99", color: "#daa520", deleted: true });
  lines.push({ me: profile.name, text: "timed out copypasta99 for 60 seconds.", sys: true });
  if (socials.length) {
    lines.push({ user: "mira", color: "#9acd32", text: "!socials" });
    lines.push({ me: profile.name, text: `find me on ${list(socials)}.` });
  }
  lines.push({ user: "night_owl", color: "#ff69b4", text: "!moon" });
  lines.push({
    me: profile.name,
    text: `${moon.emoji} ${moon.label}, ${Math.round(moon.lit * 100)}% lit tonight.`,
  });
  return lines;
}

export default async function Home() {
  const profile = await getProfile({ fresh: true });
  const pages = (profile.pages || []).filter((page) => page.published);
  const moon = moonTonight();
  const chat = buildChat(profile, moon);

  return (
    <div className="tw-home">
      <header className="tw-top">
        <a className="tw-logo" href="/">{profile.name}</a>
        <SiteNavigation current="home" />
      </header>

      <main className="tw-main">
        <section className="tw-hero" aria-labelledby="tw-name">
          <div className="tw-hero__text">
            <h1 id="tw-name">{profile.name}</h1>
            <p className="tw-bio">{profile.bio}</p>
            {profile.about && <p className="tw-about">{profile.about}</p>}
            <SocialLinks links={profile.links} />
          </div>
          <figure className="tw-hero__moon">
            <Moon moon={moon} />
            <figcaption>{moon.emoji} {moon.label} tonight</figcaption>
          </figure>
        </section>

        <nav className="tw-chips" aria-label="Jump to">
          <a href="#status">!status</a>
          <a href="#mods">!mods</a>
          <a href="/what-i-use">!tools</a>
          {pages.map((page) => (
            <a href={`/pages/${page.slug}`} key={page.slug} title={page.description || page.title}>!{page.slug}</a>
          ))}
        </nav>

        <section className="tw-chat" aria-label="Example stream chat">
          <div className="tw-chat__head"><span>#{profile.name}</span><span>example chat</span></div>
          <ol>
            {chat.map((line, i) => (
              <li key={i} className={line.sys ? "tw-sys" : undefined} style={{ "--i": i }}>
                {line.me && (
                  <>
                    <span className="tw-badge" aria-label="moderator">&#9876;</span>
                    <b className="tw-user tw-user--me">{line.me}</b>
                  </>
                )}
                {line.user && <b className="tw-user" style={{ color: line.color }}>{line.user}</b>}
                {line.sys ? " " : ": "}
                {line.deleted ? <em>Message deleted by a moderator.</em> : line.text}
              </li>
            ))}
          </ol>
        </section>

        <div id="status" className="tw-section"><StatusBlock /></div>

        <section id="mods" className="tw-section" aria-labelledby="mods-heading">
          <h2 id="mods-heading">Mod list</h2>
          <Experience experience={profile.experience} />
        </section>
      </main>

      <footer className="tw-foot">
        <span>&copy; {new Date().getFullYear()} {profile.name}. Moon phase is calculated, not live.</span>
      </footer>
    </div>
  );
}
