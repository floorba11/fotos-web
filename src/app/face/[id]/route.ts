import { newestFace } from "@/lib/face";
import { getPerson, isUuid } from "@/lib/immich";
import { portraitImage } from "@/lib/portraits";

// Neutraler Platzhalter. Das "people thumbnail" von Immich nehmen wir nicht: es kann aus einem privaten Foto stammen.
const PLACEHOLDER = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 240 240"><rect width="240" height="240" fill="#ebe3e3"/><circle cx="120" cy="96" r="42" fill="#d3c4c4"/><path d="M40 240c0-48 36-80 80-80s80 32 80 80z" fill="#d3c4c4"/></svg>`;

/** Gesichts-Vorschau einer Person: Kaderporträt, sonst Gesicht aus ihrem neusten sichtbaren Foto, sonst Platzhalter */
export async function GET(_request: Request, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params;
  if (!isUuid(id)) return new Response("Nicht gefunden", { status: 404 });
  const person = await getPerson(id).catch(() => null);
  const portrait = person && (await portraitImage(person.name));
  if (portrait) {
    return new Response(new Uint8Array(portrait), { headers: { "Content-Type": "image/jpeg", "Cache-Control": "public, max-age=3600" } });
  }
  const face = person && (await newestFace(id).catch(() => null));
  if (face) {
    return new Response(new Uint8Array(face), {
      // kurz zwischenspeichern: mit dem nächsten Spiel gibt es ein neueres Foto
      headers: { "Content-Type": "image/jpeg", "Cache-Control": "public, max-age=3600" },
    });
  }
  if (!person) return new Response("Nicht gefunden", { status: 404 });
  return new Response(PLACEHOLDER, { headers: { "Content-Type": "image/svg+xml", "Cache-Control": "public, max-age=3600" } });
}
