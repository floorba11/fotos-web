"use client";

import Link from "next/link";
import { useState } from "react";
import { groupBySeason } from "@/lib/format";
import { MatchTitle } from "./MatchTitle";

export type AlbumCard = { id: string; season: string | null; title: string; date: string; count: number; coverId: string | null };

export function AlbumBrowser({ cards }: { cards: AlbumCard[] }) {
  const [q, setQ] = useState("");
  const needle = q.trim().toLowerCase();
  const shown = needle ? cards.filter((c) => `${c.title} ${c.season ?? ""}`.toLowerCase().includes(needle)) : cards;

  return (
    <>
      <div className="search">
        <input type="search" value={q} onChange={(e) => setQ(e.target.value)} placeholder="Spiel oder Gegner suchen …" aria-label="Spiele durchsuchen" />
      </div>
      {groupBySeason(shown).map((g) => (
        <section key={g.season} aria-labelledby={`s-${g.season}`}>
          <h2 id={`s-${g.season}`} className="section">
            {g.season}
          </h2>
          <div className="cards">
            {g.items.map((c) => (
              <Link key={c.id} href={`/album/${c.id}`} className="card">
                <div className="card-img">
                  {c.coverId ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={`/img/${c.coverId}/preview`} alt="" loading="lazy" />
                  ) : null}
                </div>
                <div className="card-body">
                  <h3>
                    <MatchTitle title={c.title} />
                  </h3>
                  <p>
                    {c.date && <>{c.date} · </>}
                    {c.count} Fotos
                  </p>
                </div>
              </Link>
            ))}
          </div>
        </section>
      ))}
      {!shown.length && <p className="empty">Nichts gefunden.</p>}
    </>
  );
}
