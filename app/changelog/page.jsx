import { getProfile } from "@/lib/storage";

export const metadata = {
  title: "Changelog · mattothemoon",
  description: "Updates to mattothemoon’s website.",
};

export default async function ChangelogPage() {
  const { changelog } = await getProfile();
  return (
    <div className="terminal terminal--wide">
      <div className="terminal__bar"><span /><span /><span /></div>
      <main className="terminal__content">
        <p className="page-back"><a href="/">← back</a></p>
        <h1>Changelog</h1>
        <div className="changelog">
          {changelog.length ? changelog.map((entry) => (
            <article className="changelog__entry" key={entry.id}>
              <p className="changelog__date">
                {new Date(entry.date).toLocaleDateString()}
              </p>
              <h2>{entry.title}</h2>
              <p>{entry.body}</p>
            </article>
          )) : <p className="text-dim">No updates yet.</p>}
        </div>
      </main>
    </div>
  );
}
