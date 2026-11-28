import "../blocked-terms/blocked-terms.css";
import "./raffle.css";
import SiteShell, { PageHeader } from "@/components/site/SiteShell";
import RaffleTool from "@/components/tools/RaffleTool";

export const metadata = {
  title: "Twitch chat raffle · mattothemoon",
  description: "Run a giveaway from any Twitch chat: people type a keyword to enter, then draw a winner.",
  openGraph: {
    title: "Twitch chat raffle · mattothemoon",
    description: "Run a giveaway from any Twitch chat: people type a keyword to enter, then draw a winner.",
    url: "/raffle",
  },
};

export default function RafflePage() {
  return (
    <SiteShell current="tools">
      <PageHeader eyebrow="Free mod tool" title="Twitch chat raffle" back={{ href: "/what-i-use", label: "Tools" }}>
        <p className="page-head__lede">
          Pick a channel and a keyword. Everyone who types it in chat is entered, then draw a winner and watch
          whether they answer.
        </p>
      </PageHeader>
      <div className="sec sec--tight" data-reveal>
        <RaffleTool />
      </div>
      <p className="sec-lede bt__privacy">
        Runs in your browser and only reads chat, so there&apos;s nothing to sign in to. Announce the winner in chat
        yourself.
      </p>
    </SiteShell>
  );
}
