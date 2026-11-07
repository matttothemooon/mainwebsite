import LinkIcon from "./LinkIcon";

export default function SocialLinks({ links = [] }) {
  if (!links.length) return null;

  return (
    <nav className="links" aria-label="social links">
      {links.map((link, i) => {
        const external = !link.url.startsWith("/");

        return (
          <a
            key={`${link.url}-${i}`}
            href={link.url}
            title={link.label}
            aria-label={link.label}
            {...(external ? { target: "_blank", rel: "noopener noreferrer" } : {})}
          >
            <span className="links__icon">
              <LinkIcon link={link} />
            </span>
            <span className="links__label">{link.label}</span>
          </a>
        );
      })}
    </nav>
  );
}
