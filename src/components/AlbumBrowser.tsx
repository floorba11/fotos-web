"use client";

import Link from "next/link";
import { useState } from "react";
import { groupBySeason } from "@/lib/format";
import { MatchTitle } from "./MatchTitle";
import type { PlayerCard } from "./PlayerBrowser";

export type AlbumCard = { id: string; season: string | null; title: string; date: string; count: number; coverId: string | null };

/** Albenliste mit Suche; für "Weitere Fotos" ohne Spieler und mit eigenem Link (base) */
export function AlbumBrowser({ cards, players = [], base = "/album" }: { cards: AlbumCard[]; players?: PlayerCard[]; base?: string }) {
  const [q, setQ] = useState("");
  const needle = q.trim().toLowerCase();
  const shown = needle ? cards.filter((c) => `${c.title} ${c.season ?? ""}`.toLowerCase().includes(needle)) : cards;
  const people = needle ? players.filter((p) => p.name.toLowerCase().includes(needle)) : players;

  return (
    <>
      <div className="search">
        <input
          type="search"
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder={base !== "/album" ? "Album suchen …" : players.length ? "Spiel, Gegner oder Spielername …" : "Spiel oder Gegner suchen …"}
          aria-label={base !== "/album" ? "Alben durchsuchen" : "Spiele und Spieler durchsuchen"}
        />
      </div>

      {people.length > 0 && (
        <section aria-labelledby="s-spieler">
          <div className="section-row">
            <h2 id="s-spieler" className="section">
              Spieler
            </h2>
            <Link href="/spieler" className="more">
              Alle Spieler ›
            </Link>
          </div>
          <div className="strip">
            {people.map((p) => (
              <Link key={p.id} href={`/spieler/${p.id}`} className="strip-item">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={`/face/${p.id}`} alt="" loading="lazy" />
                <span>{p.name}</span>
              </Link>
            ))}
          </div>
        </section>
      )}

      <div id="spiele" />
      {groupBySeason(shown).map((g) => (
        <section key={g.season} aria-labelledby={`s-${g.season}`}>
          <h2 id={`s-${g.season}`} className="section">
            {g.season}
          </h2>
          <div className="cards">
            {g.items.map((c) => (
              <Link key={c.id} href={`${base}/${c.id}`} className="card">
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
      {!shown.length && !people.length && <p className="empty">Nichts gefunden.</p>}
    </>
  );
}
