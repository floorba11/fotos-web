"use client";

import { useMemo, useState } from "react";
import { Gallery, type GalleryPhoto } from "./Gallery";
import "@/styles/album-filter.css";

type AlbumPerson = { id: string; name: string; photoIds: string[] };

/** Galerie mit Filterleiste: Klick auf eine markierte Person zeigt nur ihre Fotos, nochmal klicken hebt den Filter auf */
export function AlbumGallery({ photos, people, label }: { photos: GalleryPhoto[]; people: AlbumPerson[]; label?: string }) {
  const [filterId, setFilterId] = useState<string | null>(null);

  const shown = useMemo(() => {
    const person = people.find((p) => p.id === filterId);
    if (!person) return photos;
    const ids = new Set(person.photoIds);
    return photos.filter((p) => ids.has(p.id));
  }, [photos, people, filterId]);

  return (
    <>
      {people.length > 0 && (
        <div className="af">
          <span className="af-label">In diesem Spiel markiert:</span>
          <div className="af-list">
            {people.map((p) => (
              <button
                key={p.id}
                type="button"
                className="af-btn"
                title={p.name}
                aria-label={p.name}
                aria-pressed={filterId === p.id}
                onClick={() => setFilterId((cur) => (cur === p.id ? null : p.id))}
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={`/face/${p.id}`} alt="" width={36} height={36} loading="lazy" />
              </button>
            ))}
          </div>
          {filterId && (
            <span className="af-count" aria-live="polite">
              {shown.length} von {photos.length} Fotos
            </span>
          )}
        </div>
      )}
      <Gallery key={filterId ?? "alle"} photos={shown} label={label} />
    </>
  );
}
