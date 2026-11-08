import Link from "next/link";
import { AlbumBrowser } from "@/components/AlbumBrowser";
import { PlayerSearch } from "@/components/PlayerSearch";
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
          <p className="eyebrow">Gameday Archiv · Unihockey Fotografie</p>
          <h1>
            Vollgas auf dem Feld. <em>Für immer im Kasten.</em>
          </h1>
          <p className="lead">Finde dein Spiel oder filtere direkt nach deinem Gesicht – alle Action-Shots in voller Auflösung zum direkten Download.</p>
          {players.length > 0 && <PlayerSearch players={players} />}
          <p className="hero-actions">
            <a className="btn" href="#spiele">
              Nach Spiel
            </a>
            <Link className="btn btn-light" href="/spieler">
              Nach Athleten
            </Link>
          </p>
          {albums.length > 0 && (
            <ul className="stat-cubes" aria-label="Archiv in Zahlen">
              <li>
                <b>{albums.length}</b>
                <span>Spiele</span>
              </li>
              <li>
                <b>{players.length}</b>
                <span>Athleten</span>
              </li>
              <li>
                <b>{photos}</b>
                <span>Fotos</span>
              </li>
            </ul>
          )}
        </div>
      </section>
      {albums.length ? <AlbumBrowser cards={cards} /> : <p className="empty">Noch keine Alben. Sobald die ersten Spiele hochgeladen sind, erscheinen sie hier.</p>}
    </>
  );
}
