import { getProfile } from "@/lib/storage";
import SocialLinks from "@/components/SocialLinks";
import StatusBlock from "@/components/StatusBlock";
import Experience from "@/components/Experience";
import SiteNavigation from "@/components/SiteNavigation";

// The old static page fetched its content client-side and needed an inline
// bootstrap copy to avoid a flash. Rendering on the server removes both — and
// the admin panel revalidates this path on save, so edits appear immediately
// rather than waiting out the window.
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

export default async function Home() {
  const profile = await getProfile({ fresh: true });

  return (
    <div className="terminal terminal--home">
      <main className="terminal__content home-page">
        <SiteNavigation current="home" />

        <header className="home-hero">
          <div className="home-hero__content">
            <h1>{profile.name}</h1>
            <p className="bio">{profile.bio}</p>
            <SocialLinks links={profile.links} />
          </div>
        </header>

        {profile.about && (
          <section className="about-section" aria-labelledby="about-heading">
            <h2 id="about-heading">A little about me</h2>
            <p>{profile.about}</p>
          </section>
        )}

        <StatusBlock />
        <section className="experience-section" aria-labelledby="experience-heading">
          <h2 id="experience-heading">Mod list</h2>
          <Experience experience={profile.experience} />
        </section>
      </main>
    </div>
  );
}
