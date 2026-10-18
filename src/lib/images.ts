import "server-only";
import { eq, sql } from "drizzle-orm";
import { db } from "./db";
import { imagesEvenements } from "./db/schema";

// Images des événements : envoyées depuis l'admin, stockées en base, servies par
// /api/evenements/[id]/image (voir la route).

export const TAILLE_MAX_IMAGE = 4 * 1024 * 1024;

export class ErreurImage extends Error {}

/**
 * Le type est déduit des premiers octets du fichier, pas du nom ni du type annoncé par le navigateur :
 * seuls JPEG, PNG et WebP sont acceptés (pas de SVG, qui peut contenir du script).
 */
function typeReel(octets: Buffer): string | null {
  if (octets.length >= 3 && octets[0] === 0xff && octets[1] === 0xd8 && octets[2] === 0xff) return "image/jpeg";
  if (octets.length >= 8 && octets.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]))) {
    return "image/png";
  }
  if (octets.length >= 12 && octets.toString("ascii", 0, 4) === "RIFF" && octets.toString("ascii", 8, 12) === "WEBP") {
    return "image/webp";
  }
  return null;
}

/** Fichier du formulaire → image validée, ou null si aucun fichier n'a été choisi. */
export async function lireImageEnvoyee(fichier: FormDataEntryValue | null) {
  if (!(fichier instanceof File) || fichier.size === 0) return null;
  if (fichier.size > TAILLE_MAX_IMAGE) throw new ErreurImage("L’image dépasse 4 Mo : choisis une image plus légère.");
  const donnees = Buffer.from(await fichier.arrayBuffer());
  const type = typeReel(donnees);
  if (!type) throw new ErreurImage("Format d’image non pris en charge : utilise une image JPEG, PNG ou WebP.");
  return { type, donnees, taille: donnees.length };
}

export async function enregistrerImageEvenement(
  evenementId: number,
  image: { type: string; donnees: Buffer; taille: number },
) {
  await db
    .insert(imagesEvenements)
    .values({ evenementId, ...image })
    .onConflictDoUpdate({
      target: imagesEvenements.evenementId,
      set: { ...image, modifieLe: sql`now()` },
    });
}

export async function supprimerImageEvenement(evenementId: number) {
  await db.delete(imagesEvenements).where(eq(imagesEvenements.evenementId, evenementId));
}

export async function imageEvenement(evenementId: number) {
  const [image] = await db
    .select({ type: imagesEvenements.type, donnees: imagesEvenements.donnees })
    .from(imagesEvenements)
    .where(eq(imagesEvenements.evenementId, evenementId))
    .limit(1);
  return image ?? null;
}

/** URL de l'image ; la date de modification change l'adresse quand l'image est remplacée. */
export function urlImageEvenement(evenementId: number, modifieLe: Date | null): string | null {
  return modifieLe ? `/api/evenements/${evenementId}/image?v=${modifieLe.getTime()}` : null;
}
