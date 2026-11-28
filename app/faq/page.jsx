import "./faq.css";
import { getProfile } from "@/lib/storage";
import PageContent from "@/components/PageContent";
import SiteShell, { PageHeader } from "@/components/site/SiteShell";
import DiscordDm from "@/components/site/DiscordDm";

export const revalidate = 60;

export const metadata = {
  title: "FAQ · mattothemoon",
  description: "Answers to what people ask me most about modding, bots and my setup.",
  openGraph: { title: "FAQ · mattothemoon", description: "Answers to what people ask me most about modding, bots and my setup.", url: "/faq" },
};

export default async function FaqPage() {
  const profile = await getProfile({ fresh: true });
  const faq = profile.faq || [];

  return (
    <SiteShell current="faq">
      <PageHeader eyebrow="FAQ" title="Questions people ask">
        <p className="page-head__lede">The things I get asked most. Don&apos;t see yours? Ask me on Discord.</p>
      </PageHeader>

      <section className="sec sec--tight" aria-label="Questions">
        {faq.length ? (
          <div className="faq">
            {faq.map((f, i) => (
              <details className="faq__item" key={i} data-reveal open={i === 0}>
                <summary>{f.q}</summary>
                <div className="faq__a">
                  <PageContent content={f.a} />
                </div>
              </details>
            ))}
          </div>
        ) : (
          <p className="sec-lede">No questions yet.</p>
        )}
      </section>

      <section className="sec sec--tight" aria-label="Ask a question">
        <DiscordDm links={profile.links} />
      </section>
    </SiteShell>
  );
}
