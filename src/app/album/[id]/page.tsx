import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { AlbumGallery } from "@/components/AlbumGallery";
import { DownloadLink } from "@/components/DownloadLink";
import { MatchTitle } from "@/components/MatchTitle";
import { formatDateRange, isOtherAlbum, parseAlbumName } from "@/lib/format";
import { getAlbum, getAlbumPeople, getAlbumPhotos } from "@/lib/immich";
import { parseAlbumTitle } from "@/lib/parseAlbumTitle";

export const dynamic = "force-dynamic";

type Props = { params: Promise<{ id: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const album = await getAlbum((await params).id).catch(() => null);
  return { title: album ? parseAlbumTitle(parseAlbumName(album.name).title).cleanTitle : "Album" };
}

export default async function AlbumPage({ params }: Props) {
  const { id } = await params;
  const album = await getAlbum(id);
  if (!album) notFound();
  const other = isOtherAlbum(album.name);
  // markierte Spieler sind optional: fällt Immich aus, bleibt die Galerie trotzdem nutzbar
  const [photos, people] = await Promise.all([getAlbumPhotos(id), other ? Promise.resolve([]) : getAlbumPeople(id).catch(() => [])]);
  const { season, title } = parseAlbumName(album.name);
  const parsed = parseAlbumTitle(title);
  const date = formatDateRange(album.start, album.end);

  return (
    <>
      <nav className="crumbs" aria-label="Zurück">
        {other ? <Link href="/weitere">← Off-Court</Link> : <Link href="/">← Alle Spiele</Link>}
      </nav>
      <header className="page-head">
        <div>
          <div className="head-badges">
            {season && <p className="eyebrow">{season}</p>}
            {!other && parsed.competition && <span className={parsed.isCup ? "badge badge-cup" : "badge badge-glass"}>{parsed.competition.label}</span>}
          </div>
          <h1 className="h-album">
            <MatchTitle title={title} />
          </h1>
          <p className="meta">
            {date}
            {date && " · "}
            {photos.length} Fotos
            {parsed.location && ` · ${parsed.location}`}
          </p>
        </div>
        <DownloadLink className="btn" href={`/zip/album/${id}`}>
          Alle herunterladen (ZIP)
        </DownloadLink>
      </header>
      <AlbumGallery photos={photos} people={people} label={parsed.cleanTitle || title} />
    </>
  );
}
