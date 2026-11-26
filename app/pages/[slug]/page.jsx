import { notFound } from "next/navigation";
import { getProfile } from "@/lib/storage";
import PageContent from "@/components/PageContent";
import SiteShell, { PageHeader } from "@/components/site/SiteShell";
import Arrow from "@/components/site/Arrow";

export const revalidate = 60;

async function getPublishedPage(slug) {
  const { pages } = await getProfile({ fresh: true });
  return pages.find((page) => page.slug === slug && page.published);
}

export async function generateMetadata({ params }) {
  const { slug } = await params;
  const page = await getPublishedPage(slug);
  if (!page) return { title: "Page not found · mattothemoon" };
  const description = page.description || undefined;
  return {
    title: `${page.title} · mattothemoon`,
    description,
    openGraph: {
      title: `${page.title} · mattothemoon`,
      description,
      url: `/pages/${page.slug}`,
    },
  };
}

export default async function CustomPage({ params }) {
  const { slug } = await params;
  const profile = await getProfile({ fresh: true });
  const page = profile.pages.find((entry) => entry.slug === slug && entry.published);
  if (!page) notFound();
  const relatedPages = ["Mod resources"].includes(page.category)
    ? []
    : profile.pages
        .filter((entry) => entry.published && entry.slug !== page.slug)
        .sort((a, b) => Number(b.category === page.category) - Number(a.category === page.category))
        .slice(0, 3);

  return (
    <SiteShell current="tools">
      <article>
        <PageHeader eyebrow={page.category} title={page.title} back={{ href: "/what-i-use#guides", label: "Tools" }}>
          {page.description && <p className="page-head__lede">{page.description}</p>}
        </PageHeader>
        <div data-reveal>
          <PageContent content={page.content} />
        </div>
      </article>

      {relatedPages.length > 0 && (
        <aside className="sec sec--tight" aria-labelledby="related-guides-heading">
          <h2 id="related-guides-heading" className="sec-title sec-title--sm" data-reveal>Related guides</h2>
          <div className="guides">
            {relatedPages.map((related, i) => (
              <a className="card guide" href={`/pages/${related.slug}`} key={related.slug} data-reveal style={{ "--d": `${i * 70}ms` }}>
                <span className="guide__kind">{related.category || "More"}</span>
                <h3>{related.title}</h3>
                {related.description && <p>{related.description}</p>}
                <span className="cta">Read guide <Arrow /></span>
              </a>
            ))}
          </div>
        </aside>
      )}
    </SiteShell>
  );
}
