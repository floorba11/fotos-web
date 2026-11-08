import { describe, expect, it } from "vitest";
import { splitName } from "../src/lib/name";

describe("splitName", () => {
  it("Vor- und Nachname", () => expect(splitName("Anna Muster")).toEqual({ first: "Anna", last: "Muster" }));
  it("mehrere Vornamen", () => expect(splitName("Anna Maria Muster")).toEqual({ first: "Anna Maria", last: "Muster" }));
  it("nur ein Wort", () => expect(splitName("Muster")).toEqual({ first: "", last: "Muster" }));
  it("leer", () => expect(splitName("  ")).toEqual({ first: "", last: "" }));
});
