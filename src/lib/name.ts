/** Kleingeschriebene Namenszusätze, die zum Nachnamen gehören ("Lea von Rotz" → Nachname "von Rotz") */
const PARTICLES = new Set(["von", "vom", "zu", "zum", "zur", "van", "de", "der", "den", "di", "da", "du", "del", "della", "dos", "la", "le", "ten", "ter"]);

/**
 * "Anna Maria Muster" → Vorname "Anna Maria", Nachname "Muster" (ein Wort: nur Nachname).
 * Kleingeschriebene Zusätze vor dem letzten Wort zählen zum Nachnamen: "Lea von Rotz" → "Lea" / "von Rotz".
 */
export function splitName(name: string): { first: string; last: string } {
  const parts = name.trim().split(/\s+/);
  if (parts.length < 2) return { first: "", last: parts[0] ?? "" };
  let i = parts.length - 1;
  while (i > 1 && PARTICLES.has(parts[i - 1])) i--;
  return { first: parts.slice(0, i).join(" "), last: parts.slice(i).join(" ") };
}

/** Sortierung nach Nachname, bei gleichem Nachnamen nach Vorname (deutsche Sortierregeln, Gross/Klein egal) */
export function compareByLastName(a: string, b: string): number {
  const x = splitName(a);
  const y = splitName(b);
  const opts = { sensitivity: "base" } as const;
  return x.last.localeCompare(y.last, "de", opts) || x.first.localeCompare(y.first, "de", opts) || a.localeCompare(b, "de");
}
