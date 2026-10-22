// Gesichtsbild aus dem neusten Foto einer Person, für alle ohne Kaderporträt.
// Ausschnitt wie bei den Kaderporträts: quadratisch, Kopf mit etwas Schultern, 240×240.

import sharp from "sharp";
import { type FaceBox, cached, getFaceBox, getPersonPhotos, immich } from "./immich";

export const FACE_SIZE = 240;
const TTL = 10 * 60 * 1000;
/** So viele der neusten Fotos werden nach einem erkannten Gesicht durchsucht */
const TRIES = 5;

export type Crop = { left: number; top: number; width: number; height: number };

/**
 * Quadratischer Ausschnitt um ein Gesicht in einem Bild der Grösse width × height.
 * Der Rahmen von Immich bezieht sich auf imageWidth × imageHeight und wird umgerechnet.
 * Seitenlänge etwa 2,6 × Gesicht, leicht nach unten versetzt; am Bildrand wird verschoben, notfalls verkleinert.
 */
export function faceCrop(face: FaceBox, width: number, height: number): Crop {
  const sx = width / face.imageWidth;
  const sy = height / face.imageHeight;
  const fw = (face.x2 - face.x1) * sx;
  const fh = (face.y2 - face.y1) * sy;
  const cx = ((face.x1 + face.x2) / 2) * sx;
  const cy = ((face.y1 + face.y2) / 2) * sy + fh * 0.2;
  const side = Math.max(1, Math.round(Math.min(Math.max(fw, fh) * 2.6, width, height)));
  const clamp = (v: number, max: number) => Math.round(Math.min(Math.max(v, 0), max));
  return { left: clamp(cx - side / 2, width - side), top: clamp(cy - side / 2, height - side), width: side, height: side };
}

async function render(assetId: string, face: FaceBox): Promise<Buffer | null> {
  const res = await immich(`/assets/${assetId}/thumbnail?size=preview`, { headers: { Accept: "*/*" } });
  if (!res.ok) return null;
  const image = sharp(Buffer.from(await res.arrayBuffer())).rotate();
  const { data, info } = await image.toBuffer({ resolveWithObject: true });
  return sharp(data)
    .extract(faceCrop(face, info.width, info.height))
    .resize(FACE_SIZE, FACE_SIZE)
    .jpeg({ quality: 82 })
    .toBuffer();
}

/** JPEG mit dem Gesicht aus dem neusten Foto der Person, null wenn keines gefunden */
export function newestFace(personId: string): Promise<Buffer | null> {
  return cached(`face:${personId}`, TTL, async () => {
    for (const photo of (await getPersonPhotos(personId)).slice(0, TRIES)) {
      const face = await getFaceBox(photo.id, personId);
      if (!face) continue;
      const jpeg = await render(photo.id, face);
      if (jpeg) return jpeg;
    }
    return null;
  });
}
