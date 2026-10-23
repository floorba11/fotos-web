import { isOtherAlbum } from "./format";

// Zugriff auf die Immich-Schnittstelle (nur auf dem Server; der API-Schlüssel gelangt nie in den Browser).
// Benötigte Berechtigungen des Schlüssels: album.read, asset.read, asset.view, asset.download, person.read

export type Album = {
  id: string;
  name: string;
  coverId: string | null;
  count: number;
  start: string | null;
  end: string | null;
};
export type Photo = { id: string; name: string; width: number; height: number; takenAt: string };
export type Person = { id: string; name: string };

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
export const isUuid = (s: string) => UUID.test(s);

/**
 * Alben, deren Name mit "_" beginnt, sind intern oder private Aufträge und werden nicht angezeigt.
 * Ihre Fotos erscheinen auch nicht auf Spielerseiten (siehe getVisiblePhotoIds).
 */
export const isHiddenAlbum = (name: string) => name.startsWith("_");

export class ImmichError extends Error {
  constructor(
    readonly status: number,
    readonly path: string,
  ) {
    super(`Immich ${status} bei ${path}`);
  }
}

export function immich(path: string, init: RequestInit = {}): Promise<Response> {
  const base = (process.env.IMMICH_URL ?? "http://immich-server:2283").replace(/\/$/, "");
  const key = process.env.IMMICH_API_KEY;
  if (!key) throw new Error("IMMICH_API_KEY fehlt");
  return fetch(`${base}/api${path}`, {
    cache: "no-store",
    ...init,
    headers: {
      "x-api-key": key,
      Accept: "application/json",
      ...(init.body ? { "Content-Type": "application/json" } : {}),
      ...init.headers,
    },
  });
}

async function json<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await immich(path, init);
  if (!res.ok) throw new ImmichError(res.status, path);
  return (await res.json()) as T;
}

// Kleiner Zwischenspeicher, damit nicht jeder Seitenaufruf Immich abfragt
const store = new Map<string, { exp: number; value: Promise<unknown> }>();

export function cached<T>(key: string, ttlMs: number, load: () => Promise<T>): Promise<T> {
  const now = Date.now();
  const hit = store.get(key);
  if (hit && hit.exp > now) return hit.value as Promise<T>;
  const value = load().catch((e) => {
    store.delete(key);
    throw e;
  });
  store.set(key, { exp: now + ttlMs, value });
  return value;
}

/** Leert den Zwischenspeicher (für Tests) */
export const clearCache = () => store.clear();

const TTL = 2 * 60 * 1000;

type RawAlbum = {
  id: string;
  albumName: string;
  albumThumbnailAssetId: string | null;
  assetCount: number;
  startDate?: string;
  endDate?: string;
};

const toAlbum = (a: RawAlbum): Album => ({
  id: a.id,
  name: a.albumName,
  coverId: a.albumThumbnailAssetId,
  count: a.assetCount,
  start: a.startDate ?? null,
  end: a.endDate ?? null,
});

/** Alle sichtbaren Alben, neueste zuerst */
export function getAlbums(): Promise<Album[]> {
  return cached("albums", TTL, async () => {
    const raw = await json<RawAlbum[]>("/albums");
    return raw
      .map(toAlbum)
      .filter((a) => a.count > 0 && !isHiddenAlbum(a.name))
      .sort((a, b) => (b.start ?? "").localeCompare(a.start ?? ""));
  });
}

export async function getAlbum(id: string): Promise<Album | null> {
  if (!isUuid(id)) return null;
  const album = (await getAlbums()).find((a) => a.id === id);
  return album ?? null;
}

type RawAsset = {
  id: string;
  type: string;
  originalFileName: string;
  width: number | null;
  height: number | null;
  fileCreatedAt: string;
  localDateTime?: string;
};

type SearchResponse = { assets: { items: RawAsset[]; nextPage: string | null } };

const toPhoto = (a: RawAsset): Photo => ({
  id: a.id,
  name: a.originalFileName,
  width: a.width || 3,
  height: a.height || 2,
  takenAt: a.localDateTime ?? a.fileCreatedAt,
});

// Hinweis: albumIds/personIds/page sind ab Immich v3.2 als "deprecated" markiert, funktionieren aber weiter (Stand v3.3.5).
async function searchPhotos(filter: Record<string, unknown>): Promise<Photo[]> {
  const out: Photo[] = [];
  for (let page = 1; page <= 100; page++) {
    const res = await json<SearchResponse>("/search/metadata", {
      method: "POST",
      body: JSON.stringify({ ...filter, page, size: 1000 }),
    });
    for (const a of res.assets.items) if (a.type === "IMAGE") out.push(toPhoto(a));
    if (!res.assets.nextPage) break;
  }
  return out.sort((a, b) => a.takenAt.localeCompare(b.takenAt) || a.name.localeCompare(b.name));
}

