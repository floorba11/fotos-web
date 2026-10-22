import Link from "next/link";

export default function NotFound() {
  return (
    <section className="hero small">
      <p className="eyebrow">404</p>
      <h1>Das gibt&apos;s nicht.</h1>
      <p className="lead">Dieses Album oder diese Person existiert nicht (mehr).</p>
      <p>
        <Link className="btn" href="/">
          Zu den Spielen
        </Link>
      </p>
    </section>
  );
}
