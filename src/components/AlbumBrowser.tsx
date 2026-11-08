"use client";

import Link from "next/link";
import { useState } from "react";
import { groupBySeason } from "@/lib/format";
import { getMatchMeta } from "@/lib/matchMetadata";
import { parseAlbumTitle } from "@/lib/parseAlbumTitle";
import { PlayerRoster, type PlayerCard } from "./PlayerRoster";

export type AlbumCard = { id: string; season: string | null; title: string; date: string; count: number; coverId: string | null };

/** Albenliste als Match-Poster mit Suche; für "Off-Court" ohne Spieler und Wettbewerbe, mit eigenem Link (base) */
export function AlbumBrowser({ cards, players = [], base = "/album" }: { cards: AlbumCard[]; players?: PlayerCard[]; base?: string }) {
  const [q, setQ] = useState("");
  const sport = base === "/album";
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
          placeholder={!sport ? "Album suchen …" : players.length ? "Spiel, Gegner oder Spielername …" : "Spiel oder Gegner suchen …"}
          aria-label={!sport ? "Alben durchsuchen" : "Spiele und Spieler durchsuchen"}
        />
      </div>

      {people.length > 0 && (
        <section aria-labelledby="s-spieler">
          <div className="section-row">
            <h2 id="s-spieler" className="section">
              Finde deine Fotos nach Gesicht
            </h2>
          </div>
          <PlayerRoster players={people} total={players.length} />
        </section>
      )}

      <div id="spiele" />
      {groupBySeason(shown).map((g) => (
        <section key={g.season} aria-labelledby={`s-${g.season}`}>
          <h2 id={`s-${g.season}`} className="section">
            {g.season}
          </h2>
          <div className="cards">
            {g.items.map((c, i) => {
              const m = sport ? parseAlbumTitle(c.title) : null;
              // Highlight: Cup-Spiele und das neueste Spiel jeder Saison (Liste ist neueste zuerst)
              const hl = !!m && (m.isHighlight || i === 0);
              const score = sport ? getMatchMeta(c.id, c.title)?.score : undefined;
              const cleanTitle = m?.cleanTitle || c.title;
              return (
                <Link key={c.id} href={`${base}/${c.id}`} className={hl ? "poster poster-hl" : "poster"}>
                  <div className="poster-img">
                    {c.coverId ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={`/img/${c.coverId}/preview`} alt={`Spielfoto ${cleanTitle}`} loading="lazy" />
                    ) : null}
                  </div>
                  <div className="poster-shade" />
                  <div className="poster-top">
                    {m?.competition && <span className={m.isCup ? "badge badge-cup" : "badge badge-glass"}>{m.competition.label}</span>}
                    {score ? <span className="badge badge-score">{score}</span> : <span className="badge badge-count">{c.count} SHOTS</span>}
                  </div>
                  <div className="poster-body">
                    <h3 className="poster-teams">
                      {m?.awayTeam ? (
                        <>
                          {m.homeTeam} <span className="vs">vs</span> {m.awayTeam}
                        </>
                      ) : (
                        cleanTitle
                      )}
                    </h3>
                    {c.date && <p className="poster-date">{c.date}</p>}
                  </div>
                </Link>
              );
            })}
          </div>
        </section>
      ))}
      {!shown.length && !people.length && <p className="empty">Nichts gefunden.</p>}
    </>
  );
}
