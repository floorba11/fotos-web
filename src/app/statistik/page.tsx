import type { Metadata } from "next";
import Link from "next/link";
import { formatDate, isOtherAlbum, parseAlbumName } from "@/lib/format";
import { getAlbums } from "@/lib/immich";
import { parseAlbumTitle } from "@/lib/parseAlbumTitle";
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

export default async function StatsPage({ searchParams }: { searchParams: Promise<{ sort?: string }> }) {
  const sortParam = (await searchParams).sort;
  const sort: Sort = sortParam && sortParam in SORTS ? (sortParam as Sort) : "datum";
  const [albums, data] = await Promise.all([getAlbums(), stats.all()]);

  const rows = albums.map((a) => {
    const s = data.albums[a.id] ?? { views: 0, zips: 0, photos: 0 };
    const { season, title } = parseAlbumName(a.name);
    return {
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
                  {r.season && <span className="st-season">{r.season}</span>}
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
