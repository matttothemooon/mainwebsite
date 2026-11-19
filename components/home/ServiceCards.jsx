const ICONS = {
  shield: "M12 2 4 5v6c0 5 3.4 9.4 8 11 4.6-1.6 8-6 8-11V5l-8-3Zm-1 13.6-3.3-3.3 1.4-1.4 1.9 1.9 4.6-4.6 1.4 1.4-6 6Z",
  filter: "M3 4.5A1.5 1.5 0 0 1 4.5 3h15a1.5 1.5 0 0 1 1.1 2.5L15 11.6V19a1 1 0 0 1-1.5.9l-3-1.8A1 1 0 0 1 10 17.2v-5.6L3.4 5.5A1.5 1.5 0 0 1 3 4.5Z",
  bolt: "M13 2 4 14h7l-1 8 9-12h-7l1-8Z",
  users: "M16 11a3 3 0 1 0 0-6 3 3 0 0 0 0 6Zm-8 0a3 3 0 1 0 0-6 3 3 0 0 0 0 6Zm0 2c-2.7 0-8 1.3-8 4v2h16v-2c0-2.7-5.3-4-8-4Zm8 0c-.3 0-.7 0-1.1.1 1.3.9 2.1 2.2 2.1 3.9v2h7v-2c0-2.7-5.3-4-8-4Z",
};

// Icons for the cards, in order.
const ORDER = ["shield", "users", "filter", "bolt"];

export default function ServiceCards({ services = [] }) {
  if (!services.length) return null;
  return (
    <ul className="services">
      {services.map((s, i) => (
        <li className="card service" data-reveal style={{ "--d": `${(i + 1) * 70}ms` }} key={`${s.title}-${i}`}>
          <span className="service__icon">
            <svg viewBox="0 0 24 24" aria-hidden="true">
              <path fill="currentColor" d={ICONS[ORDER[i % ORDER.length]]} />
            </svg>
          </span>
          <div>
            <h3>{s.title}</h3>
            {s.text && <p>{s.text}</p>}
          </div>
        </li>
      ))}
    </ul>
  );
}