export function getAlbumPhotos(id: string): Promise<Photo[]> {
  return cached(`album:${id}`, TTL, () => searchPhotos({ albumIds: [id] }));
}

/**
 * IDs aller Fotos in sichtbaren Alben. Nur diese zeigt die Website ausserhalb der Alben (Spielerseiten, Gesichter, Bilder).
 * Fotos aus "_"-Alben oder ohne Album bleiben so verborgen, auch wenn Immich darauf eine Spielerin erkennt.
 */
export function getVisiblePhotoIds(): Promise<Set<string>> {
  return cached("visible", TTL, async () => photoIds(await getAlbums()));
}

/** IDs der Fotos aus Spielalben, ohne "Weitere Fotos": nur diese erscheinen auf Spielerseiten */
function getGamePhotoIds(): Promise<Set<string>> {
  return cached("visible:spiele", TTL, async () => photoIds((await getAlbums()).filter((a) => !isOtherAlbum(a.name))));
}

async function photoIds(albums: Album[]): Promise<Set<string>> {
  const ids = new Set<string>();
  // höchstens 4 Alben gleichzeitig, um Immich auf dem kleinen Server nicht zu überlasten
  for (let i = 0; i < albums.length; i += 4) {
    const batch = await Promise.all(albums.slice(i, i + 4).map((a) => getAlbumPhotos(a.id)));
    for (const photos of batch) for (const p of photos) ids.add(p.id);
  }
  return ids;
}

/** Fotos einer Person aus sichtbaren Spielalben, neueste zuerst */
export function getPersonPhotos(id: string): Promise<Photo[]> {
  return cached(`person:${id}`, TTL, async () => {
    const [photos, visible] = await Promise.all([searchPhotos({ personIds: [id] }), getGamePhotoIds()]);
    return photos.filter((p) => visible.has(p.id)).reverse();
  });
}

/** Gesichtsrahmen in Pixeln des Bildes, auf dem Immich das Gesicht erkannt hat (imageWidth × imageHeight) */
export type FaceBox = { x1: number; y1: number; x2: number; y2: number; imageWidth: number; imageHeight: number };

type RawFace = { boundingBoxX1: number; boundingBoxY1: number; boundingBoxX2: number; boundingBoxY2: number; imageWidth: number; imageHeight: number };
type AssetDetail = { people?: { id: string; faces?: RawFace[] }[] };

/** Grösstes Gesicht einer Person auf einem Foto oder null */
export async function getFaceBox(assetId: string, personId: string): Promise<FaceBox | null> {
  const asset = await json<AssetDetail>(`/assets/${assetId}`);
  const faces = asset.people?.find((p) => p.id === personId)?.faces ?? [];
  const area = (f: RawFace) => (f.boundingBoxX2 - f.boundingBoxX1) * (f.boundingBoxY2 - f.boundingBoxY1);
  const f = faces.filter((f) => f.imageWidth > 0 && f.imageHeight > 0 && area(f) > 0).sort((a, b) => area(b) - area(a))[0];
  return f ? { x1: f.boundingBoxX1, y1: f.boundingBoxY1, x2: f.boundingBoxX2, y2: f.boundingBoxY2, imageWidth: f.imageWidth, imageHeight: f.imageHeight } : null;
}

type PeopleResponse = { people: { id: string; name: string; isHidden?: boolean }[]; hasNextPage?: boolean };

/** Benannte, nicht ausgeblendete Personen. Wer nicht erscheinen soll, wird in Immich auf "ausgeblendet" gestellt. */
export function getPeople(): Promise<Person[]> {
  return cached("people", TTL, async () => {
    const out: Person[] = [];
    for (let page = 1; page <= 20; page++) {
      const res = await json<PeopleResponse>(`/people?withHidden=false&size=500&page=${page}`);
      for (const p of res.people) if (p.name.trim() && !p.isHidden) out.push({ id: p.id, name: p.name.trim() });
      if (!res.hasNextPage) break;
    }
    return out.sort((a, b) => a.name.localeCompare(b.name, "de"));
  });
}

export async function getPerson(id: string): Promise<Person | null> {
  if (!isUuid(id)) return null;
  return (await getPeople()).find((p) => p.id === id) ?? null;
}
