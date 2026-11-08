"use client";

import { useRouter } from "next/navigation";
import { useId, useState } from "react";
import type { PlayerCard } from "./PlayerRoster";

/** Schnellsuche im Hero: Namen tippen, Spieler mit Mini-Avatar wählen, direkt zu den eigenen Fotos */
export function PlayerSearch({ players }: { players: PlayerCard[] }) {
  const router = useRouter();
  const listId = useId();
  const [q, setQ] = useState("");
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(0);

  const needle = q.trim().toLowerCase();
  const hits = needle ? players.filter((p) => p.name.toLowerCase().includes(needle)).slice(0, 8) : [];
  const expanded = open && needle.length > 0;
  const go = (p: PlayerCard) => router.push(`/spieler/${p.id}`);

  const onKey = (e: React.KeyboardEvent) => {
    if (e.key === "ArrowDown" || e.key === "ArrowUp") {
      e.preventDefault();
      if (hits.length) setActive((i) => (i + (e.key === "ArrowDown" ? 1 : -1) + hits.length) % hits.length);
    } else if (e.key === "Enter" && expanded && hits[active]) {
      e.preventDefault();
      go(hits[active]);
    } else if (e.key === "Escape") setOpen(false);
  };

  return (
    <div className="psearch" onBlur={(e) => !e.currentTarget.contains(e.relatedTarget) && setOpen(false)}>
      <input
        type="search"
        role="combobox"
        aria-expanded={expanded}
        aria-controls={listId}
        aria-autocomplete="list"
        aria-activedescendant={expanded && hits[active] ? `${listId}-${active}` : undefined}
        aria-label="Athleten suchen"
        autoComplete="off"
        placeholder="Wer bist du? Name eintippen …"
        value={q}
        onChange={(e) => {
          setQ(e.target.value);
          setActive(0);
          setOpen(true);
        }}
        onFocus={() => setOpen(true)}
        onKeyDown={onKey}
      />
      {expanded && (
        <ul className="psearch-list" id={listId} role="listbox" aria-label="Passende Athleten">
          {hits.length ? (
            hits.map((p, i) => (
              <li
                key={p.id}
                id={`${listId}-${i}`}
                role="option"
                aria-selected={i === active}
                className="psearch-item"
                onMouseEnter={() => setActive(i)}
                onMouseDown={(e) => e.preventDefault()}
                onClick={() => go(p)}
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={`/face/${p.id}`} alt="" width={36} height={36} loading="lazy" />
                {p.name}
              </li>
            ))
          ) : (
            <li className="psearch-empty">Niemand gefunden.</li>
          )}
        </ul>
      )}
    </div>
  );
}
