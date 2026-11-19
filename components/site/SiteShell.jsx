import "@/app/home.css";
import "@/app/site.css";
import Reveal from "@/components/home/Reveal";
import TopNav from "./TopNav";
import SiteFooter from "./SiteFooter";

// The frame every inner page shares with the home page: floating nav,
// centred column, scroll reveals and footer.
export default function SiteShell({ current, children, wide = false }) {
  return (
    <div className="pf">
      <Reveal />
      <TopNav current={current} />
      <main className={`pf-col pf-page${wide ? " pf-page--wide" : ""}`}>{children}</main>
      <SiteFooter />
    </div>
  );
}

// Eyebrow + big title + intro, as on the Work page.
export function PageHeader({ eyebrow, title, children, back }) {
  return (
    <header className="page-head" data-reveal>
      {back && (
        <a className="page-head__back" href={back.href}>
          <span aria-hidden="true">←</span> {back.label}
        </a>
      )}
      {eyebrow && <p className="page-head__eyebrow">{eyebrow}</p>}
      <h1>{title}</h1>
      {children}
    </header>
  );
}
