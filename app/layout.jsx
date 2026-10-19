import "./globals.css";

export const viewport = {
  themeColor: "#08080d",
};

export const metadata = {
  metadataBase: new URL("https://mattothemoon.xyz"),
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
