export default function StatsStrip({ stats, className = "", style }) {
  if (!stats?.length) return null;
  return (
    <dl className={`stats ${className}`.trim()} style={style}>
      {stats.map((stat) => (
        <div className="stats__item" key={stat.label}>
          <dt>{stat.label}</dt>
          <dd>{stat.value}</dd>
        </div>
      ))}
    </dl>
  );
}
