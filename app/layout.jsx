import "./globals.css";
import "./seasons.css";
import ViewTracker from "@/components/site/ViewTracker";
import SeasonalDecor from "@/components/site/SeasonalDecor";
import { getProfile } from "@/lib/storage";
import { pickSeason } from "@/lib/seasons";
import { Space_Grotesk, Manrope, JetBrains_Mono } from "next/font/google";

const display = Space_Grotesk({ subsets: ["latin"], variable: "--font-display", display: "swap" });
const sans = Manrope({ subsets: ["latin"], variable: "--font-sans", display: "swap" });
const mono = JetBrains_Mono({ subsets: ["latin"], variable: "--font-code", display: "swap" });

export const viewport = {
  themeColor: "#0a0a0c",
};

export const metadata = {
  metadataBase: new URL("https://mattothemoon.xyz"),
  title: {
    default: "mattothemoon | Community mod & streamer",
    template: "%s",
  },
  description:
    "Community moderation, streaming, tools, and field notes from mattothemoon.",
  openGraph: {
    type: "website",
    siteName: "mattothemoon",
    title: "mattothemoon | Community mod & streamer",
    description:
      "Community moderation, streaming, tools, and field notes from mattothemoon.",
    url: "https://mattothemoon.xyz",
  },
  twitter: {
    card: "summary_large_image",
  },
};

export default async function RootLayout({ children }) {
  // Same request as the page's own profile read, so Next serves both from one fetch.
  const profile = await getProfile({ fresh: true }).catch(() => null);
  const { season, years } = pickSeason(new Date(), profile?.themes);

  return (
    <html lang="en" className={`${display.variable} ${sans.variable} ${mono.variable}`} data-season={season || undefined}>
      <body>
        {children}
        <ViewTracker />
        <SeasonalDecor season={season} years={years} />
      </body>
    </html>
  );
}
