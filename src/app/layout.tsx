import type { Metadata, Viewport } from "next";
import Link from "next/link";
import { NavLink } from "@/components/NavLink";
import "./globals.css";

// CONTACT_EMAIL wird zur Laufzeit gelesen
export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: { default: "floorba11 · Fotos", template: "%s · floorba11 Fotos" },
  description: "Spielfotos in voller Auflösung",
  robots: { index: false, follow: false, noarchive: true },
};

export const viewport: Viewport = { themeColor: "#0a0e17", colorScheme: "dark" };

export default function RootLayout({ children }: { children: React.ReactNode }) {
  const contact = process.env.CONTACT_EMAIL;
  return (
    <html lang="de">
      <body>
        <header className="top">
          <div className="wrap top-in">
            <Link href="/" className="brand" aria-label="Startseite">
              <span className="brand-dot" aria-hidden />
              floorba11<b>Fotos</b>
            </Link>
            <nav aria-label="Hauptnavigation">
              <NavLink href="/" exact>
                Spiele
              </NavLink>
              <NavLink href="/spieler">Spieler</NavLink>
            </nav>
          </div>
        </header>
        <main className="wrap">{children}</main>
        <footer className="foot">
          <div className="wrap">
            <p>Die Fotos sind nur für die Spielerinnen und Spieler gedacht. Bitte nicht öffentlich weiterverbreiten.</p>
            {contact && (
              <p>
                Du möchtest nicht abgebildet sein oder ein Foto soll weg? <a href={`mailto:${contact}`}>Schreib uns</a>.
              </p>
            )}
          </div>
        </footer>
      </body>
    </html>
  );
}
