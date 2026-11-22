import "../haste.css";
import { notFound } from "next/navigation";
import SiteShell from "@/components/site/SiteShell";
import CopyButton from "@/components/haste/CopyButton";
import { getPaste, LANGUAGES } from "@/lib/haste";
import { highlight } from "@/lib/highlight";

// Pastes are visitor content: keep them out of search results.
export async function generateMetadata({ params }) {
  const { id } = await params;
  return {
    title: `Paste ${id} · mattothemoon`,
    robots: { index: false, follow: false },
  };
}

function timeLeft(iso) {
  const ms = Date.parse(iso) - Date.now();
  const h = Math.round(ms / 3600000);
  if (h < 1) return "in under an hour";
  if (h < 48) return `in ${h} hour${h === 1 ? "" : "s"}`;
  return `in ${Math.round(h / 24)} days`;
}

export default async function PastePage({ params }) {
  const { id } = await params;
  const paste = await getPaste(id);
  if (!paste) notFound();

  const { html, language } = highlight(paste.content, paste.language);
  const lines = paste.content.split("\n").length;

  return (
    <SiteShell wide>
      <div className="haste-view">
        <div className="haste-bar">
          <span className="haste-bar__title">
            <span className="haste-bar__host">mattothemoon.xyz/haste/</span>
            <b>{paste.id}</b>
          </span>
          <div className="haste-bar__controls">
            <CopyButton text={paste.content} />
            <a className="chip" href={`/haste/${paste.id}/raw`}>Raw</a>
            <a className="chip" href={`/haste?from=${paste.id}`}>Duplicate &amp; edit</a>
            <a className="btn-primary" href="/haste">New</a>
          </div>
        </div>

        <div className="haste-code">
          <pre className="haste-code__gutter" aria-hidden="true">
            {Array.from({ length: lines }, (_, i) => i + 1).join("\n")}
          </pre>
          <pre className="haste-code__body">
            <code className={`hljs language-${language}`} dangerouslySetInnerHTML={{ __html: html }} />
          </pre>
        </div>

        <div className="haste-foot">
          <span>{LANGUAGES[language] || language} · {lines} line{lines === 1 ? "" : "s"}</span>
          <span>Expires {timeLeft(paste.expiresAt)}</span>
        </div>
      </div>
    </SiteShell>
  );
}
