import { AlbumBrowser } from "@/components/AlbumBrowser";
import { formatDateRange, isOtherAlbum, parseAlbumName } from "@/lib/format";
import { getAlbums, pickHeroPhotoId } from "@/lib/immich";

export const dynamic = "force-dynamic";

export default async function Home() {
  // Titelbild ist optional: ohne Favoriten bleibt die Startseite trotzdem nutzbar
  const [all, hero] = await Promise.all([getAlbums(), pickHeroPhotoId().catch(() => null)]);
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
        </div>
      </section>
      {albums.length ? <AlbumBrowser cards={cards} /> : <p className="empty">Noch keine Alben. Sobald die ersten Spiele hochgeladen sind, erscheinen sie hier.</p>}
    </>
  );
}
