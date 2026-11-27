import { mkdtemp, readFile, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { checkStatsAuth } from "../src/proxy";
import { createStatsStore, isBot } from "../src/lib/stats";

const A = "11111111-1111-4111-8111-111111111111";
const tmp = async () => join(await mkdtemp(join(tmpdir(), "stats-")), "sub", "stats.json");

describe("createStatsStore", () => {
  it("zählt pro Album und Art", async () => {
    const s = createStatsStore(await tmp());
    await s.add(A, "views");
    await s.add(A, "views");
    await s.add(A, "zips");
    expect(await s.get(A)).toEqual({ views: 2, zips: 1, photos: 0 });
    expect(await s.get("anderes")).toEqual({ views: 0, zips: 0, photos: 0 });
  });

  it("speichert in die Datei und liest sie wieder", async () => {
    const file = await tmp();
    const s = createStatsStore(file);
    await s.add(A, "photos");
    await s.flush();
    const saved = JSON.parse(await readFile(file, "utf8"));
    expect(saved.albums[A]).toEqual({ views: 0, zips: 0, photos: 1 });
    const again = createStatsStore(file);
    await again.add(A, "photos");
    expect((await again.get(A)).photos).toBe(2);
    expect((await again.all()).since).toBe(saved.since);
  });

  it("beginnt bei kaputter Datei neu, statt abzustürzen", async () => {
    const file = await tmp();
    const s0 = createStatsStore(file);
    await s0.add(A, "views");
    await s0.flush();
    await writeFile(file, "{kaputt");
    const s = createStatsStore(file);
    expect(await s.get(A)).toEqual({ views: 0, zips: 0, photos: 0 });
  });
});

describe("isBot", () => {
  it("erkennt Bots und fehlende Kennung", () => {
    expect(isBot("Mozilla/5.0 (compatible; Googlebot/2.1)")).toBe(true);
    expect(isBot("WhatsApp/2.23")).toBe(true);
    expect(isBot(null)).toBe(true);
    expect(isBot("Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X) AppleWebKit/605.1.15 Mobile/15E148 Safari/604.1")).toBe(false);
  });
});

describe("checkStatsAuth", () => {
  const basic = (s: string) => `Basic ${btoa(s)}`;
  it("ohne Passwort gibt es die Seite nicht", () => {
    expect(checkStatsAuth(basic("luc:x"), undefined)).toBe("fehlt");
  });
  it("prüft nur das Passwort", () => {
    expect(checkStatsAuth(basic("luc:geheim:1"), "geheim:1")).toBe("ok");
    expect(checkStatsAuth(basic(":geheim:1"), "geheim:1")).toBe("ok");
    expect(checkStatsAuth(basic("luc:falsch"), "geheim:1")).toBe("falsch");
    expect(checkStatsAuth(null, "geheim:1")).toBe("falsch");
    expect(checkStatsAuth("Basic %%%", "geheim:1")).toBe("falsch");
  });
});

describe("flushSync", () => {
  it("schreibt sofort (für das Prozessende)", async () => {
    const file = await tmp();
    const s = createStatsStore(file, { flushMs: 60_000 });
    await s.add(A, "zips");
    s.flushSync();
    expect(JSON.parse(await readFile(file, "utf8")).albums[A].zips).toBe(1);
  });
});
