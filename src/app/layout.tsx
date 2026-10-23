import type { Metadata, Viewport } from "next";
import Link from "next/link";
import { Logo } from "@/components/Logo";
import { NavLink } from "@/components/NavLink";
import "./globals.css";

// CONTACT_EMAIL wird zur Laufzeit gelesen
export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: { default: "floorba11 · Luc Maradan Fotografie", template: "%s · floorba11 Fotografie" },
  description: "Spielfotos in voller Auflösung",
  robots: { index: false, follow: false, noarchive: true },
};

export const viewport: Viewport = {
  // immer hell, unabhängig von der Systemeinstellung
  themeColor: "#ffffff",
  colorScheme: "light",
};

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
            <p className="foot-brand">© {new Date().getFullYear()} floorba11 · Luc Maradan Fotografie</p>
            <p>
              Die Fotos dürfen gerne verwendet werden, wenn ich markiert werde: auf Instagram mit{" "}
              <a href="https://www.instagram.com/floorba11/" target="_blank" rel="noopener noreferrer">
                @floorba11
              </a>
              , sonst mit «Luc Maradan».
            </p>
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
