import { getProfile } from "@/lib/storage";
import SiteNavigation from "@/components/SiteNavigation";

export const revalidate = 60;

export const metadata = {
  title: "Streamer & Mod Guide · mattothemoon",
  description: "Field notes on moderation, stream setup, and community life.",
};

export default async function PagesIndex() {
  const { pages } = await getProfile({ fresh: true });
  const publishedPages = pages.filter((page) => page.published);
  const categoryOrder = ["Moderation", "Mod resources", "Stream setup", "Overlay resources", "FAQ", "More"];
  const categories = [...new Set(
    publishedPages.map((page) => page.category || "More")
  )].sort((a, b) => {
    const aIndex = categoryOrder.indexOf(a);
    const bIndex = categoryOrder.indexOf(b);
    return (aIndex === -1 ? categoryOrder.length : aIndex) -
      (bIndex === -1 ? categoryOrder.length : bIndex);
  });
  const categoryId = (category) =>
    `guide-${category.toLowerCase().replace(/[^a-z0-9]+/g, "-")}`;

  return (
    <div className="terminal terminal--wide">
      <div className="terminal__bar"><span /><span /><span /></div>
      <main className="terminal__content guide-index">
        <SiteNavigation current="guide" />
        <p className="page-back"><a href="/">← back</a></p>
        <header className="guide-index__header">
          <p className="home-eyebrow">notes from the stream</p>
          <h1>Streamer &amp; Mod Guide</h1>
          <p className="bio">Stuff I’ve picked up modding streams and putting my own setup together. I’ll keep adding to it when I have something useful to share.</p>
          <p className="guide-index__browse-hint">Browse by topic, or jump straight to a guide.</p>
          {categories.length > 1 && (
            <nav className="guide-category-nav" aria-label="Guide categories">
              {categories.map((category) => (
                <a href={`#${categoryId(category)}`} key={category}>{category}</a>
              ))}
            </nav>
          )}
          <a className="guide-index__related" href="/stream-overlays">See my stream overlay ↗</a>
        </header>
        {publishedPages.length ? (
          categories.map((category) => (
            <section
              className="guide-category"
              id={categoryId(category)}
              key={category}
              aria-labelledby={`${categoryId(category)}-heading`}
            >
              <h2 className="guide-category__heading" id={`${categoryId(category)}-heading`}>
                {category}
                <span>{publishedPages.filter((page) => (page.category || "More") === category).length}</span>
              </h2>
              <div className="guide-card-grid">
                {publishedPages
                  .filter((page) => (page.category || "More") === category)
                  .map((page) => (
                    <a className="guide-card" href={`/pages/${page.slug}`} key={page.slug}>
                      <strong className="guide-card__title">{page.title}</strong>
                      {page.description && <span className="guide-card__description">{page.description}</span>}
                      <span className="guide-card__arrow" aria-hidden="true">↗</span>
                    </a>
                  ))}
              </div>
            </section>
          ))
        ) : (
          <p className="text-dim">No pages published yet.</p>
        )}
      </main>
    </div>
  );
}
