import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { clearCache, getAlbumPhotos, getAlbums, getPeople, getPersonPhotos, isUuid } from "../src/lib/immich";

const ok = (body: unknown) => Promise.resolve(new Response(JSON.stringify(body), { status: 200 }));

beforeEach(() => {
  process.env.IMMICH_URL = "http://immich.test";
  process.env.IMMICH_API_KEY = "k";
  clearCache();
});
afterEach(() => vi.restoreAllMocks());

describe("immich", () => {
  it("Alben: versteckte und leere ausblenden, neueste zuerst", async () => {
    vi.spyOn(globalThis, "fetch").mockImplementation(() =>
      ok([
        { id: "1", albumName: "A", albumThumbnailAssetId: "x", assetCount: 3, startDate: "2026-01-01T00:00:00Z" },
        { id: "2", albumName: "_intern", albumThumbnailAssetId: null, assetCount: 5, startDate: "2026-03-01T00:00:00Z" },
        { id: "3", albumName: "Leer", albumThumbnailAssetId: null, assetCount: 0 },
        { id: "4", albumName: "B", albumThumbnailAssetId: "y", assetCount: 2, startDate: "2026-02-01T00:00:00Z" },
      ]),
    );
    const albums = await getAlbums();
    expect(albums.map((a) => a.name)).toEqual(["B", "A"]);
    expect(fetch).toHaveBeenCalledWith("http://immich.test/api/albums", expect.objectContaining({ headers: expect.objectContaining({ "x-api-key": "k" }) }));
  });

  it("Fotos: blättert, nur Bilder, nach Aufnahmezeit sortiert", async () => {
    const asset = (id: string, type: string, t: string) => ({ id, type, originalFileName: `${id}.JPG`, width: 10, height: 5, fileCreatedAt: t });
    let calls = 0;
    vi.spyOn(globalThis, "fetch").mockImplementation(() => {
      calls++;
      return calls === 1
        ? ok({ assets: { items: [asset("b", "IMAGE", "2026-01-02T00:00:00Z"), asset("v", "VIDEO", "2026-01-01T00:00:00Z")], nextPage: "2" } })
        : ok({ assets: { items: [asset("a", "IMAGE", "2026-01-01T00:00:00Z")], nextPage: null } });
    });
    const photos = await getAlbumPhotos("album-seiten-test");
    expect(photos.map((p) => p.id)).toEqual(["a", "b"]);
    expect(calls).toBe(2);
  });

  it("Fotos einer Person: nur aus sichtbaren Alben, neueste zuerst", async () => {
    const asset = (id: string, t: string) => ({ id, type: "IMAGE", originalFileName: `${id}.JPG`, width: 10, height: 5, fileCreatedAt: t });
    const albums = [
      { id: "spiel", albumName: "Saison – Spiel", albumThumbnailAssetId: "a", assetCount: 3 },
      { id: "privat", albumName: "_Privat – Hochzeit", albumThumbnailAssetId: "p", assetCount: 1 },
    ];
    const byFilter = (body: { albumIds?: string[]; personIds?: string[] }) => {
      if (body.personIds) return [asset("a", "2026-01-01T00:00:00Z"), asset("p", "2026-04-01T00:00:00Z"), asset("ohne", "2026-05-01T00:00:00Z"), asset("c", "2026-03-01T00:00:00Z"), asset("b", "2026-02-01T00:00:00Z")];
      if (body.albumIds?.[0] === "spiel") return [asset("a", "2026-01-01T00:00:00Z"), asset("b", "2026-02-01T00:00:00Z"), asset("c", "2026-03-01T00:00:00Z")];
      return [asset("p", "2026-04-01T00:00:00Z")];
    };
    vi.spyOn(globalThis, "fetch").mockImplementation((url, init) =>
      String(url).endsWith("/albums")
        ? ok(albums)
        : ok({ assets: { items: byFilter(JSON.parse(String(init?.body))), nextPage: null } }),
    );
    // "p" liegt in einem "_"-Album, "ohne" in keinem Album: beide bleiben verborgen
    expect((await getPersonPhotos("person-sichtbar-test")).map((p) => p.id)).toEqual(["c", "b", "a"]);
    expect(fetch).not.toHaveBeenCalledWith(expect.anything(), expect.objectContaining({ body: expect.stringContaining('"privat"') }));
  });

  it("Personen: unbenannte und versteckte ausblenden", async () => {
    vi.spyOn(globalThis, "fetch").mockImplementation(() =>
      ok({ hasNextPage: false, people: [{ id: "1", name: "" }, { id: "2", name: "Zora" }, { id: "3", name: "Anna" }, { id: "4", name: "Max", isHidden: true }] }),
    );
    expect((await getPeople()).map((p) => p.name)).toEqual(["Anna", "Zora"]);
  });

  it("isUuid", () => {
    expect(isUuid("3f2b8c1e-9d4a-4e6b-8a1c-0123456789ab")).toBe(true);
    expect(isUuid("../etc/passwd")).toBe(false);
  });
});
