import { getPerson, immich, isUuid } from "@/lib/immich";
import { portraitFor } from "@/lib/portraits";

/** Gesichts-Vorschau einer Person: Kaderporträt, falls vorhanden, sonst Immich "people thumbnail" */
export async function GET(_request: Request, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params;
  if (!isUuid(id)) return new Response("Nicht gefunden", { status: 404 });
  const person = await getPerson(id).catch(() => null);
  const portrait = person && portraitFor(person.name);
  if (portrait) {
    // relativer Pfad: hinter dem Reverse-Proxy kennt der Server die öffentliche Adresse nicht
    return new Response(null, { status: 302, headers: { Location: portrait, "Cache-Control": "public, max-age=3600" } });
  }
  const upstream = await immich(`/people/${id}/thumbnail`, { headers: { Accept: "*/*" } }).catch(() => null);
  if (!upstream?.ok || !upstream.body) return new Response("Nicht gefunden", { status: upstream?.status === 404 ? 404 : 502 });
  return new Response(upstream.body, {
    headers: {
      "Content-Type": upstream.headers.get("content-type") ?? "image/jpeg",
      "Cache-Control": "public, max-age=86400, stale-while-revalidate=604800",
    },
  });
}
