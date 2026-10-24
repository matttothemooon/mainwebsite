import StreamOverlayCard from "@/components/StreamOverlayCard";
import SiteNavigation from "@/components/SiteNavigation";

export const metadata = {
  title: "Stream overlays · mattothemoon",
  description: "OBS browser-source overlays and setup notes.",
};

export default function StreamOverlaysPage() {
  const siteUrl = (process.env.SITE_URL || "https://www.mattothemoon.xyz").replace(/\/+$/, "");

  return (
    <div className="terminal terminal--wide">
      <div className="terminal__bar"><span /><span /><span /></div>
      <main className="terminal__content overlay-hub">
        <SiteNavigation current="overlays" />
        <p className="page-back"><a href="/">← back</a></p>
        <header className="guide-index__header">
          <p className="home-eyebrow">obs stuff</p>
          <h1>Stream overlays</h1>
          <p className="bio">
            Set up a sub-goal overlay for your channel. Each streamer connects
            their own Twitch account here; no site-admin access needed.
          </p>
        </header>

        <StreamOverlayCard siteUrl={siteUrl} />

        <footer className="overlay-hub__footer">
          <span>If I make more, I’ll put them here.</span>
          <a href="/pages/overlay-resources">Browse overlay resources ↗</a>
          <a href="/pages">Check out my mod notes ↗</a>
        </footer>
      </main>
    </div>
  );
}
