import type { Metadata } from "next";
import { PlayerBrowser } from "@/components/PlayerBrowser";
import { getPeople } from "@/lib/immich";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Spieler" };

export default async function Players() {
  const people = await getPeople();
  return (
    <>
      <section className="hero small">
        <p className="eyebrow">Spielerinnen und Spieler</p>
        <h1>
          Finde <em>dich.</em>
        </h1>
        <p className="lead">Klick auf dein Gesicht und sieh alle Fotos, auf denen du bist, aus allen Spielen.</p>
      </section>
      {people.length ? <PlayerBrowser players={people} /> : <p className="empty">Noch keine Spieler benannt.</p>}
    </>
  );
}
