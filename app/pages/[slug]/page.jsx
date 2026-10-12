import PageContent from "@/components/PageContent";
import { getProfile } from "@/lib/storage";
import { notFound } from "next/navigation";

export const revalidate = 60;

async function getPublishedPage(slug) {
  const { pages } = await getProfile();
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
  const page = await getPublishedPage(slug);
  if (!page) notFound();

  return (
    <div className="terminal terminal--wide">
      <div className="terminal__bar"><span /><span /><span /></div>
      <main className="terminal__content">
        <p className="page-back"><a href="/pages">← all pages</a></p>
        <header className="custom-page__header">
          <h1>{page.title}</h1>
          {page.description && <p className="bio">{page.description}</p>}
        </header>
        <PageContent content={page.content} />
      </main>
    </div>
  );
}
