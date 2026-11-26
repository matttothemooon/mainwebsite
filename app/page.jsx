import "./home.css";
import "./site.css";
import TopNav from "@/components/site/TopNav";
import SiteFooter from "@/components/site/SiteFooter";
import { getProfile } from "@/lib/storage";
import LinkIcon from "@/components/LinkIcon";
import DiscordDm from "@/components/site/DiscordDm";
import PresenceProvider from "@/components/PresenceProvider";
import DiscordAvatar from "@/components/DiscordAvatar";
import RotatingRole from "@/components/home/RotatingRole";
import NowPlaying from "@/components/home/NowPlaying";
import Reveal from "@/components/home/Reveal";
import StreamerGrid from "@/components/home/StreamerGrid";
import LiveProvider from "@/components/home/LiveProvider";
import { LiveAvatar, LiveBanner } from "@/components/home/SelfLive";
import Testimonials from "@/components/home/Testimonials";
import StatsStrip from "@/components/home/StatsStrip";
import { profileStats } from "@/lib/profileStats";
import { getLiveStatus, ownLogin, profileLogins } from "@/lib/twitch";
import { withLiveFollowers } from "@/lib/twitchAuth";
import { shownServers } from "@/lib/discordConnect";
import { totalViews } from "@/lib/views";
import DiscordServers from "@/components/home/DiscordServers";

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

const titleCase = (s) => s.replace(/\b\w/g, (c) => c.toUpperCase());

export default async function Home() {
  // Follower counts come from Twitch when the owner has connected it.
  const profile = await withLiveFollowers(await getProfile({ fresh: true }));
  const links = profile.links || [];
  // The Discord profile link is for the "DM me" card; the row shows the server.
  const socials = links.filter((l) => !/discord\.com\/users\//i.test(l.url));
  const active = profile.experience?.active || [];
  const past = profile.experience?.past || [];
  const communities = [
    ...active.map((e) => ({ ...e, past: false })),
    ...past.map((e) => ({ ...e, past: true })),
  ];
  const liveChannels = await getLiveStatus(profileLogins(profile));
  const myLogin = ownLogin(profile);
  const work = profile.work || { services: [] };
  const servers = await shownServers(profile);
  const counted = profile.stats?.showViews ? await totalViews() : null;
  const views = profile.stats?.showViews ? (counted || 0) + (profile.stats?.viewsOffset || 0) : null;
  const stats = profileStats(profile, { servers });

  return (
    <div className="pf">
      <Reveal />

      <LiveProvider initialChannels={liveChannels}>
      <PresenceProvider>
        <TopNav current="home" />

        <main className="pf-col">
          <div className="banner h-in" style={{ "--d": "0ms" }}>
            <span className="banner__logo" role="img" aria-label={profile.name}>
              <span className="banner__word">mattothemoon</span>
              <span className="banner__sheen" aria-hidden="true" />
            </span>
          </div>

          <header className="hero">
            <div className="hero__main">
              <p className="hero__eyebrow h-in" style={{ "--d": "0ms" }}>
                {profile.bio || "Community mod & streamer"}
              </p>
              <h1 className="hero-name h-in" style={{ "--d": "60ms" }}>
                {profile.name}
                {VERIFIED}
              </h1>
              {profile.home?.roles?.length > 0 && (
                <p className="hero-role h-in" style={{ "--d": "120ms" }}>
                  <span className="hero-role__pre">I&apos;m a</span>
                  <RotatingRole roles={profile.home.roles} />
                </p>
              )}
              {profile.about && (
                <div className="hero-bio h-in" style={{ "--d": "180ms" }}>
                  <p>{profile.about}</p>
                </div>
              )}
              {socials.length > 0 && (
                <ul className="socials h-in" style={{ "--d": "240ms" }}>
                  {socials.map((link, i) => {
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
            </div>

            <aside className="hero-card h-in" style={{ "--d": "120ms" }} aria-label="Profile">
              <LiveAvatar login={myLogin}>
                <DiscordAvatar />
              </LiveAvatar>
              <div className="hero-card__chips">
                {work.available && (
                  <a className="chip chip--open" href="/work">
                    <span className="chip__dot" aria-hidden="true" />
                    Open to new communities
                  </a>
                )}
                {Number.isFinite(views) && views > 0 && (
                  <span className="chip" title="Total visits to this site">
                    <svg viewBox="0 0 24 24" aria-hidden="true">
                      <path fill="currentColor" d="M12 5c-5 0-9 4.5-10 7 1 2.5 5 7 10 7s9-4.5 10-7c-1-2.5-5-7-10-7Zm0 11.5a4.5 4.5 0 1 1 0-9 4.5 4.5 0 0 1 0 9Zm0-2.5a2 2 0 1 0 0-4 2 2 0 0 0 0 4Z" />
                    </svg>
                    <b>{views.toLocaleString("en-US")}</b> views
                  </span>
                )}
              </div>
              <NowPlaying />
            </aside>
          </header>

          <StatsStrip stats={stats} className="h-in" style={{ "--d": "300ms" }} />

          <LiveBanner login={myLogin} />

          {work.services?.length > 0 && (
            <section className="sec" aria-labelledby="do-title">
              <h2 id="do-title" className="sec-title" data-reveal>What I do</h2>
              <p className="do-line" data-reveal>
                {work.services.map((sv, i) => (
                  <span key={sv.title}>
                    {i > 0 && <span className="do-line__sep" aria-hidden="true">/</span>}
                    {sv.title}
                  </span>
                ))}
              </p>
              <a className="more-link" href="/work" data-reveal>Work with me {ARROW}</a>
            </section>
          )}

          {communities.length > 0 && (
            <section id="streamers" className="sec" aria-labelledby="st-title">
              <StreamerGrid
                communities={communities}
                activeCount={active.length}
                tags={profile.home?.tags || []}
              />
            </section>
          )}

          {servers.length > 0 && (
            <section id="discord" className="sec" aria-labelledby="dc-title">
              <h2 id="dc-title" className="sec-title" data-reveal>Discord servers I help run</h2>
              <p className="sec-lede" data-reveal>Live member counts from Discord.</p>
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
            <DiscordDm links={links} />
          </section>
        </main>

        <SiteFooter />
      </PresenceProvider>
      </LiveProvider>
    </div>
  );
}
