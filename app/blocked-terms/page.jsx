import "./blocked-terms.css";
import SiteShell, { PageHeader } from "@/components/site/SiteShell";
import BlockedTermsTool from "@/components/tools/BlockedTermsTool";

export const metadata = {
  title: "Blocked-terms generator · mattothemoon",
  description: "Turn a word into the spellings people use to dodge filters, ready for Twitch Blocked Terms and Discord AutoMod.",
  openGraph: {
    title: "Blocked-terms generator · mattothemoon",
    description: "Turn a word into the spellings people use to dodge filters, ready for Twitch Blocked Terms and Discord AutoMod.",
    url: "/blocked-terms",
  },
};

export default function BlockedTermsPage() {
  return (
    <SiteShell current="tools">
      <PageHeader eyebrow="Free mod tool" title="Blocked-terms generator" back={{ href: "/what-i-use", label: "Tools" }}>
        <p className="page-head__lede">
          Type a word and get the spellings people use to get around filters, like sc4m, s c a m or ѕсаm with
          look-alike letters. Copy them into Twitch Blocked Terms or Discord AutoMod.
        </p>
      </PageHeader>
      <div className="sec sec--tight" data-reveal>
        <BlockedTermsTool />
      </div>
      <p className="sec-lede bt__privacy">Runs entirely in your browser. Nothing you type is sent anywhere.</p>
    </SiteShell>
  );
}
