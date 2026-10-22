export default function Loading() {
  return (
    <div className="cards skeleton" aria-busy="true" aria-label="Lädt">
      {Array.from({ length: 6 }, (_, i) => (
        <div key={i} className="card" />
      ))}
    </div>
  );
}
