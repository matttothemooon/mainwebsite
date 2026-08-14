/** @type {import('next').NextConfig} */
const nextConfig = {
  // Streamer avatars and custom link icons are arbitrary remote URLs entered in
  // the admin panel, so they're rendered with plain <img>. Nothing here needs
  // next/image's remote allowlist.
  images: { unoptimized: true },

  // The Decap CMS is plain static files in public/. Next serves those by exact
  // path only, so /cms needs pointing at its index.
  async rewrites() {
    return [
      { source: "/cms", destination: "/cms/index.html" },
      { source: "/cms/", destination: "/cms/index.html" },
    ];
  },

  async headers() {
    return [
      {
        // Uploaded icons may be SVG, which can carry scripts. Locally they are
        // served from this origin out of public/uploads, so they get a CSP that
        // makes them inert. (In production they live on the Vercel Blob origin.)
        source: "/uploads/:path*",
        headers: [
          { key: "Content-Security-Policy", value: "default-src 'none'; style-src 'unsafe-inline'; sandbox" },
          { key: "X-Content-Type-Options", value: "nosniff" },
        ],
      },
    ];
  },
};

export default nextConfig;
