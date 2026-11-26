import { mkdir, mkdtemp, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import sharp from "sharp";
import { describe, expect, it } from "vitest";
import { findPortrait, loadPortraits, nameTokens, namesFromFile, type Portrait } from "../src/lib/portraits";

const p = (...names: string[]): Portrait => ({ path: `/x/${names[0]}.jpg`, mtime: 0, names });
const KADER = [
  p("Ramona Bucher"),
  p("Debora Bucher"),
  p("Céline Schmid"),
  p("Fabienne Lötscher-Töngi"),
  p("Sarah Bieri"),
  p("Jolanda Bieri"),
  p("Aline Lötscher", "Alina Lötscher"),
  p("Leandra Fischer", "Leli Fischer"),
];
const find = (name: string) => findPortrait(name, KADER)?.names[0] ?? null;

describe("nameTokens", () => {
  it("ignoriert Reihenfolge, Gross-/Kleinschreibung und Umlaute", () => {
    expect(nameTokens("Lötscher-Töngi Fabienne")).toEqual(["fabienne", "loetscher", "toengi"]);
    expect(nameTokens("Céline Schmid")).toEqual(nameTokens("schmid celine"));
  });
  it("versteht zerlegte Zeichen aus Mac-Dateinamen", () => {
    expect(nameTokens("Lötscher")).toEqual(nameTokens("Lötscher"));
  });
});

describe("namesFromFile", () => {
  it("liest Namen und Aliase aus dem Dateinamen", () => {
    expect(namesFromFile("Ronja Imboden.jpg")).toEqual(["Ronja Imboden"]);
    expect(namesFromFile("Leandra Fischer = Leli Fischer.JPEG")).toEqual(["Leandra Fischer", "Leli Fischer"]);
  });
  it("überspringt Nicht-Bilder und versteckte Dateien", () => {
    expect(namesFromFile("notizen.txt")).toBeNull();
    expect(namesFromFile("._Ronja Imboden.jpg")).toBeNull();
  });
});

describe("findPortrait", () => {
  it("findet Vor- und Nachname in beliebiger Reihenfolge", () => {
    expect(find("Ramona Bucher")).toBe("Ramona Bucher");
    expect(find("Bucher Ramona")).toBe("Ramona Bucher");
    expect(find("Celine Schmid")).toBe("Céline Schmid");
  });
  it("passt auch auf einen Teil eines Doppelnamens", () => {
    expect(find("Fabienne Lötscher")).toBe("Fabienne Lötscher-Töngi");
  });
  it("unterscheidet gleiche Nachnamen und kennt Aliase", () => {
    expect(find("Sarah Bieri")).toBe("Sarah Bieri");
    expect(find("Bieri Jolanda")).toBe("Jolanda Bieri");
    expect(find("Alina Lötscher")).toBe("Aline Lötscher");
    expect(find("Leli Fischer")).toBe("Leandra Fischer");
  });
  it("liefert nichts bei nur einem Namensteil, Unbekannten oder Mehrdeutigem", () => {
    expect(find("Bucher")).toBeNull();
    expect(find("Max Muster")).toBeNull();
    expect(findPortrait("Ramona Bucher", [p("Ramona Bucher"), p("Ramona Bucher-Frei")])).toBeNull();
  });
});

describe("loadPortraits", () => {
  it("liest beide Ordner; der erste gewinnt bei derselben Person", async () => {
    const root = await mkdtemp(join(tmpdir(), "portraits-"));
    const eigen = join(root, "eigen");
    const start = join(root, "start");
    await mkdir(eigen);
    await mkdir(start);
    const jpg = await sharp({ create: { width: 8, height: 8, channels: 3, background: "#888" } }).jpeg().toBuffer();
    await writeFile(join(eigen, "Ronja Imboden.jpg"), jpg);
    await writeFile(join(eigen, "readme.txt"), "x");
    await writeFile(join(start, "ronja imboden.jpg"), jpg);
    await writeFile(join(start, "Ramona Bucher.jpg"), jpg);

    const list = await loadPortraits([eigen, join(root, "gibt-es-nicht"), start]);
    expect(list.map((x) => x.path).sort()).toEqual([join(eigen, "Ronja Imboden.jpg"), join(start, "Ramona Bucher.jpg")]);
  });
  it("ist bei fehlendem Ordner einfach leer", async () => {
    expect(await loadPortraits(["/gibt/es/nicht"])).toEqual([]);
  });
  it("der mitgelieferte Startbestand ist vollständig lesbar", async () => {
    const list = await loadPortraits(["public/portraits"]);
    expect(list.length).toBe(32);
    expect(findPortrait("Leli Fischer", list)).not.toBeNull();
    expect(findPortrait("Fabienne Lötscher", list)).not.toBeNull();
  });
});
