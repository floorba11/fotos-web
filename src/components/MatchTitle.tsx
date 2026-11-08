import { parseAlbumTitle } from "@/lib/parseAlbumTitle";

/** "URE D1 vs Wizards" → Teamnamen, "vs" klein in der Akzentfarbe dazwischen */
export function MatchTitle({ title }: { title: string }) {
  const { homeTeam, awayTeam, cleanTitle } = parseAlbumTitle(title);
  if (!awayTeam) return <>{cleanTitle || title}</>;
  return (
    <>
      {homeTeam} <span className="vs">vs</span> {awayTeam}
    </>
  );
}
