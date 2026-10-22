"use client";

export default function ErrorPage({ reset }: { error: Error; reset: () => void }) {
  return (
    <section className="hero small">
      <p className="eyebrow">Hoppla</p>
      <h1>Gerade nicht erreichbar.</h1>
      <p className="lead">Die Galerie lädt sich vielleicht gerade neu. Versuch es in einer Minute noch einmal.</p>
      <p>
        <button className="btn" onClick={reset}>
          Nochmal versuchen
        </button>
      </p>
    </section>
  );
}
