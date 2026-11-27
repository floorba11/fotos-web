import type { Metadata } from "next";
import Link from "next/link";
import { formatDate, isOtherAlbum, parseAlbumName } from "@/lib/format";
import { getAlbumExif, getAlbums, type Album } from "@/lib/immich";
import { parseAlbumTitle } from "@/lib/parseAlbumTitle";
import { buildOverview, type PhotoOverview, type Tally } from "@/lib/photoStats";
import { stats } from "@/lib/stats";
import "@/styles/statistik.css";

// Nur für Luc (Passwortschutz in src/proxy.ts)
export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Statistik" };

const SORTS = {
  datum: "Datum",
  aufrufe: "Aufrufe",
  downloads: "Downloads",
} as const;
type Sort = keyof typeof SORTS;

const n = (v: number) => v.toLocaleString("de-CH");

/** EXIF aller sichtbaren Alben, höchstens 4 gleichzeitig (Immich läuft auf einem kleinen Server) */
async function loadOverview(albums: Album[]): Promise<PhotoOverview | null> {
  try {
    const out: { name: string; photos: Awaited<ReturnType<typeof getAlbumExif>> }[] = [];
    for (let i = 0; i < albums.length; i += 4) {
      const batch = albums.slice(i, i + 4);
      const exif = await Promise.all(batch.map((a) => getAlbumExif(a.id)));
      batch.forEach((a, j) => out.push({ name: a.name, photos: exif[j] }));
    }
    return buildOverview(out);
  } catch {
    return null; // die Zählerstände sollen trotzdem erscheinen
  }
}

const TOP = 8;

function BarList({ title, items, total }: { title: string; items: Tally[]; total: number }) {
  const max = Math.max(1, ...items.map((i) => i.count));
  const row = (i: Tally) => (
    <li key={i.label} className="st-bar">
      <span className="st-bar-label" title={i.label}>
        {i.label}
      </span>
      <span className="st-bar-num">
        {n(i.count)} <small>{Math.round((i.count / Math.max(1, total)) * 100)}%</small>
      </span>
      <span className="st-bar-track" aria-hidden="true">
        <span className="st-bar-fill" style={{ width: `${(i.count / max) * 100}%` }} />
      </span>
    </li>
  );
  return (
    <section className="st-panel">
      <h2 className="st-h2">{title}</h2>
      {items.length ? (
        <>
          <ul className="st-bars">{items.slice(0, TOP).map(row)}</ul>
          {items.length > TOP && (
            <details className="st-more">
              <summary>{items.length - TOP} weitere</summary>
              <ul className="st-bars">{items.slice(TOP).map(row)}</ul>
            </details>
          )}
        </>
      ) : (
        <p className="st-empty">Keine Angaben</p>
      )}
    </section>
  );
}

