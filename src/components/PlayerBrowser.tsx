"use client";

import Link from "next/link";
import { useState } from "react";

export type PlayerCard = { id: string; name: string };

export function PlayerBrowser({ players }: { players: PlayerCard[] }) {
  const [q, setQ] = useState("");
  const needle = q.trim().toLowerCase();
  const shown = needle ? players.filter((p) => p.name.toLowerCase().includes(needle)) : players;

  return (
    <>
      <div className="search">
        <input type="search" value={q} onChange={(e) => setQ(e.target.value)} placeholder="Name suchen …" aria-label="Spieler durchsuchen" />
      </div>
      <div className="players">
        {shown.map((p) => (
          <Link key={p.id} href={`/spieler/${p.id}`} className="player">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={`/face/${p.id}`} alt="" loading="lazy" />
            <span>{p.name}</span>
          </Link>
        ))}
      </div>
      {!shown.length && <p className="empty">Niemand gefunden.</p>}
    </>
  );
}
