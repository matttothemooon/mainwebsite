const links = [
  { href: "/", label: "Home", section: "home" },
  { href: "/what-i-use", label: "What I use", section: "gear" },
  { href: "/stream-overlays", label: "Stream overlays", section: "overlays" },
  { href: "/pages", label: "Mod guide", section: "guide" },
];

export default function SiteNavigation({ current }) {
  return (
    <nav className="site-navigation" aria-label="Main navigation">
      {links.map((link) => (
        <a
          aria-current={link.section === current ? "page" : undefined}
          className={link.section === current ? "site-navigation__link site-navigation__link--current" : "site-navigation__link"}
          href={link.href}
          key={link.href}
        >
          {link.label}
        </a>
      ))}
    </nav>
  );
}
