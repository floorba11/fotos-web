// Kaderporträts von uh-regio-entlebuch.ch (Frauen I), als Kopfausschnitt in public/portraits.
// Gibt es zu einer Immich-Person ein Porträt, zeigt die Seite dieses statt des Gesichts aus Immich.
// Spielerinnen ohne echtes Porträt auf der Vereinsseite (nur Silhouette) fehlen hier bewusst.

type Portrait = { name: string; file: string; aliases?: string[] };

export const PORTRAITS: Portrait[] = [
  { name: "Leandra Fischer", file: "leandra-fischer.jpg", aliases: ["Leli Fischer"] },
  { name: "Ronja Imboden", file: "ronja-imboden.jpg" },
  { name: "Charlotte Fankhauser", file: "charlotte-fankhauser.jpg" },
  { name: "Fabienne Wicki", file: "fabienne-wicki.jpg" },
  { name: "Sarah Lustenberger", file: "sarah-lustenberger.jpg" },
  { name: "Vanessa Ambauen", file: "vanessa-ambauen.jpg" },
  { name: "Eliane Emmenegger", file: "eliane-emmenegger.jpg" },
  { name: "Corina Bieri", file: "corina-bieri.jpg" },
  { name: "Chantal Spycher", file: "chantal-spycher.jpg" },
  { name: "Fabienne Lötscher-Töngi", file: "fabienne-loetscher-toengi.jpg" },
  { name: "Ariane Thalmann", file: "ariane-thalmann.jpg" },
  { name: "Eliane Thalmann", file: "eliane-thalmann.jpg" },
  { name: "Ramona Bucher", file: "ramona-bucher.jpg" },
  { name: "Céline Schmid", file: "celine-schmid.jpg" },
  { name: "Laura Emmenegger", file: "laura-emmenegger.jpg" },
  { name: "Debora Bucher", file: "debora-bucher.jpg" },
];

/** "Lötscher-Töngi Fabienne" → ["fabienne", "loetscher", "toengi"] (Reihenfolge und Akzente egal) */
export function nameTokens(name: string): string[] {
  const plain = name
    .toLowerCase()
    .replace(/ä/g, "ae")
    .replace(/ö/g, "oe")
    .replace(/ü/g, "ue")
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "");
  return plain.split(/[^a-z0-9]+/).filter(Boolean).sort();
}

/**
 * Pfad zum Porträt einer Person oder null.
 * Alle Namensteile aus Immich müssen im Kadernamen vorkommen (mindestens Vor- und Nachname),
 * so passt "Fabienne Lötscher" auf "Fabienne Lötscher-Töngi". Mehrdeutige Treffer zählen nicht.
 */
export function portraitFor(name: string): string | null {
  const wanted = nameTokens(name);
  if (wanted.length < 2) return null;
  const hits = PORTRAITS.filter((p) => [p.name, ...(p.aliases ?? [])].some((n) => wanted.every((t) => nameTokens(n).includes(t))));
  return hits.length === 1 ? `/portraits/${hits[0].file}` : null;
}
