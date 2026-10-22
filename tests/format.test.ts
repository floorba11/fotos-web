import { describe, expect, it } from "vitest";
import { formatDateRange, groupBySeason, parseAlbumName } from "../src/lib/format";

describe("parseAlbumName", () => {
  it("trennt Saison und Spiel", () => {
    expect(parseAlbumName("Saison_26-27 – URE_D1_vs_Wizards")).toEqual({ season: "Saison 26-27", title: "URE D1 vs Wizards" });
  });
  it("Album ohne Saison", () => {
    expect(parseAlbumName("Teamfoto_2026")).toEqual({ season: null, title: "Teamfoto 2026" });
  });
  it("behält tiefere Ordner im Titel", () => {
    expect(parseAlbumName("Saison_26-27 – Cup – Final")).toEqual({ season: "Saison 26-27", title: "Cup – Final" });
  });
});

describe("formatDateRange", () => {
  it("ein Tag", () => {
    expect(formatDateRange("2026-10-18T12:00:00Z", "2026-10-18T14:00:00Z")).toBe("18. Oktober 2026");
  });
  it("mehrere Tage im selben Monat", () => {
    expect(formatDateRange("2026-10-18T12:00:00Z", "2026-10-19T12:00:00Z")).toBe("18.–19. Oktober 2026");
  });
  it("über Monatsgrenze", () => {
    expect(formatDateRange("2026-10-31T12:00:00Z", "2026-11-01T12:00:00Z")).toBe("31. Oktober 2026 – 1. November 2026");
  });
  it("ohne Datum", () => {
    expect(formatDateRange(null, null)).toBe("");
  });
});

describe("groupBySeason", () => {
  it("Gruppen in Reihenfolge, Weitere zuletzt", () => {
    const groups = groupBySeason([
      { id: 1, season: null },
      { id: 2, season: "Saison 26-27" },
      { id: 3, season: "Saison 25-26" },
      { id: 4, season: "Saison 26-27" },
    ]);
    expect(groups.map((g) => [g.season, g.items.map((i) => i.id)])).toEqual([
      ["Saison 26-27", [2, 4]],
      ["Saison 25-26", [3]],
      ["Weitere", [1]],
    ]);
  });
});
