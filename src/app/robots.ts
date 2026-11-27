import type { MetadataRoute } from "next";

// Absichtlich KEIN "Disallow: /": Google muss die Seiten abrufen dürfen, sonst sieht es das noindex
// (Header X-Robots-Tag + <meta robots>) nie und kann die blosse Adresse trotzdem in die Treffer aufnehmen,
// wenn sie irgendwo verlinkt ist. Das noindex sorgt dafür, dass nichts in der Suche erscheint.
export default function robots(): MetadataRoute.Robots {
  return { rules: { userAgent: "*", allow: "/" } };
}
