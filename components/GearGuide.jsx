import GearImage from "./GearImage";
import { findProductImage } from "@/lib/productImage";

const isPlaceholder = (item) =>
  item.label.trim().toLowerCase() === "example" &&
  item.value.trim().toLowerCase() === "add a product in the admin panel";

const ARROW = (
  <svg viewBox="0 0 24 24" aria-hidden="true">
    <path d="M7 17 17 7M9 7h8v8" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);

// Gear as product cards. Items with an uploaded image use it; the rest get
// the picture from their product link, looked up on the server.
export default async function GearGuide({ gear }) {
  const categories = (gear || [])
    .map((category) => ({
      ...category,
      items: (category.items || []).filter((item) => !isPlaceholder(item)),
    }))
    .filter((category) => category.name.trim() && category.items.length);

  if (!categories.length) return null;

  const withImages = await Promise.all(
    categories.map(async (category) => ({
      ...category,
      items: await Promise.all(
        category.items.map(async (item) => ({
          ...item,
          image: item.imageUrl || (item.url ? await findProductImage(item.url) : null),
        }))
      ),
    }))
  );

  return (
    <div className="gear-shelf">
      {withImages.map((category) => (
        <section className="gear-shelf__category" key={category.name} aria-label={category.name}>
          <h2>{category.name}</h2>
          <ul className="gear-shelf__grid">
            {category.items.map((item, i) => {
              const Tag = item.url ? "a" : "div";
              return (
                <li key={`${item.label}-${item.value}-${i}`}>
                  <Tag
                    className="gear-card"
                    {...(item.url ? { href: item.url, target: "_blank", rel: "noopener noreferrer" } : {})}
                  >
                    <span className="gear-card__media">
                      <GearImage src={item.image} />
                    </span>
                    <span className="gear-card__body">
                      <span className="gear-card__label">{item.label}</span>
                      <span className="gear-card__name">{item.value}</span>
                      {item.url && <span className="gear-card__cta">View {ARROW}</span>}
                    </span>
                  </Tag>
                </li>
              );
            })}
          </ul>
        </section>
      ))}
    </div>
  );
}
