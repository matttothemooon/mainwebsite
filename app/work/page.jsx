import "../home.css";
import "./work.css";
import { getProfile } from "@/lib/storage";
import { getLiveStatus, profileLogins } from "@/lib/twitch";
import { profileStats } from "@/lib/profileStats";
import { withLiveFollowers } from "@/lib/twitchAuth";
import { shownServers } from "@/lib/discordConnect";
import DiscordServers from "@/components/home/DiscordServers";
import ContactForm from "@/components/ContactForm";
import LinkIcon from "@/components/LinkIcon";
import Reveal from "@/components/home/Reveal";
import LiveProvider from "@/components/home/LiveProvider";
import StatsStrip from "@/components/home/StatsStrip";
import ServiceCards from "@/components/home/ServiceCards";
import Testimonials from "@/components/home/Testimonials";

export const revalidate = 60;

export const metadata = {
  title: "Work with me · mattothemoon",
  description: "Twitch moderation, Discord setup and community management for streamers.",
  openGraph: {
    title: "Work with me · mattothemoon",
    description: "Twitch moderation, Discord setup and community management for streamers.",
    url: "/work",
  },
};

// Quick ways to reach out, picked from the social links.
function contactLinks(links = []) {
  const wanted = [
    (l) => l.url.startsWith("mailto:"),
    (l) => /discord\.com\/users\//i.test(l.url),
    (l) => /(^|\.)(x|twitter)\.com\//i.test(l.url.replace(/^https?:\/\//, "")),
    (l) => /discord\.gg\//i.test(l.url),
  ];
  const out = [];
  for (const test of wanted) {
    const link = links.find((l) => test(l) && !out.includes(l));
    if (link) out.push(link);
  }
  return out.slice(0, 3);
}

const titleCase = (s) => s.replace(/\b\w/g, (c) => c.toUpperCase());

export default async function WorkPage() {
  const profile = await withLiveFollowers(await getProfile({ fresh: true }));
  const work = profile.work || { services: [] };
  const active = profile.experience?.active || [];
  const channels = await getLiveStatus(profileLogins(profile));
  const quick = contactLinks(profile.links);
  const servers = await shownServers(profile);

  return (
    <div className="pf">
      <Reveal />
      <LiveProvider initialChannels={channels}>
        <nav className="topnav" aria-label="Main navigation">
          <a href="/">Home</a>
          <a href="/pages">Guides</a>
          <a href="/what-i-use">Tools</a>
          <a href="/work" aria-current="page">Work with me</a>
        </nav>

        <main className="pf-col work">
          <header className="work-hero" data-reveal>
            <p className="work-eyebrow">Work with me</p>
            <h1>Moderation &amp; community management for streamers</h1>
            {work.intro && <p className="work-intro">{work.intro}</p>}
            <div className="work-actions">
              <a className="btn-primary" href="#contact">Get in touch</a>
              {work.available ? (
                <span className="chip chip--open">
                  <span className="chip__dot" aria-hidden="true" />
                  Open to new communities
                </span>
              ) : null}
            </div>
            <StatsStrip stats={profileStats(profile, { servers })} />
          </header>

          {work.services?.length > 0 && (
            <section className="sec" aria-labelledby="offer-title">
              <h2 id="offer-title" className="sec-title" data-reveal>What I offer</h2>
              <ServiceCards services={work.services} />
            </section>
          )}

          {active.length > 0 && (
            <section className="sec" aria-labelledby="now-title">
              <h2 id="now-title" className="sec-title" data-reveal>Currently helping</h2>
              <ul className="work-current" data-reveal>
                {active.map((entry, i) => {
                  const avatar = (entry.twitch && channels?.[entry.twitch]?.avatar) || entry.avatar;
                  return (
                    <li key={`${entry.name}-${i}`}>
                      <a href={entry.url || undefined} target="_blank" rel="noopener noreferrer">
                        <span className="work-current__ava">
                          {avatar ? (
                            // eslint-disable-next-line @next/next/no-img-element -- remote avatar
                            <img src={avatar} alt="" loading="lazy" width="40" height="40" />
                          ) : (
                            <span>{entry.name.slice(0, 1)}</span>
                          )}
                        </span>
                        <span>
                          <b>{entry.name}</b>
                          <small>{entry.role}</small>
                        </span>
                      </a>
                    </li>
                  );
                })}
              </ul>
              <a className="more-link" href="/#streamers" data-reveal>See everyone I work with →</a>
            </section>
          )}

          {servers.length > 0 && (
            <section className="sec" aria-labelledby="dc-title">
              <h2 id="dc-title" className="sec-title" data-reveal>Discord servers I help run</h2>
              <DiscordServers servers={servers} />
            </section>
          )}

          {profile.testimonials?.length > 0 && (
            <section className="sec" aria-labelledby="quotes-title">
              <h2 id="quotes-title" className="sec-title" data-reveal>What streamers say</h2>
              <Testimonials items={profile.testimonials} />
            </section>
          )}

          <section id="contact" className="sec" aria-labelledby="contact-title">
            <h2 id="contact-title" className="sec-title" data-reveal>Get in touch</h2>
            <p className="sec-lede" data-reveal>
              Tell me about your community and what you need.
            </p>
            {quick.length > 0 && (
              <ul className="contact-grid work-quick">
                {quick.map((link, i) => (
                  <li key={link.url} data-reveal style={{ "--d": `${i * 40}ms` }}>
                    <a className="card contact" href={link.url} target="_blank" rel="noopener noreferrer">
                      <span className="contact__icon"><LinkIcon link={link} /></span>
                      <span className="contact__label">{titleCase(link.label)}</span>
                    </a>
                  </li>
                ))}
              </ul>
            )}
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
      </LiveProvider>
    </div>
  );
}
