import { getAlbum, isUuid } from "@/lib/immich";
import { count } from "@/lib/stats";

export const dynamic = "force-dynamic";

// Der Browser meldet hier einen Albumaufruf (siehe ViewBeacon). So zählen Vorabladen von Links und
// Bots ohne JavaScript nicht mit. Gespeichert wird nur die Zahl pro Album.
export async function POST(request: Request) {
  const id = (await request.text().catch(() => "")).trim();
  if (!isUuid(id)) return new Response(null, { status: 400 });
  const album = await getAlbum(id).catch(() => null);
  if (!album) return new Response(null, { status: 404 });
  count(id, "views", request);
  return new Response(null, { status: 204 });
}
