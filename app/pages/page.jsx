import { getProfile } from "@/lib/storage";

export const revalidate = 60;

export const metadata = {
  title: "Pages · mattothemoon",
  description: "Pages from mattothemoon.",
};

export default async function PagesIndex() {
  const { pages } = await getProfile();
  const publishedPages = pages.filter((page) => page.published);

  return (
    <div className="terminal terminal--wide">
      <div className="terminal__bar"><span /><span /><span /></div>
      <main className="terminal__content">
        <p className="page-back"><a href="/">← back</a></p>
        <h1>Pages</h1>
        <p className="bio">Things I’ve made, collected, or want to share.</p>
        {publishedPages.length ? (
          <nav className="page-list" aria-label="Published pages">
            {publishedPages.map((page) => (
              <a className="page-list__item" href={`/pages/${page.slug}`} key={page.slug}>
                <span className="page-list__text">
                  <strong>{page.title}</strong>
                  {page.description && <span>{page.description}</span>}
                </span>
                <span className="page-list__arrow" aria-hidden="true">→</span>
              </a>
            ))}
          </nav>
        ) : (
          <p className="text-dim">No pages published yet.</p>
        )}
      </main>
    </div>
  );
}
