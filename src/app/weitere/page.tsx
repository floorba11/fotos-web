import type { Metadata } from "next";
import { AlbumBrowser } from "@/components/AlbumBrowser";
import { formatDateRange, isOtherAlbum, parseAlbumName } from "@/lib/format";
import { getAlbums } from "@/lib/immich";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Weitere Fotos" };

export default async function Other() {
  const albums = (await getAlbums()).filter((a) => isOtherAlbum(a.name));
  const cards = albums.map((a) => ({
    id: a.id,
    ...parseAlbumName(a.name),
    date: formatDateRange(a.start, a.end),
    count: a.count,
    coverId: a.coverId,
  }));
  return (
    <>
      <section className="hero small">
        <p className="eyebrow">Weitere Fotos</p>
        <h1>Abseits vom Spielfeld.</h1>
        <p className="lead">Natur und andere Bilder, die nichts mit Unihockey zu tun haben.</p>
      </section>
      {cards.length ? <AlbumBrowser cards={cards} base="/weitere" /> : <p className="empty">Noch keine weiteren Fotos.</p>}
    </>
  );
}
