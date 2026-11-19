const LINKS = [
  { href: "/", label: "Home", key: "home" },
  { href: "/pages", label: "Guides", key: "guides" },
  { href: "/what-i-use", label: "Tools", key: "tools" },
  { href: "/work", label: "Work with me", key: "work" },
];

// The floating pill navigation used on every page.
export default function TopNav({ current }) {
  return (
    <nav className="topnav" aria-label="Main navigation">
      {LINKS.map((link) => (
        <a key={link.key} href={link.href} aria-current={link.key === current ? "page" : undefined}>
          {link.label}
        </a>
      ))}
    </nav>
  );
}
