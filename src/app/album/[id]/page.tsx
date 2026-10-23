import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Gallery } from "@/components/Gallery";
import { MatchTitle } from "@/components/MatchTitle";
import { formatDateRange, isOtherAlbum, parseAlbumName } from "@/lib/format";
import { getAlbum, getAlbumPhotos } from "@/lib/immich";

export const dynamic = "force-dynamic";

type Props = { params: Promise<{ id: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const album = await getAlbum((await params).id).catch(() => null);
  return { title: album ? parseAlbumName(album.name).title : "Album" };
}

export default async function AlbumPage({ params }: Props) {
  const { id } = await params;
  const album = await getAlbum(id);
  if (!album) notFound();
  const photos = await getAlbumPhotos(id);
  const { season, title } = parseAlbumName(album.name);

  return (
    <>
      <nav className="crumbs" aria-label="Zurück">
        {isOtherAlbum(album.name) ? <Link href="/weitere">← Weitere Fotos</Link> : <Link href="/">← Alle Spiele</Link>}
      </nav>
      <header className="page-head">
        <div>
          {season && <p className="eyebrow">{season}</p>}
          <h1 className="h-album">
            <MatchTitle title={title} />
          </h1>
          <p className="meta">
            {formatDateRange(album.start, album.end)}
            {formatDateRange(album.start, album.end) && " · "}
            {photos.length} Fotos
          </p>
        </div>
        <a className="btn" href={`/zip/album/${id}`}>
          Alle herunterladen (ZIP)
        </a>
      </header>
      <Gallery photos={photos} />
    </>
  );
}
