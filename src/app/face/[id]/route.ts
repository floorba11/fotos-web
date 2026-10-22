import { immich, isUuid } from "@/lib/immich";

/** Gesichts-Vorschau einer Person (Immich "people thumbnail") */
export async function GET(_request: Request, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params;
  if (!isUuid(id)) return new Response("Nicht gefunden", { status: 404 });
  const upstream = await immich(`/people/${id}/thumbnail`, { headers: { Accept: "*/*" } }).catch(() => null);
  if (!upstream?.ok || !upstream.body) return new Response("Nicht gefunden", { status: upstream?.status === 404 ? 404 : 502 });
  return new Response(upstream.body, {
    headers: {
      "Content-Type": upstream.headers.get("content-type") ?? "image/jpeg",
      "Cache-Control": "public, max-age=86400, stale-while-revalidate=604800",
    },
  });
}
