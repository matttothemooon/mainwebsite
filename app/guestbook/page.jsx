import "./guestbook.css";
import SiteShell, { PageHeader } from "@/components/site/SiteShell";
import GuestbookForm from "@/components/guestbook/GuestbookForm";
import { approvedEntries, isConfigured, MAX_NAME, MAX_MESSAGE } from "@/lib/guestbook";

export const metadata = {
  title: "Guestbook · mattothemoon",
  description: "Leave a message on mattothemoon's site.",
  openGraph: { title: "Guestbook · mattothemoon", description: "Leave a message on mattothemoon's site.", url: "/guestbook" },
};

const when = (iso) => new Date(iso).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });

export default async function GuestbookPage() {
  const entries = isConfigured() ? await approvedEntries().catch(() => []) : [];

  return (
    <SiteShell>
      <PageHeader eyebrow="Guestbook" title="Sign the guestbook">
        <p className="page-head__lede">Say hi, leave a note, shout out your community. Every message goes through the mod queue first.</p>
      </PageHeader>

      <section className="sec sec--tight" aria-label="Write a message">
        <div data-reveal>
          <GuestbookForm maxName={MAX_NAME} maxMessage={MAX_MESSAGE} configured={isConfigured()} />
        </div>
      </section>

      <section className="sec sec--tight" aria-labelledby="gb-title">
        <h2 id="gb-title" className="sec-title sec-title--sm" data-reveal>
          Messages<span className="sec-count">{entries.length}</span>
        </h2>
        {entries.length ? (
          <ul className="gb-list">
            {entries.map((e, i) => (
              <li key={e.id} className="card gb-entry" data-reveal style={{ "--d": `${Math.min(i * 40, 280)}ms` }}>
                <span className="gb-entry__ava" aria-hidden="true">{e.name.slice(0, 1).toUpperCase()}</span>
                <div>
                  <div className="gb-entry__head">
                    <b>{e.name}</b>
                    <time dateTime={e.createdAt}>{when(e.createdAt)}</time>
                  </div>
                  <p>{e.message}</p>
                </div>
              </li>
            ))}
          </ul>
        ) : (
          <p className="sec-lede" data-reveal>No messages yet. Be the first!</p>
        )}
      </section>
    </SiteShell>
  );
}
