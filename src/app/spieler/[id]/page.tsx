import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Gallery } from "@/components/Gallery";
import { getPerson, getPersonPhotos } from "@/lib/immich";

export const dynamic = "force-dynamic";

type Props = { params: Promise<{ id: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const person = await getPerson((await params).id).catch(() => null);
  return { title: person?.name ?? "Spieler" };
}

export default async function PlayerPage({ params }: Props) {
  const { id } = await params;
  const person = await getPerson(id);
  if (!person) notFound();
  const photos = await getPersonPhotos(id);

  return (
    <>
      <nav className="crumbs" aria-label="Zurück">
        <Link href="/spieler">← Alle Spieler</Link>
      </nav>
      <header className="page-head">
        <div className="who">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={`/face/${id}`} alt="" />
          <div>
            <p className="eyebrow">Spieler</p>
            <h1 className="h-album">{person.name}</h1>
            <p className="meta">{photos.length} Fotos aus allen Spielen</p>
          </div>
        </div>
        {photos.length > 0 && (
          <a className="btn" href={`/zip/spieler/${id}`}>
            Alle herunterladen (ZIP)
          </a>
        )}
      </header>
      {photos.length ? <Gallery photos={photos} /> : <p className="empty">Für {person.name} gibt es noch keine Fotos.</p>}
    </>
  );
}
