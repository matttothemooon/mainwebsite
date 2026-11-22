import "./gear.css";
import { getProfile } from "@/lib/storage";
import GearGuide from "@/components/GearGuide";
import PageContent from "@/components/PageContent";
import SiteShell, { PageHeader } from "@/components/site/SiteShell";
import Arrow from "@/components/site/Arrow";

export const metadata = {
  title: "Tools · mattothemoon",
  description: "The gear and tools I use for streaming, moderation, and work.",
  openGraph: {
    title: "Tools · mattothemoon",
    description: "The gear and tools I use for streaming, moderation, and work.",
    url: "/what-i-use",
  },
};

export default async function WhatIUsePage() {
  const profile = await getProfile({ fresh: true });
  const moderationResources = profile.pages?.find(
    (page) => page.slug === "mod-resources" && page.published
  );
  const gearCount = profile.gear?.reduce((count, category) => count + (category.items?.length ?? 0), 0) ?? 0;

  return (
    <SiteShell current="tools">
      <PageHeader eyebrow="Tools" title="What I use">
        <p className="page-head__lede">The tools, resources and gear I use and recommend.</p>
      </PageHeader>

      <section className="sec sec--tight" aria-labelledby="free-tools-heading">
        <h2 id="free-tools-heading" className="sec-title sec-title--sm" data-reveal>Free mod tools</h2>
        <div className="guides">
          <a className="card guide" href="/blocked-terms" data-reveal>
            <span className="guide__kind">Twitch &amp; Discord</span>
            <h3>Blocked-terms generator</h3>
            <p>Turn a word into the spellings people use to dodge filters, ready to paste into Blocked Terms or AutoMod.</p>
            <span className="cta">Open the tool <Arrow /></span>
          </a>
          <a className="card guide" href="/haste" data-reveal style={{ "--d": "70ms" }}>
            <span className="guide__kind">Sharing</span>
            <h3>Haste</h3>
            <p>Paste logs, configs or code and share a short link that expires on its own.</p>
            <span className="cta">Open Haste <Arrow /></span>
          </a>
        </div>
      </section>

      {moderationResources && (
        <section className="sec sec--tight" aria-labelledby="recommended-tools-heading">
          <h2 id="recommended-tools-heading" className="sec-title sec-title--sm" data-reveal>Mod tools I recommend</h2>
          <p className="sec-lede" data-reveal>Helpful resources for moderating on Twitch and Discord.</p>
          <div className="card link-card" data-reveal>
            <PageContent content={moderationResources.content} />
          </div>
        </section>
      )}

      {gearCount > 0 && (
        <section className="sec sec--tight" id="setup" aria-labelledby="setup-heading">
          <h2 id="setup-heading" className="sec-title sec-title--sm" data-reveal>My setup</h2>
          <GearGuide gear={profile.gear} />
        </section>
      )}
    </SiteShell>
  );
}
