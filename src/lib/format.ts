const SEP = " – ";

export type AlbumLabel = { season: string | null; title: string };

const pretty = (s: string) => s.replace(/_/g, " ").trim();

/** "Saison_26-27 – URE_D1_vs_Wizards" (so legt album-sync die Alben an) → Saison "Saison 26-27", Titel "URE D1 vs Wizards" */
export function parseAlbumName(name: string): AlbumLabel {
  const parts = name.split(SEP);
  if (parts.length < 2) return { season: null, title: pretty(name) };
  return { season: pretty(parts[0]), title: pretty(parts.slice(1).join(SEP)) };
}

const dateFmt = new Intl.DateTimeFormat("de-CH", { day: "numeric", month: "long", year: "numeric", timeZone: "Europe/Zurich" });
const dayFmt = new Intl.DateTimeFormat("de-CH", { day: "numeric", timeZone: "Europe/Zurich" });

export function formatDate(iso: string | null | undefined): string {
  if (!iso) return "";
  const d = new Date(iso);
  return Number.isNaN(d.getTime()) ? "" : dateFmt.format(d);
}

/** Ein Tag: "18. Oktober 2026"; mehrere Tage im selben Monat: "18.–19. Oktober 2026" */
export function formatDateRange(start: string | null | undefined, end: string | null | undefined): string {
  const a = formatDate(start);
  const b = formatDate(end);
  if (!a || !b || a === b) return a || b;
  const [d1, ...rest1] = a.split(" ");
  const rest2 = b.split(" ").slice(1).join(" ");
  if (rest1.join(" ") === rest2) return `${d1}–${dayFmt.format(new Date(end!))}. ${rest2}`;
  return `${a} – ${b}`;
}

export type Group<T> = { season: string; items: T[] };

/** Gruppiert nach Saison; Reihenfolge bleibt wie geliefert (neueste zuerst), "Weitere" kommt zuletzt. */
export function groupBySeason<T extends { season: string | null }>(items: T[]): Group<T>[] {
  const groups = new Map<string, T[]>();
  for (const item of items) {
    const key = item.season ?? "Weitere";
    groups.set(key, [...(groups.get(key) ?? []), item]);
  }
  const out = [...groups].map(([season, list]) => ({ season, items: list }));
  return [...out.filter((g) => g.season !== "Weitere"), ...out.filter((g) => g.season === "Weitere")];
}
