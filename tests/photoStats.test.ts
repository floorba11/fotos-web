import { describe, expect, it } from "vitest";
import type { PhotoExif } from "../src/lib/immich";
import { buildOverview, cameraName, lensName, UNKNOWN_CAMERA, UNKNOWN_PLACE } from "../src/lib/photoStats";

const photo = (id: string, e: Partial<PhotoExif> = {}): PhotoExif => ({ id, make: null, model: null, lens: null, city: null, country: null, ...e });

describe("cameraName", () => {
  it("vereinheitlicht Marke und entfernt doppelte Marke im Modell", () => {
    expect(cameraName("NIKON CORPORATION", "NIKON Z 6_2")).toBe("Nikon Z 6_2");
    expect(cameraName("Canon", "Canon EOS R6")).toBe("Canon EOS R6");
    expect(cameraName("SONY", "ILCE-7M4")).toBe("Sony ILCE-7M4");
    expect(cameraName(null, null)).toBeNull();
  });
});

describe("lensName", () => {
  it("ignoriert Platzhalter", () => {
    expect(lensName("----")).toBeNull();
    expect(lensName(" RF70-200mm F2.8 L IS USM ")).toBe("RF70-200mm F2.8 L IS USM");
  });
});

describe("buildOverview", () => {
  it("zählt Kameras, Objektive, Kombinationen und Orte", () => {
    const o = buildOverview([
      {
        name: "Saison_26-27 – URE_D1_vs_Wolhusen_in_Schüpfheim",
        photos: [
          photo("a", { make: "Canon", model: "Canon EOS R6", lens: "RF70-200mm" }),
          photo("b", { make: "Canon", model: "Canon EOS R6", lens: "RF24-70mm", city: "Luzern", country: "Switzerland" }),
        ],
      },
      { name: "weitere – Natur – Aletsch", photos: [photo("c"), photo("a", { make: "Canon", model: "Canon EOS R6" })] },
    ]);
    expect(o.total).toBe(3);
    expect(o.albums).toBe(2);
    expect(o.cameras).toEqual([
      { label: "Canon EOS R6", count: 2 },
      { label: UNKNOWN_CAMERA, count: 1 },
    ]);
    expect(o.combos.map((c) => c.label)).toEqual(["Canon EOS R6 + RF24-70mm", "Canon EOS R6 + RF70-200mm"]);
    expect(o.places).toEqual([
      { label: "Luzern", count: 1 },
      { label: "Schüpfheim", count: 1 },
      { label: UNKNOWN_PLACE, count: 1 },
    ]);
    expect(o.withGps).toBe(1);
  });
});
