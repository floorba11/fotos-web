import { parseAlbumName } from "./format";
import type { PhotoExif } from "./immich";
import { parseAlbumTitle } from "./parseAlbumTitle";

// Übersicht über alle sichtbaren Fotos für die Statistik-Seite: Kameras, Objektive und Orte

export type Tally = { label: string; count: number };

export type PhotoOverview = {
  total: number;
  albums: number;
  cameras: Tally[];
  lenses: Tally[];
  combos: Tally[];
  places: Tally[];
  /** Fotos mit Ort aus GPS (EXIF); die übrigen nehmen den Spielort aus dem Albumnamen */
  withGps: number;
};

export const UNKNOWN_CAMERA = "Unbekannte Kamera";
export const UNKNOWN_LENS = "Unbekanntes Objektiv";
export const UNKNOWN_PLACE = "Ohne Ortsangabe";

const MAKES: Record<string, string> = {
  "nikon corporation": "Nikon",
  nikon: "Nikon",
  canon: "Canon",
  sony: "Sony",
  fujifilm: "Fujifilm",
  "olympus corporation": "Olympus",
  "om digital solutions": "OM System",
  panasonic: "Panasonic",
  leica: "Leica",
  "leica camera ag": "Leica",
  apple: "Apple",
  google: "Google",
  samsung: "Samsung",
  "ricoh imaging company, ltd.": "Ricoh",
  "pentax corporation": "Pentax",
  dji: "DJI",
};

const clean = (s: string | null | undefined) => (s ?? "").replace(/\s+/g, " ").trim();

/** "NIKON CORPORATION" + "NIKON Z 6_2" → "Nikon Z 6_2"; "Canon" + "Canon EOS R6" → "Canon EOS R6" */
export function cameraName(make: string | null, model: string | null): string | null {
  const mk = clean(make);
  let md = clean(model);
  if (!mk && !md) return null;
  const brand = MAKES[mk.toLowerCase()] ?? mk;
  // viele Kameras wiederholen die Marke im Modell (in beliebiger Schreibweise)
  for (const prefix of [mk, brand, mk.split(" ")[0]]) {
    if (prefix && md.toLowerCase().startsWith(prefix.toLowerCase() + " ")) {
      md = md.slice(prefix.length).trim();
      break;
    }
  }
  return [brand, md].filter(Boolean).join(" ");
}

export function lensName(lens: string | null): string | null {
  const l = clean(lens);
  // manche Kameras schreiben Platzhalter statt eines Namens
  return !l || /^(-+|0|unknown|n\/a)$/i.test(l) ? null : l;
}

function tally(map: Map<string, number>, last?: string): Tally[] {
  return [...map]
    .map(([label, count]) => ({ label, count }))
    .sort((a, b) => Number(a.label === last) - Number(b.label === last) || b.count - a.count || a.label.localeCompare(b.label, "de"));
}

const bump = (map: Map<string, number>, key: string) => map.set(key, (map.get(key) ?? 0) + 1);

export function buildOverview(albums: { name: string; photos: PhotoExif[] }[]): PhotoOverview {
  const seen = new Set<string>();
  const cameras = new Map<string, number>();
  const lenses = new Map<string, number>();
  const combos = new Map<string, number>();
  const places = new Map<string, number>();
  let withGps = 0;

  for (const album of albums) {
    const spielort = parseAlbumTitle(parseAlbumName(album.name).title).location;
    for (const p of album.photos) {
      // ein Foto in mehreren Alben zählt nur einmal
      if (seen.has(p.id)) continue;
      seen.add(p.id);
      const cam = cameraName(p.make, p.model);
      const lens = lensName(p.lens);
      bump(cameras, cam ?? UNKNOWN_CAMERA);
      bump(lenses, lens ?? UNKNOWN_LENS);
      if (cam || lens) bump(combos, `${cam ?? UNKNOWN_CAMERA} + ${lens ?? UNKNOWN_LENS}`);
      const city = clean(p.city);
      const country = clean(p.country);
      if (city || country) withGps++;
      const place = city ? (country && country !== "Switzerland" && country !== "Schweiz" ? `${city}, ${country}` : city) : country || spielort;
      bump(places, place || UNKNOWN_PLACE);
    }
  }

  return {
    total: seen.size,
    albums: albums.length,
    cameras: tally(cameras, UNKNOWN_CAMERA),
    lenses: tally(lenses, UNKNOWN_LENS),
    combos: tally(combos),
    places: tally(places, UNKNOWN_PLACE),
    withGps,
  };
}
