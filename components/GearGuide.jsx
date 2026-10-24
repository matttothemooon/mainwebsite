export default function GearGuide({ gear }) {
  const categories = gear
    ?.map((category) => ({
      ...category,
      items: category.items.filter((item) => {
        const label = item.label.trim().toLowerCase();
        const value = item.value.trim().toLowerCase();
        return !(label === "example" && value === "add a product in the admin panel");
      }),
    }))
    .filter((category) => category.name.trim() && category.items.length);

  if (!categories?.length) return null;

  return (
    <div className="gear-grid">
      {categories.map((category) => (
        <section className="gear-category" key={category.name}>
          <h2>{category.name}</h2>
          <dl>
            {category.items.map((item) => (
              <div className="gear-item" key={`${item.label}-${item.value}`}>
                <dt>{item.label}</dt>
                <dd>
                  {item.url ? (
                    <a className="gear-item__product-link" href={item.url} target="_blank" rel="noopener noreferrer">
                      {item.value}
                      {item.imageUrl && (
                        <span className="gear-item__preview">
                          <img src={item.imageUrl} alt="" loading="lazy" decoding="async" />
                        </span>
                      )}
                    </a>
                  ) : (
                    <>
                      {item.value}
                      {item.imageUrl && (
                        <img className="gear-item__image" src={item.imageUrl} alt="" loading="lazy" decoding="async" />
                      )}
                    </>
                  )}
                </dd>
              </div>
            ))}
          </dl>
        </section>
      ))}
    </div>
  );
}
