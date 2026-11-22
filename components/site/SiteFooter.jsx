export default function SiteFooter() {
  return (
    <footer className="pf-foot">
      <a className="pf-foot__mark" href="/" aria-label="mattothemoon home">mattothemoon</a>
      <span className="pf-foot__links">
        <a href="/guestbook">Guestbook</a>
        <a href="/haste">Paste</a>
        <span>mattothemoon.xyz &copy; {new Date().getFullYear()}</span>
      </span>
    </footer>
  );
}
