import { getProfile } from "@/lib/storage";
import GearGuide from "@/components/GearGuide";
import PageContent from "@/components/PageContent";
import SiteNavigation from "@/components/SiteNavigation";

export const metadata = {
  title: "Tools · mattothemoon",
  description: "The gear and tools I use for streaming, moderation, and work.",
};

export default async function WhatIUsePage() {
  const profile = await getProfile({ fresh: true });
  const moderationResources = profile.pages?.find(
    (page) => page.slug === "mod-resources" && page.published
  );
  const gearCount = profile.gear?.reduce(
    (count, category) => count + (category.items?.length ?? 0),
    0
  ) ?? 0;

  return (
    <div className="terminal terminal--wide tools-page">
      <div className="terminal__bar"><span /><span /><span /></div>
      <main className="terminal__content tools-page__content">
        <SiteNavigation current="gear" />
        <header className="tools-page__header">
          <h1>Tools</h1>
          <p>Tools and resources I use and recommend.</p>
        </header>
        {moderationResources && (
          <section className="recommended-tools" aria-labelledby="recommended-tools-heading">
            <h2 id="recommended-tools-heading">Mod tools I recommend</h2>
            <p className="recommended-tools__description">Helpful resources for moderating on Twitch and Discord.</p>
            <PageContent content={moderationResources.content} />
          </section>
        )}
        {gearCount > 0 && (
          <details className="tools-setup" open>
            <summary>
              My setup
            </summary>
            <GearGuide gear={profile.gear} />
          </details>
        )}
      </main>
    </div>
  );
}
