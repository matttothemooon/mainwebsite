import { getProfile } from "@/lib/storage";
import SiteShell, { PageHeader } from "@/components/site/SiteShell";
import Arrow from "@/components/site/Arrow";

export const revalidate = 60;

export const metadata = {
  title: "Streamer & Mod Guide · mattothemoon",
  description: "Field notes on moderation, stream setup, and community life.",
  openGraph: {
    title: "Streamer & Mod Guide · mattothemoon",
    description: "Field notes on moderation, stream setup, and community life.",
    url: "/pages",
  },
};

const CATEGORY_ORDER = ["Moderation", "Mod resources", "Stream setup", "FAQ", "More"];
const categoryId = (category) => `guide-${category.toLowerCase().replace(/[^a-z0-9]+/g, "-")}`;

export default async function PagesIndex() {
  const { pages } = await getProfile({ fresh: true });
  const published = pages.filter((page) => page.published);
  const rank = (c) => (CATEGORY_ORDER.indexOf(c) === -1 ? CATEGORY_ORDER.length : CATEGORY_ORDER.indexOf(c));
  const categories = [...new Set(published.map((page) => page.category || "More"))].sort((a, b) => rank(a) - rank(b));
  const inCategory = (category) => published.filter((page) => (page.category || "More") === category);

  return (
    <SiteShell current="guides">
      <PageHeader eyebrow="Notes from the stream" title="Streamer & Mod Guide">
        <p className="page-head__lede">
          Stuff I’ve picked up modding streams and putting my own setup together. I’ll keep adding to it when I
          have something useful to share.
        </p>
        {categories.length > 1 && (
          <ul className="pill-nav" aria-label="Guide categories">
            {categories.map((category) => (
              <li key={category}>
                <a href={`#${categoryId(category)}`}>
                  {category}
                  <span>{inCategory(category).length}</span>
                </a>
              </li>
            ))}
          </ul>
        )}
      </PageHeader>

      {published.length ? (
        categories.map((category) => (
          <section
            className="sec sec--tight"
            id={categoryId(category)}
            key={category}
            aria-labelledby={`${categoryId(category)}-heading`}
          >
            <h2 className="sec-title sec-title--sm" id={`${categoryId(category)}-heading`} data-reveal>
              {category}
              <span className="sec-count">{inCategory(category).length}</span>
            </h2>
            <div className="guides">
              {inCategory(category).map((page, i) => (
                <a className="card guide" href={`/pages/${page.slug}`} key={page.slug} data-reveal style={{ "--d": `${i * 70}ms` }}>
                  <span className="guide__kind">{category}</span>
                  <h3>{page.title}</h3>
                  {page.description && <p>{page.description}</p>}
                  <span className="cta">Read guide <Arrow /></span>
                </a>
              ))}
            </div>
          </section>
        ))
      ) : (
        <p className="sec-lede" data-reveal>No guides published yet.</p>
      )}
    </SiteShell>
  );
}
