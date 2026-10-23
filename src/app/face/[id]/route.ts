import { newestFace } from "@/lib/face";
import { getPerson, isUuid } from "@/lib/immich";
import { portraitFor } from "@/lib/portraits";

// Neutraler Platzhalter. Das "people thumbnail" von Immich nehmen wir nicht: es kann aus einem privaten Foto stammen.
const PLACEHOLDER = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 240 240"><rect width="240" height="240" fill="#e4e5e7"/><circle cx="120" cy="96" r="42" fill="#c9cbcf"/><path d="M40 240c0-48 36-80 80-80s80 32 80 80z" fill="#c9cbcf"/></svg>`;

/** Gesichts-Vorschau einer Person: Kaderporträt, sonst Gesicht aus ihrem neusten sichtbaren Foto, sonst Platzhalter */
export async function GET(_request: Request, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params;
  if (!isUuid(id)) return new Response("Nicht gefunden", { status: 404 });
  const person = await getPerson(id).catch(() => null);
  const portrait = person && portraitFor(person.name);
  if (portrait) {
    // relativer Pfad: hinter dem Reverse-Proxy kennt der Server die öffentliche Adresse nicht
    return new Response(null, { status: 302, headers: { Location: portrait, "Cache-Control": "public, max-age=3600" } });
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
