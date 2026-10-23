import Link from "next/link";
import { AlbumBrowser } from "@/components/AlbumBrowser";
import { formatDateRange, isOtherAlbum, parseAlbumName } from "@/lib/format";
import { getAlbums, getPeople } from "@/lib/immich";

export const dynamic = "force-dynamic";

export default async function Home() {
  // Personen sind optional: ohne Gesichtserkennung bleibt die Startseite trotzdem nutzbar
  const [all, players] = await Promise.all([getAlbums(), getPeople().catch(() => [])]);
  const albums = all.filter((a) => !isOtherAlbum(a.name));
  const cards = albums.map((a) => ({
    id: a.id,
    ...parseAlbumName(a.name),
    date: formatDateRange(a.start, a.end),
    count: a.count,
    coverId: a.coverId,
  }));
  const photos = albums.reduce((sum, a) => sum + a.count, 0);

  return (
    <>
      <section className="hero">
        <p className="eyebrow">Spielfotos</p>
        <h1>Deine Spiele. Deine Fotos.</h1>
        <p className="lead">Such dein Spiel oder deinen Namen und lade die Bilder in voller Auflösung herunter.</p>
        <p className="hero-actions">
          <a className="btn" href="#spiele">
            Nach Spiel
          </a>
          <Link className="btn btn-light" href="/spieler">
            Nach Spieler
          </Link>
        </p>
        {albums.length > 0 && (
          <p className="stats">
            <b>{albums.length}</b> Spiele · <b>{players.length}</b> Spieler · <b>{photos}</b> Fotos
          </p>
        )}
      </section>
      {albums.length ? <AlbumBrowser cards={cards} players={players} /> : <p className="empty">Noch keine Alben. Sobald die ersten Spiele hochgeladen sind, erscheinen sie hier.</p>}
    </>
  );
}
