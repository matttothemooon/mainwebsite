import { resolveIcon } from "@/lib/icons";

// Icons only — no labels. The label still carries the accessible name, since an
// icon-only link is otherwise unreadable to a screen reader.
export default function SocialLinks({ links = [] }) {
  if (!links.length) return null;

  return (
    <nav className="links" aria-label="social links">
      {links.map((link, i) => {
        const icon = resolveIcon(link);
        const external = !link.url.startsWith("/");

        return (
          <a
            key={`${link.url}-${i}`}
            href={link.url}
            title={link.label}
            aria-label={link.label}
            {...(external ? { target: "_blank", rel: "noopener noreferrer" } : {})}
          >
            {icon.type === "image" ? (
              // eslint-disable-next-line @next/next/no-img-element -- arbitrary
              // admin-supplied URL; next/image would need a remote allowlist.
              <img src={icon.src} alt="" aria-hidden="true" />
            ) : (
              <svg viewBox="0 0 24 24" role="img" aria-hidden="true" focusable="false">
                <path d={icon.path} />
              </svg>
            )}
          </a>
        );
      })}
    </nav>
  );
}
