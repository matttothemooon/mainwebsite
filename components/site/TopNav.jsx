const LINKS = [
  { href: "/", label: "Home", key: "home" },
  { href: "/what-i-use", label: "Tools", key: "tools" },
  { href: "/work", label: "Work with me", key: "work" },
];

// The top bar used on every page: name on the left, sections on the right.
export default function TopNav({ current }) {
  return (
    <header className="topnav">
      <a className="topnav__brand" href="/">mattothemoon</a>
      <nav className="topnav__links" aria-label="Main navigation">
        {LINKS.map((link) => (
          <a key={link.key} href={link.href} aria-current={link.key === current ? "page" : undefined}>
            {link.label}
          </a>
        ))}
      </nav>
    </header>
  );
}
