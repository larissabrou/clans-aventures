import "server-only";
import { and, asc, eq, isNull } from "drizzle-orm";
import { db } from "./db";
import { typesActions } from "./db/schema";

// Barème des étoiles : chaque type d'action (camping, excursion…) rapporte un nombre d'étoiles.

export async function listeTypesActions() {
  return db.select().from(typesActions).orderBy(asc(typesActions.id));
}

export type DonneesTypeAction = { nom: string; etoiles: number; actif: boolean };

export async function creerTypeAction(donnees: DonneesTypeAction) {
  await db.insert(typesActions).values(donnees);
}

export async function modifierTypeAction(id: number, donnees: DonneesTypeAction) {
  await db.update(typesActions).set(donnees).where(eq(typesActions.id, id));
}

/**
 * Les actions gérées par le site (code « parrainage ») ne se suppriment pas : on peut les désactiver.
 * Les étoiles déjà gagnées restent acquises.
 */
export async function supprimerTypeAction(id: number) {
  await db.delete(typesActions).where(and(eq(typesActions.id, id), isNull(typesActions.code)));
}
