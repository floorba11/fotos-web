import { describe, expect, it } from "vitest";
import { compareByLastName, splitName } from "../src/lib/name";

describe("splitName", () => {
  it("Vor- und Nachname", () => expect(splitName("Anna Muster")).toEqual({ first: "Anna", last: "Muster" }));
  it("mehrere Vornamen", () => expect(splitName("Anna Maria Muster")).toEqual({ first: "Anna Maria", last: "Muster" }));
  it("Doppelname mit Bindestrich", () => expect(splitName("Anna Muster-Meier")).toEqual({ first: "Anna", last: "Muster-Meier" }));
  it("Namenszusatz gehört zum Nachnamen", () => expect(splitName("Lea von Rotz")).toEqual({ first: "Lea", last: "von Rotz" }));
  it("von Gunten", () => expect(splitName("Yannik von Gunten")).toEqual({ first: "Yannik", last: "von Gunten" }));
  it("mehrere Zusätze", () => expect(splitName("Tim van der Berg")).toEqual({ first: "Tim", last: "van der Berg" }));
  it("Zusatz gross geschrieben bleibt Vorname-Teil", () => expect(splitName("Anna Von Rotz")).toEqual({ first: "Anna Von", last: "Rotz" }));
  it("nur ein Wort", () => expect(splitName("Muster")).toEqual({ first: "", last: "Muster" }));
  it("leer", () => expect(splitName("  ")).toEqual({ first: "", last: "" }));
});

describe("compareByLastName", () => {
  it("nach Nachname, dann Vorname", () => {
    const names = ["Zora Ammann", "Anna Bucher", "Lea von Rotz", "Ben Ammann", "Mia Ähnli", "Tom Zihlmann", "Muster"];
    expect(names.sort(compareByLastName)).toEqual(["Mia Ähnli", "Ben Ammann", "Zora Ammann", "Anna Bucher", "Muster", "Lea von Rotz", "Tom Zihlmann"]);
  });
});
