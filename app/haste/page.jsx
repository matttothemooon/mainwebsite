import "./haste.css";
import SiteShell from "@/components/site/SiteShell";
import HasteEditor from "@/components/haste/HasteEditor";
import { getPaste, isConfigured, LANGUAGES, EXPIRY_OPTIONS, DEFAULT_EXPIRY, MAX_BYTES } from "@/lib/haste";

export const metadata = {
  title: "Haste · mattothemoon",
  description: "Paste text or code and share a short link.",
};

export default async function HastePage({ searchParams }) {
  // "Duplicate & edit" opens the editor with an existing paste's text.
  const { from } = await searchParams;
  const source = from ? await getPaste(String(from)) : null;
  const expiries = Object.fromEntries(Object.entries(EXPIRY_OPTIONS).map(([k, v]) => [k, v.label]));

  return (
    <SiteShell wide>
      <HasteEditor
        initial={source?.content || ""}
        initialLanguage={source?.language || "auto"}
        languages={LANGUAGES}
        expiries={expiries}
        defaultExpiry={DEFAULT_EXPIRY}
        maxBytes={MAX_BYTES}
        configured={isConfigured()}
      />
    </SiteShell>
  );
}
