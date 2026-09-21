export default function GearGuide({ gear }) {
  if (!gear?.length) return null;

  return (
    <div className="gear-grid">
      {gear.map((category) => (
        <section className="gear-category" key={category.name}>
          <h2>{category.name}</h2>
          <dl>
            {category.items.map((item) => (
              <div className="gear-item" key={`${item.label}-${item.value}`}>
                <dt>{item.label}</dt>
                <dd>
                  {item.url ? (
                    <a className="gear-item__product-link" href={item.url} target="_blank" rel="noreferrer">
                      {item.value}
                      {item.imageUrl && (
                        <span className="gear-item__preview">
                          <img src={item.imageUrl} alt="" loading="lazy" />
                        </span>
                      )}
                    </a>
                  ) : (
                    <>
                      {item.value}
                      {item.imageUrl && (
                        <img className="gear-item__image" src={item.imageUrl} alt="" loading="lazy" />
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
