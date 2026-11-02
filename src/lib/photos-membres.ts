import "server-only";
import { eq, sql } from "drizzle-orm";
import { db } from "./db";
import { photosMembres } from "./db/schema";

// Photo de profil des membres. Elle n'est pas publique : le membre la voit par /espace-membre/photo
// (cookie de session membre), l'administration par /admin/membres/[id]/photo (cookie admin).
// Envoi : mêmes contrôles que les images d'événements (voir lireImageEnvoyee dans images.ts).

export async function enregistrerPhoto(membreId: string, image: { type: string; donnees: Buffer; taille: number }) {
  await db
    .insert(photosMembres)
    .values({ membreId, ...image })
    .onConflictDoUpdate({ target: photosMembres.membreId, set: { ...image, modifieLe: sql`now()` } });
}

export async function supprimerPhoto(membreId: string) {
  await db.delete(photosMembres).where(eq(photosMembres.membreId, membreId));
}

export async function photoMembre(membreId: string) {
  const [photo] = await db
    .select({ type: photosMembres.type, donnees: photosMembres.donnees })
    .from(photosMembres)
    .where(eq(photosMembres.membreId, membreId))
    .limit(1);
  return photo ?? null;
}

/** Date de la photo (null sans photo) ; sert de version dans son URL. */
export async function datePhoto(membreId: string): Promise<Date | null> {
  const [photo] = await db
    .select({ modifieLe: photosMembres.modifieLe })
    .from(photosMembres)
    .where(eq(photosMembres.membreId, membreId))
    .limit(1);
  return photo?.modifieLe ?? null;
}

/** URL de sa propre photo, pour l'espace membre. */
export const urlMaPhoto = (modifieLe: Date | null) => (modifieLe ? `/espace-membre/photo?v=${modifieLe.getTime()}` : null);

/** URL de la photo d'un membre, pour l'administration. */
export const urlPhotoAdmin = (membreId: string, modifieLe: Date | null) =>
  modifieLe ? `/admin/membres/${membreId}/photo?v=${modifieLe.getTime()}` : null;

/** Réponse HTTP commune aux deux routes : privée (jamais en cache partagé), version dans l'URL. */
export function reponsePhoto(photo: { type: string; donnees: Buffer } | null) {
  if (!photo) return new Response(null, { status: 404 });
  return new Response(new Uint8Array(photo.donnees), {
    headers: {
      "Content-Type": photo.type,
      "Content-Length": String(photo.donnees.length),
      "Cache-Control": "private, max-age=31536000, immutable",
      "X-Content-Type-Options": "nosniff",
    },
  });
}
