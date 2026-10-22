import { parseAlbumName } from "@/lib/format";
import { createLimiter, guardStream } from "@/lib/limit";
import { getAlbum, getAlbumPhotos, getPerson, getPersonPhotos, immich, isUuid } from "@/lib/immich";

export const dynamic = "force-dynamic";

// Ein ZIP-Download belastet den kleinen Server; mehr als ein paar gleichzeitige lehnen wir höflich ab.
const limiter = createLimiter(3);

const slug = (s: string) => s.replace(/[^\w\-]+/g, "_").replace(/^_+|_+$/g, "") || "fotos";

export async function GET(_request: Request, ctx: { params: Promise<{ kind: string; id: string }> }) {
  const { kind, id } = await ctx.params;
  if (!isUuid(id) || (kind !== "album" && kind !== "spieler")) return new Response("Nicht gefunden", { status: 404 });

  let title: string;
  let photos;
  if (kind === "album") {
    const album = await getAlbum(id);
    if (!album) return new Response("Nicht gefunden", { status: 404 });
    title = parseAlbumName(album.name).title;
    photos = await getAlbumPhotos(id);
  } else {
    const person = await getPerson(id);
    if (!person) return new Response("Nicht gefunden", { status: 404 });
    title = person.name;
    photos = await getPersonPhotos(id);
  }
  if (!photos.length) return new Response("Keine Fotos", { status: 404 });

  const release = limiter.acquire();
  if (!release) {
    return new Response("Gerade laden viele Leute herunter, bitte in einer Minute noch einmal versuchen.", {
      status: 503,
      headers: { "Retry-After": "60" },
    });
  }

  try {
    // Eine einzige Archivdatei verlangen (Grenze 100 GB)
    const info = await immich("/download/info", {
      method: "POST",
      body: JSON.stringify({ assetIds: photos.map((p) => p.id), archiveSize: 100 * 1024 ** 3 }),
    });
    if (!info.ok) throw new Error(`download/info ${info.status}`);
    const archive = ((await info.json()) as { archives: { assetIds: string[] }[] }).archives[0];
    const upstream = await immich("/download/archive", {
      method: "POST",
      body: JSON.stringify({ assetIds: archive.assetIds }),
      headers: { Accept: "*/*" },
    });
    if (!upstream.ok || !upstream.body) throw new Error(`download/archive ${upstream.status}`);

    return new Response(guardStream(upstream.body, release), {
      headers: {
        "Content-Type": "application/zip",
        "Content-Disposition": `attachment; filename="${slug(title)}.zip"`,
        "Cache-Control": "no-store",
      },
    });
  } catch {
    release();
    return new Response("Download nicht möglich", { status: 502 });
  }
}