export default async function StatsPage({ searchParams }: { searchParams: Promise<{ sort?: string }> }) {
  const sortParam = (await searchParams).sort;
  const sort: Sort = sortParam && sortParam in SORTS ? (sortParam as Sort) : "datum";
  const [albums, data] = await Promise.all([getAlbums(), stats.all()]);
  const overview = await loadOverview(albums);

  const rows = albums.map((a) => {
    const s = data.albums[a.id] ?? { views: 0, zips: 0, photos: 0 };
    const { season, title } = parseAlbumName(a.name);
    const other = isOtherAlbum(a.name);
    return {
      tags: other ? [] : parseAlbumTitle(title).tags,
      id: a.id,
      href: isOtherAlbum(a.name) ? `/weitere/${a.id}` : `/album/${a.id}`,
      title: parseAlbumTitle(title).cleanTitle || title,
      season,
      start: a.start,
      count: a.count,
      ...s,
      downloads: s.zips + s.photos,
    };
  });
  if (sort === "aufrufe") rows.sort((a, b) => b.views - a.views);
  if (sort === "downloads") rows.sort((a, b) => b.downloads - a.downloads);

  // pro Tag: Alben, Fotos, Aufrufe, Downloads (nur Spielalben; Off-Court hat keine Tags)
  const tagRows = new Map<string, { label: string; cup: boolean; albums: number; count: number; views: number; downloads: number }>();
  for (const r of rows) {
    for (const t of r.tags) {
      const key = t.kind === "cup" ? "CUP (alle Runden)" : t.label;
      const e = tagRows.get(key) ?? { label: key, cup: t.kind === "cup", albums: 0, count: 0, views: 0, downloads: 0 };
      e.albums++;
      e.count += r.count;
      e.views += r.views;
      e.downloads += r.downloads;
      tagRows.set(key, e);
    }
  }
  const tagList = [...tagRows.values()].sort((a, b) => b.albums - a.albums || a.label.localeCompare(b.label, "de"));

  const total = rows.reduce((t, r) => ({ views: t.views + r.views, zips: t.zips + r.zips, photos: t.photos + r.photos }), { views: 0, zips: 0, photos: 0 });

  return (
    <>
      <header className="page-head">
        <div>
          <p className="eyebrow">Nur für dich</p>
          <h1 className="h-album">Statistik</h1>
          <p className="meta">Gezählt seit {formatDate(data.since)} · ohne Bots · Aufrufe einmal pro Browser-Tab</p>
        </div>
      </header>

      <div className="st-cards">
        <div className="st-card">
          <span className="st-num">{n(total.views)}</span>
          <span className="st-label">Aufrufe</span>
        </div>
        <div className="st-card">
          <span className="st-num">{n(total.zips)}</span>
          <span className="st-label">ZIP-Downloads</span>
        </div>
        <div className="st-card">
          <span className="st-num">{n(total.photos)}</span>
          <span className="st-label">Einzelfotos geladen</span>
        </div>
      </div>

      <h2 className="st-h2 st-section">Fotos</h2>
      {overview ? (
        <>
          <div className="st-cards">
            <div className="st-card">
              <span className="st-num">{n(overview.total)}</span>
              <span className="st-label">Fotos online</span>
            </div>
            <div className="st-card">
              <span className="st-num">{n(overview.albums)}</span>
              <span className="st-label">Alben</span>
            </div>
            <div className="st-card">
              <span className="st-num">{n(overview.cameras.filter((c) => !c.label.startsWith("Unbekannt")).length)}</span>
              <span className="st-label">Kameras</span>
            </div>
            <div className="st-card">
              <span className="st-num">{n(overview.lenses.filter((c) => !c.label.startsWith("Unbekannt")).length)}</span>
              <span className="st-label">Objektive</span>
            </div>
          </div>
          <div className="st-panels">
            <BarList title="Kameras" items={overview.cameras} total={overview.total} />
            <BarList title="Objektive" items={overview.lenses} total={overview.total} />
            <BarList title="Kamera + Objektiv" items={overview.combos} total={overview.total} />
            <BarList title="Orte" items={overview.places} total={overview.total} />
          </div>
          <p className="st-note">
            Orte: {n(overview.withGps)} von {n(overview.total)} Fotos haben einen GPS-Ort in den EXIF-Daten, bei den übrigen gilt der Spielort aus dem
            Albumnamen («… in Ort»).
          </p>
        </>
      ) : (
        <p className="st-empty">Die Kamera- und Ortsangaben konnten gerade nicht aus Immich geladen werden.</p>
      )}

      <h2 className="st-h2 st-section">Tags</h2>
      {tagList.length ? (
        <div className="st-scroll">
          <table className="st-table">
            <thead>
              <tr>
                <th scope="col">Tag</th>
                <th scope="col" className="st-r">Alben</th>
                <th scope="col" className="st-r">Fotos</th>
                <th scope="col" className="st-r">Aufrufe</th>
                <th scope="col" className="st-r">Downloads</th>
              </tr>
            </thead>
            <tbody>
              {tagList.map((t) => (
                <tr key={t.label}>
                  <td>
                    <span className={t.cup ? "st-tag st-tag-cup" : "st-tag"}>{t.label}</span>
                  </td>
                  <td className="st-r">{n(t.albums)}</td>
                  <td className="st-r">{n(t.count)}</td>
                  <td className="st-r st-strong">{n(t.views)}</td>
                  <td className="st-r">{n(t.downloads)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <p className="st-empty">Noch keine Spielalben.</p>
      )}

      <h2 className="st-h2 st-section">Alben</h2>
      <p className="st-sort">
        Sortieren:{" "}
        {(Object.keys(SORTS) as Sort[]).map((k) => (
          <Link key={k} href={k === "datum" ? "/statistik" : `/statistik?sort=${k}`} className={k === sort ? "st-active" : undefined} aria-current={k === sort ? "true" : undefined}>
            {SORTS[k]}
          </Link>
        ))}
      </p>

      <div className="st-scroll">
        <table className="st-table">
          <thead>
            <tr>
              <th scope="col">Album</th>
              <th scope="col">Datum</th>
              <th scope="col" className="st-r">Fotos</th>
              <th scope="col" className="st-r">Aufrufe</th>
              <th scope="col" className="st-r">ZIP</th>
              <th scope="col" className="st-r">Einzelfotos</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r.id}>
                <td>
                  <Link href={r.href}>{r.title}</Link>
                  {(r.season || r.tags.length > 0) && (
                    <span className="st-season">
                      {r.season}
                      {r.tags.map((t) => (
                        <span key={t.label} className={t.kind === "cup" ? "st-tag st-tag-cup" : "st-tag"}>
                          {t.label}
                        </span>
                      ))}
                    </span>
                  )}
                </td>
                <td className="st-date">{r.start ? formatDate(r.start) : "–"}</td>
                <td className="st-r">{n(r.count)}</td>
                <td className="st-r st-strong">{n(r.views)}</td>
                <td className="st-r">{n(r.zips)}</td>
                <td className="st-r">{n(r.photos)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </>
  );
}
