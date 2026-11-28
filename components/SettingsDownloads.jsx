const size = (n) => (n >= 1024 * 1024 ? `${(n / 1024 / 1024).toFixed(1)} MB` : `${Math.max(1, Math.round(n / 1024))} KB`);

// "How to use it" text: each line is a numbered step, and lines starting
// with "- " are details under the step before.
function Steps({ text }) {
  const steps = [];
  for (const line of text.split("\n").map((l) => l.trim()).filter(Boolean)) {
    if (line.startsWith("- ") && steps.length) steps[steps.length - 1].details.push(line.slice(2));
    else steps.push({ text: line, details: [] });
  }
  return (
    <ol className="dl__steps">
      {steps.map((s, i) => (
        <li key={i}>
          {s.text}
          {s.details.length > 0 && (
            <ul>
              {s.details.map((d, j) => (
                <li key={j}>{d}</li>
              ))}
            </ul>
          )}
        </li>
      ))}
    </ol>
  );
}

export default function SettingsDownloads({ items }) {
  return (
    <div className="dl">
      {items.map((d) => (
        <div className="card dl__item" key={d.id} data-reveal>
          <div className="dl__head">
            <div>
              <h3>{d.title}</h3>
              {d.description && <p>{d.description}</p>}
            </div>
            <a className="btn-primary dl__btn" href={`/files/${d.file.id}/${d.file.name}`} download={d.file.name}>
              Download <span className="dl__size">{size(d.file.size)}</span>
            </a>
          </div>
          {d.steps && (
            <details className="dl__how">
              <summary>How to use it</summary>
              <Steps text={d.steps} />
            </details>
          )}
        </div>
      ))}
    </div>
  );
}
