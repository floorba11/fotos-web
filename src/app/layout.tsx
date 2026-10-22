import type { Metadata, Viewport } from "next";
import Link from "next/link";
import { Logo } from "@/components/Logo";
import { NavLink } from "@/components/NavLink";
import "./globals.css";

// CONTACT_EMAIL wird zur Laufzeit gelesen
export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: { default: "Luc Maradan · floorba11 Fotografie", template: "%s · floorba11 Fotografie" },
  description: "Spielfotos in voller Auflösung",
  robots: { index: false, follow: false, noarchive: true },
};

export const viewport: Viewport = { themeColor: "#fafaf8", colorScheme: "light" };

export default function RootLayout({ children }: { children: React.ReactNode }) {
  const contact = process.env.CONTACT_EMAIL;
  return (
    <html lang="de">
      <body>
        <header className="top">
          <div className="wrap top-in">
            <Link href="/" className="brand" aria-label="Startseite">
              <Logo />
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
            <p className="foot-brand">© {new Date().getFullYear()} Luc Maradan · floorba11 Fotografie</p>
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
