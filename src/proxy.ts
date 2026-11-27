import { NextResponse, type NextRequest } from "next/server";

// Die Statistik sieht nur Luc: Passwortschutz per Browser-Anmeldung (HTTP Basic Auth) mit STATS_PASSWORD.
// Ohne STATS_PASSWORD gibt es die Seite gar nicht (404).

/** Vergleich in konstanter Zeit, damit sich das Passwort nicht Zeichen für Zeichen erraten lässt */
function same(a: string, b: string): boolean {
  let diff = a.length ^ b.length;
  for (let i = 0; i < Math.max(a.length, b.length); i++) diff |= (a.charCodeAt(i) || 0) ^ (b.charCodeAt(i) || 0);
  return diff === 0;
}

export function checkStatsAuth(header: string | null, password: string | undefined): "ok" | "fehlt" | "falsch" {
  if (!password) return "fehlt";
  const [scheme, encoded] = (header ?? "").split(" ");
  if (scheme?.toLowerCase() !== "basic" || !encoded) return "falsch";
  let decoded = "";
  try {
    decoded = atob(encoded);
  } catch {
    return "falsch";
  }
  // Benutzername egal, nur das Passwort zählt
  return same(decoded.slice(decoded.indexOf(":") + 1), password) ? "ok" : "falsch";
}

export function proxy(request: NextRequest) {
  const result = checkStatsAuth(request.headers.get("authorization"), process.env.STATS_PASSWORD);
  if (result === "ok") return NextResponse.next();
  if (result === "fehlt") return new NextResponse("Nicht gefunden", { status: 404 });
  return new NextResponse("Anmeldung nötig", {
    status: 401,
    headers: { "WWW-Authenticate": 'Basic realm="Statistik", charset="UTF-8"', "Cache-Control": "no-store" },
  });
}

export const config = { matcher: ["/statistik", "/statistik/:path*"] };
