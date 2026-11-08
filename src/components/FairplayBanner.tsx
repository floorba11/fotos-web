import { CopyButton } from "./CopyButton";
import "@/styles/fairplay.css";

export function FairplayBanner() {
  return (
    <aside className="fp-banner" aria-labelledby="fp-title">
      <div className="fp-text">
        <h2 id="fp-title">Fairplay-Regel: Fotos gratis, Credit Pflicht.</h2>
        <p>
          Lade dir deine Bilder in voller Auflösung herunter. Beim Posten auf Instagram oder Social Media einfach
          @floorba11 markieren.
        </p>
        <a className="fp-link" href="https://www.instagram.com/floorba11/" target="_blank" rel="noopener noreferrer">
          @floorba11 auf Instagram
        </a>
      </div>
      <div className="fp-actions">
        <CopyButton text="@floorba11" label="@floorba11 kopieren" doneMessage="Kopiert! Ab auf Insta damit 🔥" />
        <CopyButton text="Foto: Luc Maradan" label="Foto: Luc Maradan kopieren" doneMessage="Kopiert!" />
      </div>
    </aside>
  );
}
