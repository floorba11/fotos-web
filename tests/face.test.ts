import sharp from "sharp";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { FACE_SIZE, faceCrop, newestFace } from "../src/lib/face";
import { clearCache } from "../src/lib/immich";

const box = { x1: 100, y1: 100, x2: 200, y2: 200, imageWidth: 1000, imageHeight: 800 };

describe("faceCrop", () => {
  it("quadratisch um das Gesicht, leicht nach unten versetzt", () => {
    expect(faceCrop(box, 1000, 800)).toEqual({ left: 20, top: 40, width: 260, height: 260 });
  });
  it("rechnet auf die tatsächliche Bildgrösse um", () => {
    expect(faceCrop(box, 500, 400)).toEqual({ left: 10, top: 20, width: 130, height: 130 });
  });
  it("bleibt im Bild", () => {
    const c = faceCrop({ ...box, x1: 0, y1: 0, x2: 300, y2: 300 }, 1000, 800);
    expect(c).toEqual({ left: 0, top: 0, width: 780, height: 780 });
    const edge = faceCrop({ ...box, x1: 950, y1: 750, x2: 1000, y2: 800 }, 1000, 800);
    expect(edge.left + edge.width).toBeLessThanOrEqual(1000);
    expect(edge.top + edge.height).toBeLessThanOrEqual(800);
  });
});

describe("newestFace", () => {
  beforeEach(() => {
    process.env.IMMICH_URL = "http://immich.test";
    process.env.IMMICH_API_KEY = "k";
    clearCache();
  });
  afterEach(() => vi.restoreAllMocks());

  it("nimmt das neuste Foto mit erkanntem Gesicht der Person", async () => {
    const preview = await sharp({ create: { width: 1000, height: 800, channels: 3, background: "#888" } }).jpeg().toBuffer();
    const asset = (id: string, t: string) => ({ id, type: "IMAGE", originalFileName: `${id}.JPG`, width: 10, height: 5, fileCreatedAt: t });
    const face = { boundingBoxX1: 100, boundingBoxY1: 100, boundingBoxX2: 200, boundingBoxY2: 200, imageWidth: 1000, imageHeight: 800 };
    const seen: string[] = [];
    vi.spyOn(globalThis, "fetch").mockImplementation((input) => {
      const url = String(input).replace("http://immich.test/api", "");
      seen.push(url);
      const json = (b: unknown) => Promise.resolve(new Response(JSON.stringify(b)));
      if (url === "/albums") return json([{ id: "spiel", albumName: "Spiel", albumThumbnailAssetId: "alt", assetCount: 3 }]);
      if (url === "/search/metadata")
        return json({ assets: { items: [asset("alt", "2026-01-01T00:00:00Z"), asset("neu", "2026-03-01T00:00:00Z"), asset("mitte", "2026-02-01T00:00:00Z")], nextPage: null } });
      // auf dem neusten Foto ist die Person nicht erkannt, auf dem zweitneusten schon
      if (url === "/assets/neu") return json({ people: [{ id: "andere", faces: [face] }] });
      if (url === "/assets/mitte") return json({ people: [{ id: "p1", faces: [face] }] });
      if (url.startsWith("/assets/mitte/thumbnail")) return Promise.resolve(new Response(new Uint8Array(preview)));
      return Promise.resolve(new Response("", { status: 404 }));
    });
    const jpeg = await newestFace("p1");
    expect(jpeg).not.toBeNull();
    expect(await sharp(jpeg!).metadata()).toMatchObject({ width: FACE_SIZE, height: FACE_SIZE, format: "jpeg" });
    expect(seen.filter((u) => u.startsWith("/assets"))).toEqual(["/assets/neu", "/assets/mitte", "/assets/mitte/thumbnail?size=preview"]);
  });
});
