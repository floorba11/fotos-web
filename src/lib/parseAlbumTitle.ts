export type Competition = { label: string; kind: "cup" | "league" };

/** Badge eines Spielalbums: Wettbewerb (Cup oder Meisterschaft) und optional "HEIMRUNDE" */
export type AlbumTag = { label: string; kind: "cup" | "league" | "home" };

export type ParsedAlbumTitle = {
  /** Titel ohne Wettbewerbs-Kürzel, Typos korrigiert, z.B. "URE D1 vs Wolhusen" */
  cleanTitle: string;
  homeTeam: string;
  /** null wenn keine Paarung erkannt */
  awayTeam: string | null;
  /** aus "A vs B in Ort" */
  location: string | null;
  /** Cup, sonst immer Meisterschaft */
  competition: Competition;
  /** Wettbewerb und ggf. "HEIMRUNDE", in Anzeigereihenfolge */
  tags: AlbumTag[];
  isCup: boolean;
  /** "Heimrunde" steht im Namen (bleibt dort stehen) */
  isHeimrunde: boolean;
  /** Hier nur: Cup-Spiel. "Neuestes Spiel der Saison" entscheidet die UI. */
  isHighlight: boolean;
};

/** Bekannte Tippfehler in Ordnernamen (Schlüssel: falsch, Wert: richtig; Wortgrenzen, ohne Gross-/Kleinschreibung) */
export const TYPO_FIXES: Record<string, string> = {
  Wohusen: "Wolhusen",
};

const escapeRe = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
const typoRes = Object.entries(TYPO_FIXES).map(
  ([wrong, right]) => [new RegExp(`(?<![\\p{L}\\p{N}])${escapeRe(wrong)}(?![\\p{L}\\p{N}])`, "giu"), right] as const,
);

// "CUP", optional gefolgt von Runde ("1 16", "1/16", ...) oder Feldart (GF/KF)
const CUP_RE = /\bcup\b(?:\s+(?:1\s*[/ ]\s*(64|32|16|8|4|2)\b|(gf|kf)\b))?/i;
const ROUND_RE = /\brunde\s+\d+\b/i;
const HOME_RE = /\bheimrunde\b/i;

const CUP_ROUNDS: Record<string, string> = { "4": "CUP VIERTELFINAL", "2": "CUP HALBFINAL" };
const CUP_FIELDS: Record<string, string> = { gf: "CUP GROSSFELD", kf: "CUP KLEINFELD" };

function cupLabel(round: string | undefined, field: string | undefined): string {
  if (field) return CUP_FIELDS[field.toLowerCase()];
  if (round) return CUP_ROUNDS[round] ?? `CUP 1/${round}-FINAL`;
  return "CUP";
}

const squash = (s: string) => s.replace(/\s+/g, " ").trim();

/** Nimmt das Treffer-Token aus dem Titel; ersetzt es durch ein Leerzeichen, damit Wörter nicht zusammenkleben. */
const cut = (s: string, m: RegExpExecArray) => squash(s.slice(0, m.index) + " " + s.slice(m.index + m[0].length));

/**
 * "URE D1 vs Wolhusen CUP 1 16" → clean "URE D1 vs Wolhusen", Wettbewerb "CUP 1/16-FINAL".
 * Erwartet den Titel nach parseAlbumName, toleriert aber "_" und Mehrfach-Leerzeichen. Ohne Cup-Kürzel: Meisterschaft.
 * "Heimrunde" bleibt im Titel und ergibt zusätzlich den Tag "HEIMRUNDE".
 */
export function parseAlbumTitle(rawTitle: string): ParsedAlbumTitle {
  let title = squash(rawTitle.replace(/_/g, " "));
  for (const [re, right] of typoRes) title = title.replace(re, right);

  let competition: Competition = { label: "MEISTERSCHAFT", kind: "league" };
  const cup = CUP_RE.exec(title);
  if (cup) {
    competition = { label: cupLabel(cup[1], cup[2]), kind: "cup" };
    title = cut(title, cup);
  } else {
    // alles ausser Cup ist Meisterschaft; "Runde 3" fällt aus dem Titel, "Heimrunde" bleibt stehen
    const round = ROUND_RE.exec(title);
    if (round) title = cut(title, round);
  }
  const isHeimrunde = HOME_RE.test(title);
  const tags: AlbumTag[] = [competition, ...(isHeimrunde ? [{ label: "HEIMRUNDE", kind: "home" as const }] : [])];

  const vs = /\s+vs\.?\s+/i.exec(title);
  let homeTeam = vs ? title.slice(0, vs.index) : title;
  let awayTeam: string | null = vs ? title.slice(vs.index + vs[0].length) : null;

  // Ort steht hinter dem Gegner (bzw. hinter dem ganzen Titel): nur das letzte " in " zählt
  let location: string | null = null;
  const inRe = /^(.*)\s+in\s+(.+)$/i;
  const loc = inRe.exec(awayTeam ?? homeTeam);
  if (loc) {
    location = loc[2].trim();
    if (awayTeam !== null) awayTeam = loc[1].trim();
    else homeTeam = loc[1].trim();
  }

  const isCup = competition.kind === "cup";
  return { cleanTitle: title, homeTeam, awayTeam, location, competition, tags, isCup, isHeimrunde, isHighlight: isCup };
}
