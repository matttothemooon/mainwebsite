import "./globals.css";

export const viewport = {
  themeColor: "#08080d",
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
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
