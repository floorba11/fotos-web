import { AlbumBrowser } from "@/components/AlbumBrowser";
import { formatDateRange, parseAlbumName } from "@/lib/format";
import { getAlbums } from "@/lib/immich";

export const dynamic = "force-dynamic";

export default async function Home() {
  const albums = await getAlbums();
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
        {albums.length > 0 && (
          <p className="stats">
            <b>{albums.length}</b> Spiele · <b>{photos}</b> Fotos
          </p>
        )}
      </section>
      {albums.length ? <AlbumBrowser cards={cards} /> : <p className="empty">Noch keine Alben. Sobald die ersten Spiele hochgeladen sind, erscheinen sie hier.</p>}
    </>
  );
}
