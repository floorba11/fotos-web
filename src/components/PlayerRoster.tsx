import Link from "next/link";
import { splitName } from "@/lib/name";

export type PlayerCard = { id: string; name: string };

/** Spielerkarte im Porträtformat (Spielerübersicht): Vorname klein, Nachname gross in der Sport-Schrift */
export function PlayerPortrait({ id, name }: PlayerCard) {
  const { first, last } = splitName(name);
  return (
    <Link href={`/spieler/${id}`} className="pcard" aria-label={name}>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={`/face/${id}`} alt={`Porträt von ${name}`} loading="lazy" />
      <span className="pcard-name">
        {first && <span className="pcard-first">{first}</span>}
        <span className="pcard-last">{last}</span>
      </span>
    </Link>
  );
}
