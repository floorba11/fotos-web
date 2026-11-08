import Link from "next/link";
import { AlbumBrowser } from "@/components/AlbumBrowser";
import { formatDateRange, isOtherAlbum, parseAlbumName } from "@/lib/format";
import { getAlbums, getPeople, pickHeroPhotoId } from "@/lib/immich";

export const dynamic = "force-dynamic";

export default async function Home() {
  // Personen sind optional: ohne Gesichtserkennung bleibt die Startseite trotzdem nutzbar
  const [all, players, hero] = await Promise.all([getAlbums(), getPeople().catch(() => []), pickHeroPhotoId().catch(() => null)]);
  const albums = all.filter((a) => !isOtherAlbum(a.name));
  const cards = albums.map((a) => ({
    id: a.id,
    ...parseAlbumName(a.name),
    date: formatDateRange(a.start, a.end),
    count: a.count,
    coverId: a.coverId,
  }));
  // Titelbild: zufälliger Favorit, sonst das Cover des neuesten Spiels
  const heroId = hero ?? cards.find((c) => c.coverId)?.coverId ?? null;
  const photos = albums.reduce((sum, a) => sum + a.count, 0);

  return (
    <>
      <section className={heroId ? "hero hero-photo" : "hero"}>
        {heroId && (
          <>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img className="hero-bg" src={`/img/${heroId}/preview`} alt="" fetchPriority="high" />
            <div className="hero-shade" />
          </>
        )}
        <div className="hero-in wrap">
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
        </div>
      </section>
      {albums.length ? <AlbumBrowser cards={cards} players={players} /> : <p className="empty">Noch keine Alben. Sobald die ersten Spiele hochgeladen sind, erscheinen sie hier.</p>}
    </>
  );
}
