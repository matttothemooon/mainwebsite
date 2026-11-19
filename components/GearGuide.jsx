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

// Gear as a compact list; hovering an item's link shows its photo. Items with
// an uploaded image use it; the rest get the picture from their product link,
// looked up on the server.
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
          <ul className="gear-list">
            {category.items.map((item, i) => {
              const Tag = item.url ? "a" : "span";
              return (
                <li className="gear-row" key={`${item.label}-${item.value}-${i}`}>
                  <span className="gear-row__label">{item.label}</span>
                  <Tag
                    className="gear-row__name"
                    {...(item.url ? { href: item.url, target: "_blank", rel: "noopener noreferrer" } : { tabIndex: 0 })}
                  >
                    {/* Small thumbnail on touch screens; a hover card elsewhere. */}
                    {item.image && (
                      <span className="gear-row__thumb" aria-hidden="true">
                        <GearImage src={item.image} />
                      </span>
                    )}
                    <span className="gear-row__text">{item.value}</span>
                    {item.url && ARROW}
                    {item.image && (
                      <span className="gear-pop" aria-hidden="true">
                        <span className="gear-pop__media">
                          <GearImage src={item.image} />
                        </span>
                        <span className="gear-pop__caption">{item.value}</span>
                      </span>
                    )}
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
