import { getVisiblePhotoIds, immich, isUuid } from "@/lib/immich";

const PATHS: Record<string, (id: string) => string> = {
  thumbnail: (id) => `/assets/${id}/thumbnail?size=thumbnail`,
  preview: (id) => `/assets/${id}/thumbnail?size=preview`,
  original: (id) => `/assets/${id}/original`,
};

/** Dateiname aus dem Header von Immich, sonst Ersatzname (nur harmlose Zeichen) */
function fileName(upstream: Response, id: string): string {
  const raw = /filename\*?=(?:UTF-8'')?"?([^";]+)"?/i.exec(upstream.headers.get("content-disposition") ?? "")?.[1];
  const name = raw ? decodeURIComponent(raw) : `foto-${id.slice(0, 8)}.jpg`;
  return name.replace(/[^\w.\- ()]/g, "_");
}

export async function GET(request: Request, ctx: { params: Promise<{ id: string; size: string }> }) {
  const { id, size } = await ctx.params;
  if (!isUuid(id) || !(size in PATHS)) return new Response("Nicht gefunden", { status: 404 });
  // nur Fotos aus sichtbaren Alben, nie aus "_"-Alben
  const visible = await getVisiblePhotoIds().catch(() => null);
  if (!visible) return new Response("Galerie nicht erreichbar", { status: 502 });
  if (!visible.has(id)) return new Response("Nicht gefunden", { status: 404 });

  const upstream = await immich(PATHS[size](id), { headers: { Accept: "*/*" } }).catch(() => null);
  if (!upstream) return new Response("Galerie nicht erreichbar", { status: 502 });
  if (!upstream.ok || !upstream.body) return new Response("Nicht gefunden", { status: upstream.status === 404 ? 404 : 502 });

  const headers = new Headers({
    "Content-Type": upstream.headers.get("content-type") ?? "image/jpeg",
    "Cache-Control": size === "original" ? "private, max-age=3600" : "public, max-age=86400, stale-while-revalidate=604800",
  });
  const length = upstream.headers.get("content-length");
  if (length) headers.set("Content-Length", length);
  if (new URL(request.url).searchParams.get("download") === "1") {
    headers.set("Content-Disposition", `attachment; filename="${fileName(upstream, id)}"`);
  }
  return new Response(upstream.body, { headers });
}
