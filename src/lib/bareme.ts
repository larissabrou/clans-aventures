import "server-only";
import { and, asc, eq, isNull, sql } from "drizzle-orm";
import { db } from "./db";
import { evenements, mouvementsEtoiles, typesActions } from "./db/schema";

// Barème des étoiles : chaque type d'action (camping, excursion…) rapporte un nombre d'étoiles.

export async function listeTypesActions() {
  return db.select().from(typesActions).orderBy(asc(typesActions.id));
}

/** Types d'actions avec leur utilisation : événements rattachés et attributions d'étoiles. */
export async function typesActionsAvecUsage() {
  return db
    .select({
      id: typesActions.id,
      nom: typesActions.nom,
      etoiles: typesActions.etoiles,
      code: typesActions.code,
      actif: typesActions.actif,
      evenements: sql<number>`(select count(*) from ${evenements} where ${evenements.typeActionId} = ${typesActions.id})`.mapWith(Number),
      attributions: sql<number>`(select count(*) from ${mouvementsEtoiles} where ${mouvementsEtoiles.typeActionId} = ${typesActions.id})`.mapWith(Number),
    })
    .from(typesActions)
    .orderBy(asc(typesActions.id));
}

export async function typeAction(id: number) {
  const [type] = await db.select().from(typesActions).where(eq(typesActions.id, id)).limit(1);
  return type ?? null;
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
