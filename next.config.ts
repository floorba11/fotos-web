import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: "standalone",
  poweredByHeader: false,
  async headers() {
    // Die Galerie zeigt Gesichter und Namen von Personen: Suchmaschinen sollen weder Seiten noch Bilder noch
    // Downloads aufnehmen (gilt für alle Pfade, auch /img, /face, /zip und public/)
    return [
      {
        source: "/:path*",
        headers: [{ key: "X-Robots-Tag", value: "noindex, nofollow, noarchive, nosnippet, noimageindex" }],
      },
    ];
  },
};

export default nextConfig;
