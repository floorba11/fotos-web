import { mkdirSync, renameSync, writeFileSync } from "node:fs";
import { mkdir, readFile, rename, writeFile } from "node:fs/promises";
import { dirname } from "node:path";

// Zählt pro Album Aufrufe und Downloads. Datenschutzfreundlich: gespeichert werden nur Zahlen pro Album,
// keine IP-Adressen, keine Cookies, keine Browserkennungen. Die Datei liegt im Docker-Volume (STATS_FILE).

export type AlbumStats = {
  /** Aufrufe der Albumseite (pro Browser-Tab einmal, siehe ViewBeacon) */
  views: number;
  /** "Alle herunterladen (ZIP)" */
  zips: number;
  /** Einzelne Fotos in Originalgrösse heruntergeladen */
  photos: number;
};

export type StatsData = { since: string; albums: Record<string, AlbumStats> };

export type StatKind = keyof AlbumStats;

const empty = (): AlbumStats => ({ views: 0, zips: 0, photos: 0 });

/** Bekannte Bots, Crawler und Link-Vorschauen zählen nicht mit */
const BOT = /bot|crawl|spider|slurp|preview|facebookexternalhit|whatsapp|telegram|discord|curl|wget|python|headless|lighthouse|monitor/i;

export function isBot(userAgent: string | null): boolean {
  return !userAgent || BOT.test(userAgent);
}

export function createStatsStore(file: string, { flushMs = 10_000 } = {}) {
  let data: StatsData | null = null;
  let loading: Promise<StatsData> | null = null;
  let dirty = false;
  let timer: ReturnType<typeof setTimeout> | null = null;
  let writing: Promise<void> = Promise.resolve();

  async function load(): Promise<StatsData> {
    if (data) return data;
    loading ??= readFile(file, "utf8")
      .then((raw) => {
        const parsed = JSON.parse(raw) as Partial<StatsData>;
        return { since: parsed.since ?? new Date().toISOString(), albums: parsed.albums ?? {} };
      })
      .catch((err: NodeJS.ErrnoException) => {
        // Datei fehlt beim ersten Start: neu beginnen. Kaputte Datei: nicht überschreiben, sondern beiseitelegen.
        if (err.code !== "ENOENT") {
          console.error("Statistik-Datei unlesbar, beginne neu:", err.message);
          rename(file, `${file}.kaputt-${Date.now()}`).catch(() => {});
        }
        return { since: new Date().toISOString(), albums: {} };
      })
      .then((d) => (data = d));
    return loading;
  }

  function flush(): Promise<void> {
    if (timer) clearTimeout(timer);
    timer = null;
    if (!dirty || !data) return writing;
    dirty = false;
    const snapshot = JSON.stringify(data);
    // atomar schreiben: erst in eine Hilfsdatei, dann umbenennen, damit ein Absturz nie eine halbe Datei hinterlässt
    writing = writing
      .then(async () => {
        await mkdir(dirname(file), { recursive: true });
        await writeFile(`${file}.tmp`, snapshot);
        await rename(`${file}.tmp`, file);
      })
      .catch((err: Error) => {
        dirty = true;
        console.error("Statistik konnte nicht gespeichert werden:", err.message);
      });
    return writing;
  }

  return {
    async add(albumId: string, kind: StatKind): Promise<void> {
      const d = await load();
      (d.albums[albumId] ??= empty())[kind]++;
      dirty = true;
      timer ??= setTimeout(() => void flush(), flushMs);
    },
    async get(albumId: string): Promise<AlbumStats> {
      return { ...((await load()).albums[albumId] ?? empty()) };
    },
    async all(): Promise<StatsData> {
      const d = await load();
      return { since: d.since, albums: structuredClone(d.albums) };
    },
    flush,
    /** Nur für das Prozessende: schreibt sofort und blockierend */
    flushSync(): void {
      if (!dirty || !data) return;
      try {
        mkdirSync(dirname(file), { recursive: true });
        writeFileSync(`${file}.tmp`, JSON.stringify(data));
        renameSync(`${file}.tmp`, file);
        dirty = false;
      } catch (err) {
        console.error("Statistik konnte beim Beenden nicht gespeichert werden:", (err as Error).message);
      }
    },
  };
}

const STATS_FILE = process.env.STATS_FILE || "/data/stats.json";

// eine Instanz pro Prozess, auch wenn Next.js das Modul mehrfach lädt
const g = globalThis as typeof globalThis & { __fotosStats?: ReturnType<typeof createStatsStore>; __fotosStatsExit?: boolean };
export const stats = (g.__fotosStats ??= createStatsStore(STATS_FILE));

if (!g.__fotosStatsExit) {
  g.__fotosStatsExit = true;
  // beim Neustart (Deploy) die letzten Zählungen noch sichern; "exit" erlaubt nur synchrones Schreiben
  process.once("exit", () => stats.flushSync());
}

/** Zählen darf die Antwort nie verzögern oder kaputt machen */
export function count(albumId: string, kind: StatKind, request: Request): void {
  if (isBot(request.headers.get("user-agent"))) return;
  stats.add(albumId, kind).catch(() => {});
}
