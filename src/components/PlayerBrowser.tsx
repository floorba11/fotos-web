"use client";

import { useState } from "react";
import { PlayerPortrait, type PlayerCard } from "./PlayerRoster";

export type { PlayerCard };

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
          <PlayerPortrait key={p.id} {...p} />
        ))}
      </div>
      {!shown.length && <p className="empty">Niemand gefunden.</p>}
    </>
  );
}
