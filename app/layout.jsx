import "./globals.css";
import { Bricolage_Grotesque, Geist } from "next/font/google";

const display = Bricolage_Grotesque({ subsets: ["latin"], variable: "--font-display", display: "swap" });
const sans = Geist({ subsets: ["latin"], variable: "--font-sans", display: "swap" });

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
    images: ["/opengraph-image"],
  },
  twitter: {
    card: "summary_large_image",
    images: ["/opengraph-image"],
  },
};

export default function RootLayout({ children }) {
  return (
    <html lang="en" className={`${display.variable} ${sans.variable}`}>
      <body>{children}</body>
    </html>
  );
}
