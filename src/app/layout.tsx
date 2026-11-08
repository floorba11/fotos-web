import type { Metadata, Viewport } from "next";
import { Barlow_Condensed } from "next/font/google";
import Link from "next/link";
import { FairplayBanner } from "@/components/FairplayBanner";
import { Logo } from "@/components/Logo";
import { NavLink } from "@/components/NavLink";
import { Toaster } from "@/components/Toaster";
import "./globals.css";

// schmale Sport-Schrift für Schlagzeilen, Namen und Zahlen
const display = Barlow_Condensed({ subsets: ["latin"], weight: ["600", "700", "800"], style: ["normal", "italic"], variable: "--font-display", display: "swap" });

// CONTACT_EMAIL wird zur Laufzeit gelesen
export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: { default: "floorba11 · Luc Maradan Fotografie", template: "%s · floorba11 Fotografie" },
  description: "Spielfotos in voller Auflösung",
  robots: { index: false, follow: false, noarchive: true },
};

export const viewport: Viewport = {
  // immer hell (Maroon Mood), unabhängig von der Systemeinstellung
  themeColor: "#f8f5f5",
  colorScheme: "light",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  const contact = process.env.CONTACT_EMAIL;
  return (
    <html lang="de" className={display.variable}>
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
              <NavLink href="/spieler">Athleten</NavLink>
              <NavLink href="/weitere">Off-Court</NavLink>
            </nav>
          </div>
        </header>
        <main className="wrap">{children}</main>
        <footer className="foot">
          <div className="wrap">
            <FairplayBanner />
            <p className="foot-brand">© {new Date().getFullYear()} floorba11 · Luc Maradan Fotografie</p>
            {contact && (
              <p>
                Du möchtest nicht abgebildet sein oder ein Foto soll weg? <a href={`mailto:${contact}`}>Schreib uns</a>.
              </p>
            )}
          </div>
        </footer>
        <Toaster />
      </body>
    </html>
  );
}
