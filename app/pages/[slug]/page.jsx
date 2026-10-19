import PageContent from "@/components/PageContent";
import SiteNavigation from "@/components/SiteNavigation";
import { getProfile } from "@/lib/storage";
import { notFound } from "next/navigation";

export const revalidate = 60;

async function getPublishedPage(slug) {
  const { pages } = await getProfile({ fresh: true });
  return pages.find((page) => page.slug === slug && page.published);
}

export async function generateMetadata({ params }) {
  const { slug } = await params;
  const page = await getPublishedPage(slug);
  if (!page) return { title: "Page not found · mattothemoon" };
  return {
    title: `${page.title} · mattothemoon`,
    description: page.description || undefined,
  };
}

export default async function CustomPage({ params }) {
  const { slug } = await params;
  const profile = await getProfile({ fresh: true });
  const page = profile.pages.find((entry) => entry.slug === slug && entry.published);
  if (!page) notFound();
  const relatedPages = ["Mod resources", "Overlay resources"].includes(page.category)
    ? []
    : profile.pages
        .filter((entry) => entry.published && entry.slug !== page.slug)
        .sort((a, b) => Number(b.category === page.category) - Number(a.category === page.category))
        .slice(0, 3);

  return (
    <div className="terminal terminal--wide">
      <div className="terminal__bar"><span /><span /><span /></div>
      <main className="terminal__content">
        <SiteNavigation current="guide" />
        <p className="page-back"><a href="/pages">← streamer &amp; mod guide</a></p>
        <header className="custom-page__header">
          {page.category && <p className="home-eyebrow">{page.category}</p>}
          <h1>{page.title}</h1>
          {page.description && <p className="bio">{page.description}</p>}
        </header>
        <PageContent content={page.content} />
        {relatedPages.length > 0 && (
          <aside className="related-guides" aria-labelledby="related-guides-heading">
            <h2 id="related-guides-heading">Related guides</h2>
            <div className="related-guides__list">
              {relatedPages.map((related) => (
                <a href={`/pages/${related.slug}`} key={related.slug}>
                  <span>{related.category || "More"}</span>
                  <strong>{related.title}</strong>
                  {related.description && <small>{related.description}</small>}
                </a>
              ))}
            </div>
          </aside>
        )}
      </main>
    </div>
  );
}
