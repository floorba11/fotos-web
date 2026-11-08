/**
 * Optionale Zusatzdaten pro Spiel, von Hand gepflegt (z.B. das Endresultat).
 * Schlüssel: Album-ID (UUID) ODER normalisierter Titel (siehe normalizeTitle, z.B. "ure-d1-vs-wolhusen").
 * Die ID hat Vorrang; der Titel-Schlüssel ist bequemer, bricht aber bei Umbenennung des Albums.
 * Eintrag ergänzen, speichern, deployen – Alben ohne Eintrag zeigen einfach kein Resultat.
 * Der Titel ist der Titel nach parseAlbumName, Typos dürfen drinbleiben (nur Gross-/Kleinschreibung und Sonderzeichen werden vereinheitlicht).
 */
export type MatchMeta = { score?: string };

export const matchMetadata: Record<string, MatchMeta> = {
  // "ure-d1-vs-wolhusen": { score: "5:4 n.V." },
  // "3f2a9c1e-0000-0000-0000-000000000000": { score: "7:2" },
};

/** "URE D1 vs. Wolhusen" → "ure-d1-vs-wolhusen" */
export const normalizeTitle = (title: string): string =>
  title
    .toLowerCase()
    .replace(/[^\p{L}\p{N}]+/gu, "-")
    .replace(/^-+|-+$/g, "");

export function getMatchMeta(albumId: string, title: string): MatchMeta | null {
  for (const key of [albumId, normalizeTitle(title)]) {
    if (key && Object.hasOwn(matchMetadata, key)) return matchMetadata[key];
  }
  return null;
}
