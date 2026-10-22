import { existsSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { PORTRAITS, nameTokens, portraitFor } from "../src/lib/portraits";

describe("nameTokens", () => {
  it("ignoriert Reihenfolge, Gross-/Kleinschreibung und Umlaute", () => {
    expect(nameTokens("Lötscher-Töngi Fabienne")).toEqual(["fabienne", "loetscher", "toengi"]);
    expect(nameTokens("Céline Schmid")).toEqual(nameTokens("schmid celine"));
  });
});

describe("portraitFor", () => {
  it("findet Vor- und Nachname in beliebiger Reihenfolge", () => {
    expect(portraitFor("Ramona Bucher")).toBe("/portraits/ramona-bucher.jpg");
    expect(portraitFor("Bucher Ramona")).toBe("/portraits/ramona-bucher.jpg");
    expect(portraitFor("Celine Schmid")).toBe("/portraits/celine-schmid.jpg");
  });
  it("passt auch auf einen Teil eines Doppelnamens", () => {
    expect(portraitFor("Fabienne Lötscher")).toBe("/portraits/fabienne-loetscher-toengi.jpg");
  });
  it("kennt Spitznamen", () => {
    expect(portraitFor("Leli Fischer")).toBe("/portraits/leandra-fischer.jpg");
  });
  it("liefert nichts bei nur einem Namensteil oder Unbekannten", () => {
    expect(portraitFor("Bucher")).toBeNull();
    expect(portraitFor("Eliane")).toBeNull();
    expect(portraitFor("Max Muster")).toBeNull();
  });
  it("jede Porträtdatei existiert", () => {
    for (const p of PORTRAITS) expect(existsSync(`public/portraits/${p.file}`), p.file).toBe(true);
  });
});
