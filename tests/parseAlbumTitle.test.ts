import { afterEach, describe, expect, it } from "vitest";
import { getMatchMeta, matchMetadata, normalizeTitle } from "../src/lib/matchMetadata";
import { parseAlbumTitle } from "../src/lib/parseAlbumTitle";

describe("parseAlbumTitle", () => {
  it("korrigiert den Typo Wohusen", () => {
    const p = parseAlbumTitle("URE D1 vs Wohusen");
    expect(p.cleanTitle).toBe("URE D1 vs Wolhusen");
    expect(p.awayTeam).toBe("Wolhusen");
    expect(parseAlbumTitle("URE D1 vs wohusen").awayTeam).toBe("Wolhusen");
  });

  it.each([
    ["CUP 1 16", "CUP 1/16-FINAL"],
    ["CUP 1/16", "CUP 1/16-FINAL"],
    ["cup 1 32", "CUP 1/32-FINAL"],
    ["CUP 1 64", "CUP 1/64-FINAL"],
    ["CUP 1 8", "CUP 1/8-FINAL"],
    ["CUP 1 4", "CUP VIERTELFINAL"],
    ["CUP 1 2", "CUP HALBFINAL"],
    ["CUP GF", "CUP GROSSFELD"],
    ["Cup kf", "CUP KLEINFELD"],
    ["Cup", "CUP"],
  ])("erkennt %s", (token, label) => {
    const p = parseAlbumTitle(`URE D1 vs Wolhusen ${token}`);
    expect(p.competition).toEqual({ label, kind: "cup" });
    expect(p.isCup).toBe(true);
    expect(p.isHighlight).toBe(true);
    expect(p.cleanTitle).toBe("URE D1 vs Wolhusen");
    expect(p.cleanTitle.toLowerCase()).not.toContain("cup");
  });

  it("erkennt das Cup-Kürzel mitten im Titel", () => {
    const p = parseAlbumTitle("URE D1 CUP 1 16 vs Wolhusen");
    expect(p.cleanTitle).toBe("URE D1 vs Wolhusen");
    expect(p.homeTeam).toBe("URE D1");
    expect(p.awayTeam).toBe("Wolhusen");
  });

  it("Heimrunde und Runde 3 sind Meisterschaft", () => {
    for (const t of ["Heimrunde", "Runde 3", "runde 12"]) {
      const p = parseAlbumTitle(`URE D1 ${t}`);
      expect(p.competition).toEqual({ label: "MEISTERSCHAFT", kind: "league" });
      expect(p.isCup).toBe(false);
      expect(p.isHighlight).toBe(false);
      expect(p.cleanTitle).toBe("URE D1");
    }
  });

  it("kein Treffer: kein Wettbewerb", () => {
    expect(parseAlbumTitle("URE D1 vs Wizards").competition).toBeNull();
  });

  it("trennt bei vs und vs.", () => {
    expect(parseAlbumTitle("URE D1 vs Wizards")).toMatchObject({ homeTeam: "URE D1", awayTeam: "Wizards", location: null });
    expect(parseAlbumTitle("URE D1 VS. Wizards")).toMatchObject({ homeTeam: "URE D1", awayTeam: "Wizards" });
  });

  it("liest den Ort aus 'in Ort'", () => {
    expect(parseAlbumTitle("URE D1 vs Wizards in Sursee")).toMatchObject({ awayTeam: "Wizards", location: "Sursee" });
    expect(parseAlbumTitle("URE D1 vs Wizards in Bad Ragaz in Chur")).toMatchObject({ awayTeam: "Wizards in Bad Ragaz", location: "Chur" });
  });

  it("Titel ohne vs", () => {
    expect(parseAlbumTitle("Turnier in Sursee")).toMatchObject({ homeTeam: "Turnier", awayTeam: null, location: "Sursee" });
    expect(parseAlbumTitle("Teamfoto 2026")).toMatchObject({ homeTeam: "Teamfoto 2026", awayTeam: null, location: null });
    expect(parseAlbumTitle("Training Linden")).toMatchObject({ awayTeam: null, location: null });
  });

  it("leerer String", () => {
    expect(parseAlbumTitle("")).toEqual({
      cleanTitle: "",
      homeTeam: "",
      awayTeam: null,
      location: null,
      competition: null,
      isCup: false,
      isHighlight: false,
    });
  });

  it("toleriert Unterstriche und Mehrfach-Leerzeichen", () => {
    const p = parseAlbumTitle("URE_D1__vs_Wohusen_CUP_1_16");
    expect(p.cleanTitle).toBe("URE D1 vs Wolhusen");
    expect(p.competition?.label).toBe("CUP 1/16-FINAL");
  });
});

describe("matchMetadata", () => {
  afterEach(() => {
    for (const k of Object.keys(matchMetadata)) delete matchMetadata[k];
  });

  it("normalizeTitle", () => {
    expect(normalizeTitle("URE D1 vs. Wolhusen")).toBe("ure-d1-vs-wolhusen");
    expect(normalizeTitle("  URE__D1  vs Wolhusen ")).toBe("ure-d1-vs-wolhusen");
  });

  it("findet nichts ohne Eintrag", () => {
    expect(getMatchMeta("id-1", "URE D1 vs Wolhusen")).toBeNull();
    expect(getMatchMeta("", "constructor")).toBeNull();
  });

  it("Lookup per Titel", () => {
    matchMetadata["ure-d1-vs-wolhusen"] = { score: "5:4 n.V." };
    expect(getMatchMeta("id-1", "URE D1 vs. Wolhusen")).toEqual({ score: "5:4 n.V." });
  });

  it("ID hat Vorrang vor Titel", () => {
    matchMetadata["ure-d1-vs-wolhusen"] = { score: "1:0" };
    matchMetadata["id-1"] = { score: "2:0" };
    expect(getMatchMeta("id-1", "URE D1 vs Wolhusen")).toEqual({ score: "2:0" });
  });
});
