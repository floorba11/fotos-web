"use client";

import { useCallback, useEffect, useState } from "react";

export type GalleryPhoto = { id: string; name: string; width: number; height: number };

export function Gallery({ photos }: { photos: GalleryPhoto[] }) {
  const [open, setOpen] = useState<number | null>(null);
  const [touchX, setTouchX] = useState<number | null>(null);

  const step = useCallback((d: number) => setOpen((i) => (i === null ? i : (i + d + photos.length) % photos.length)), [photos.length]);

  useEffect(() => {
    if (open === null) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(null);
      else if (e.key === "ArrowRight") step(1);
      else if (e.key === "ArrowLeft") step(-1);
    };
    document.addEventListener("keydown", onKey);
    document.body.style.overflow = "hidden";
    // nächstes und vorheriges Bild schon laden, damit das Blättern flüssig bleibt
    for (const d of [1, -1]) new Image().src = `/img/${photos[(open + d + photos.length) % photos.length].id}/preview`;
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = "";
    };
  }, [open, photos, step]);

  const current = open === null ? null : photos[open];

  return (
    <>
      <div className="grid">
        {photos.map((p, i) => (
          <button
            key={p.id}
            className="tile"
            // Blocksatz-Raster: jede Kachel wächst im Verhältnis ihres Seitenverhältnisses
            style={{ "--ar": p.width && p.height ? p.width / p.height : 1.5 } as React.CSSProperties}
            onClick={() => setOpen(i)}
            aria-label={`Foto ${i + 1} vergrössern`}
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={`/img/${p.id}/thumbnail`} alt="" loading="lazy" width={p.width} height={p.height} />
          </button>
        ))}
        <span className="grid-fill" aria-hidden />
      </div>

      {current && (
        <div
          className="lb"
          role="dialog"
          aria-modal="true"
          aria-label={`Foto ${open! + 1} von ${photos.length}`}
          onClick={() => setOpen(null)}
          onTouchStart={(e) => setTouchX(e.touches[0].clientX)}
          onTouchEnd={(e) => {
            if (touchX !== null) {
              const dx = e.changedTouches[0].clientX - touchX;
              if (Math.abs(dx) > 60) step(dx < 0 ? 1 : -1);
            }
            setTouchX(null);
          }}
        >
          <button className="lb-btn close" aria-label="Schliessen" onClick={() => setOpen(null)}>
            ×
          </button>
          <button
            className="lb-btn prev"
            aria-label="Vorheriges Foto"
            onClick={(e) => {
              e.stopPropagation();
              step(-1);
            }}
          >
            ‹
          </button>
          <figure onClick={(e) => e.stopPropagation()}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img key={current.id} src={`/img/${current.id}/preview`} alt={`Foto ${open! + 1}`} />
            <figcaption>
              <span>
                {open! + 1} / {photos.length}
              </span>
              <a href={`/img/${current.id}/original?download=1`} download>
                Original herunterladen
              </a>
            </figcaption>
          </figure>
          <button
            className="lb-btn next"
            aria-label="Nächstes Foto"
            onClick={(e) => {
              e.stopPropagation();
              step(1);
            }}
          >
            ›
          </button>
        </div>
      )}
    </>
  );
}
