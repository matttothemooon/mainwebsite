import "./home.css";
import { getProfile } from "@/lib/storage";
import SocialLinks from "@/components/SocialLinks";
import Experience from "@/components/Experience";
import SiteNavigation from "@/components/SiteNavigation";
import ContactForm from "@/components/ContactForm";
import PresenceProvider from "@/components/PresenceProvider";
import DiscordAvatar from "@/components/DiscordAvatar";

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

export default async function Home() {
  const profile = await getProfile({ fresh: true });

  return (
    <div className="terminal terminal--wide tw-home">
      <PresenceProvider>
        <div className="terminal__content">
          <header className="tw-top">
            <a className="tw-logo" href="/">{profile.name}</a>
            <SiteNavigation current="home" />
          </header>

        <main className="tw-main">
          <section className="tw-hero" aria-labelledby="tw-name">
            <div className="tw-hero__text">
              <p className="tw-prompt">~/home</p>
              <div className="tw-title-row">
                <DiscordAvatar />
                <h1 id="tw-name">Matt</h1>
              </div>
              <p className="tw-bio">{profile.bio}</p>
              {profile.about && <p className="tw-about">{profile.about}</p>}
              <div className="tw-actions">
                <a className="tw-action tw-action--primary" href="/pages">Browse my guides</a>
              </div>
              <SocialLinks links={profile.links} />
            </div>
          </section>

          <section id="mods" className="tw-section" aria-labelledby="mods-heading">
            <h2 id="mods-heading">Mod list</h2>
            <Experience experience={profile.experience} />
          </section>

          <section id="contact" className="tw-contact-section" aria-labelledby="contact-heading">
            <header className="tw-contact-section__heading">
              <span>03</span>
              <h2 id="contact-heading">Contact</h2>
            </header>
            <ContactForm />
          </section>
        </main>

        <footer className="tw-foot">
          <span>&copy; {new Date().getFullYear()} {profile.name}.</span>
        </footer>
        </div>
      </PresenceProvider>
    </div>
  );
}
