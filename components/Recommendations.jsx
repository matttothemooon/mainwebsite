import Arrow from "@/components/site/Arrow";

// Bots and apps, grouped by category in the order they're listed.
export default function Recommendations({ items }) {
  const groups = [];
  for (const item of items) {
    let group = groups.find((g) => g.name === item.category);
    if (!group) groups.push((group = { name: item.category, items: [] }));
    group.items.push(item);
  }
  return (
    <div className="recs">
      {groups.map((g) => (
        <div className="recs__group" key={g.name} data-reveal>
          <h3>{g.name}</h3>
          <ul>
            {g.items.map((r) => (
              <li key={r.name}>
                {r.url ? (
                  <a href={r.url} target="_blank" rel="noopener noreferrer">
                    <b>{r.name}</b> <Arrow />
                  </a>
                ) : (
                  <b>{r.name}</b>
                )}
                {r.note && <span>{r.note}</span>}
              </li>
            ))}
          </ul>
        </div>
      ))}
    </div>
  );
}
