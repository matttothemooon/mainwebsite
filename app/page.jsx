import { getProfile } from "@/lib/storage";
import SocialLinks from "@/components/SocialLinks";
import StatusBlock from "@/components/StatusBlock";
import Experience from "@/components/Experience";

// The old static page fetched its content client-side and needed an inline
// bootstrap copy to avoid a flash. Rendering on the server removes both — and
// the admin panel revalidates this path on save, so edits appear immediately
// rather than waiting out the window.
export const revalidate = 60;

export async function generateMetadata() {
  const { name, bio } = await getProfile();
  return {
    title: name,
    description: bio,
    openGraph: { title: name, description: bio, url: "https://mattothemoon.xyz" },
    twitter: { card: "summary" },
  };
}

export default async function Home() {
  const profile = await getProfile();

  return (
    <div className="terminal">
      <div className="terminal__bar">
        <span />
        <span />
        <span />
      </div>

      <main className="terminal__content">
        <h1>{profile.name}</h1>
        <p className="bio">{profile.bio}</p>

        <SocialLinks links={profile.links} />
        <StatusBlock />
        <Experience experience={profile.experience} />
      </main>
    </div>
  );
}
