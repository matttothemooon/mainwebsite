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
                <dd>{item.value}</dd>
              </div>
            ))}
          </dl>
        </section>
      ))}
    </div>
  );
}
