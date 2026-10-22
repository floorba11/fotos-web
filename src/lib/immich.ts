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

/** Alben, deren Name mit "_" beginnt, sind intern und werden nicht angezeigt. */
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

export function getPersonPhotos(id: string): Promise<Photo[]> {
  return cached(`person:${id}`, TTL, () => searchPhotos({ personIds: [id] }));
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
