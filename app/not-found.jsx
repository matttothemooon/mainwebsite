import SiteShell, { PageHeader } from "@/components/site/SiteShell";

export const metadata = { title: "Page not found · mattothemoon" };

export default function NotFound() {
  return (
    <SiteShell>
      <div className="not-found">
        <PageHeader eyebrow="404" title="Page not found">
          <p className="page-head__lede">That page doesn’t exist, or it was moved.</p>
          <div className="page-actions">
            <a className="btn-primary" href="/">Back home</a>
            <a className="chip" href="/pages">Browse guides</a>
          </div>
        </PageHeader>
      </div>
    </SiteShell>
  );
}
