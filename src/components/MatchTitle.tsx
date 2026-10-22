/** "URE D1 vs Wizards" → Teamnamen hervorgehoben, "vs" klein dazwischen */
export function MatchTitle({ title }: { title: string }) {
  const m = /^(.+?)\s+vs\.?\s+(.+)$/i.exec(title);
  if (!m) return <>{title}</>;
  return (
    <>
      {m[1]} <span className="vs">vs</span> {m[2]}
    </>
  );
}
