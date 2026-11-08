import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { DownloadLink } from "@/components/DownloadLink";
import { Gallery } from "@/components/Gallery";
import { splitName } from "@/lib/name";
import { getPerson, getPersonPhotos } from "@/lib/immich";

export const dynamic = "force-dynamic";

type Props = { params: Promise<{ id: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const person = await getPerson((await params).id).catch(() => null);
  return { title: person?.name ?? "Athlet" };
}

export default async function PlayerPage({ params }: Props) {
  const { id } = await params;
  const person = await getPerson(id);
  if (!person) notFound();
  const photos = await getPersonPhotos(id);
  const { first, last } = splitName(person.name);

  return (
    <>
      <nav className="crumbs" aria-label="Zurück">
        <Link href="/spieler">← Alle Athleten</Link>
      </nav>
      <header className="profile">
        {/* grosses Wasserzeichen mit dem Nachnamen, rein dekorativ */}
        <p className="profile-mark" aria-hidden>
          {last || "Player"}
        </p>
        <div className="profile-in">
          <div className="who">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={`/face/${id}`} alt={`Porträt von ${person.name}`} />
            <div>
              {first && <span className="who-first">{first}</span>}
              <h1>{last}</h1>
              <span className="stat-badge">{photos.length} Action-Shots</span>
            </div>
          </div>
          {photos.length > 0 && (
            <DownloadLink className="btn" href={`/zip/spieler/${id}`}>
              Alle herunterladen (ZIP)
            </DownloadLink>
          )}
        </div>
      </header>
      {photos.length ? <Gallery photos={photos} label={person.name} /> : <p className="empty">Für {person.name} gibt es noch keine Fotos.</p>}
    </>
  );
}
