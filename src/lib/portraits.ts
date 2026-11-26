// Kaderporträts: Bilddateien, die nach der Person benannt sind, z.B. "Ronja Imboden.jpg".
// Zwei Orte, der erste gewinnt:
//   1. PORTRAITS_DIR (Standard /portraits): privater Ordner auf der Storage Box, schreibgeschützt eingebunden.
//      Neue Porträts einfach dort ablegen, kein Commit und kein Deploy nötig.
//   2. public/portraits: mitgelieferter Startbestand (von uh-regio-entlebuch.ch), gilt, solange es im Ordner kein eigenes gibt.
// Mehrere Namen für dieselbe Person (Spitzname, Schreibvariante): "Leandra Fischer = Leli Fischer.jpg".
// Gibt es zu einer Immich-Person ein Porträt, zeigt die Seite dieses, sonst das Gesicht aus ihrem neusten Foto.

import { readdir, readFile, stat } from "node:fs/promises";
import { join } from "node:path";
import sharp from "sharp";

export const PORTRAIT_SIZE = 240;
const EXT = /\.(jpe?g|png|webp)$/i;
const LIST_TTL = 30 * 1000;

export type Portrait = { path: string; mtime: number; names: string[] };

/** "Lötscher-Töngi Fabienne" → ["fabienne", "loetscher", "toengi"] (Reihenfolge und Akzente egal) */
export function nameTokens(name: string): string[] {
  const plain = name
    // NFC zuerst: Dateinamen vom Mac (SMB) kommen oft zerlegt ("o" + Trema) an
    .normalize("NFC")
    .toLowerCase()
    .replace(/ä/g, "ae")
    .replace(/ö/g, "oe")
    .replace(/ü/g, "ue")
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "");
  return plain.split(/[^a-z0-9]+/).filter(Boolean).sort();
}

/** Namen aus einem Dateinamen ("A B = C D.jpg" → ["A B", "C D"]) oder null, wenn es kein Bild ist */
export function namesFromFile(file: string): string[] | null {
  if (file.startsWith(".") || !EXT.test(file)) return null;
  const names = file.replace(EXT, "").split(" = ").map((n) => n.trim()).filter(Boolean);
  return names.length ? names : null;
}

/**
 * Das Porträt einer Person oder null.
 * Alle Namensteile aus Immich müssen im Namen der Datei vorkommen (mindestens Vor- und Nachname),
 * so passt "Fabienne Lötscher" auf "Fabienne Lötscher-Töngi". Mehrdeutige Treffer zählen nicht.
 */
export function findPortrait(name: string, portraits: Portrait[]): Portrait | null {
  const wanted = nameTokens(name);
  if (wanted.length < 2) return null;
  const hits = portraits.filter((p) => p.names.some((n) => wanted.every((t) => nameTokens(n).includes(t))));
  return hits.length === 1 ? hits[0] : null;
}

export function portraitDirs(): string[] {
  return [process.env.PORTRAITS_DIR || "/portraits", join(process.cwd(), "public/portraits")];
}

/** Alle Porträts der Ordner; steht dieselbe Person schon in einem früheren Ordner, wird sie in späteren übersprungen */
export async function loadPortraits(dirs: string[]): Promise<Portrait[]> {
  const result: Portrait[] = [];
  const seen = new Set<string>();
  for (const dir of dirs) {
    const files = await readdir(dir).catch(() => []);
    const found: Portrait[] = [];
    for (const file of files.sort()) {
      const names = namesFromFile(file);
      if (!names) continue;
      const path = join(dir, file);
      const info = await stat(path).catch(() => null);
      if (info?.isFile()) found.push({ path, mtime: info.mtimeMs, names });
    }
    const dirKeys = new Set<string>();
    for (const p of found) {
      const keys = p.names.map((n) => nameTokens(n).join(" "));
      if (keys.some((k) => seen.has(k))) continue;
      result.push(p);
      keys.forEach((k) => dirKeys.add(k));
    }
    dirKeys.forEach((k) => seen.add(k));
  }
  return result;
}

let listing: { at: number; items: Portrait[] } | null = null;
const rendered = new Map<string, Buffer>();

async function portraits(): Promise<Portrait[]> {
  if (!listing || Date.now() - listing.at > LIST_TTL) listing = { at: Date.now(), items: await loadPortraits(portraitDirs()) };
  return listing.items;
}

/** Porträt der Person als 240×240-JPEG (beliebig grosse Vorlagen werden zugeschnitten) oder null */
export async function portraitImage(name: string): Promise<Buffer | null> {
  const portrait = findPortrait(name, await portraits());
  if (!portrait) return null;
  const key = `${portrait.path}:${portrait.mtime}`;
  let image = rendered.get(key);
  if (!image) {
    try {
      image = await sharp(await readFile(portrait.path))
        .rotate()
        .resize(PORTRAIT_SIZE, PORTRAIT_SIZE, { fit: "cover", position: "attention" })
        .jpeg({ quality: 85 })
        .toBuffer();
    } catch {
      return null; // defekte Datei: wie "kein Porträt" behandeln
    }
    if (rendered.size > 200) rendered.clear();
    rendered.set(key, image);
  }
  return image;
}
