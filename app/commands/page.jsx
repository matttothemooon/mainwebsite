import "./commands.css";
import SiteShell, { PageHeader } from "@/components/site/SiteShell";
import CommandSheet from "@/components/tools/CommandSheet";
import { COMMANDS, SOURCES, GROUPS } from "@/lib/commandsData";

export const metadata = {
  title: "Mod command cheat sheet · mattothemoon",
  description: "Searchable Twitch, Fossabot and Nightbot moderation commands with copy buttons.",
  openGraph: {
    title: "Mod command cheat sheet · mattothemoon",
    description: "Searchable Twitch, Fossabot and Nightbot moderation commands with copy buttons.",
    url: "/commands",
  },
};

export default function CommandsPage() {
  return (
    <SiteShell current="tools">
      <PageHeader eyebrow="Free mod tool" title="Mod command cheat sheet" back={{ href: "/what-i-use", label: "Tools" }}>
        <p className="page-head__lede">
          The Twitch, Fossabot and Nightbot commands mods actually use, in one searchable list. Replace{" "}
          <code>username</code> and the example values with your own.
        </p>
      </PageHeader>
      <div className="sec sec--tight" data-reveal>
        <CommandSheet commands={COMMANDS} sources={SOURCES} groups={GROUPS} />
      </div>
      <p className="sec-lede cmd__sources">
        Full references:{" "}
        {Object.values(SOURCES).map((s, i) => (
          <span key={s.url}>
            {i > 0 && " · "}
            <a href={s.url} target="_blank" rel="noopener noreferrer">{s.label}</a>
          </span>
        ))}
      </p>
    </SiteShell>
  );
}
