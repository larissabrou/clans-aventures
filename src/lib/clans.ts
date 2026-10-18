import "server-only";
import { asc, count, eq } from "drizzle-orm";
import { db } from "./db";
import { clans, membres } from "./db/schema";

/** Clans proposés à l'inscription (actifs uniquement). */
export async function clansProposes() {
  return db
    .select({ id: clans.id, nom: clans.nom, description: clans.description })
    .from(clans)
    .where(eq(clans.actif, true))
    .orderBy(asc(clans.nom));
}

/** Tous les clans, avec leur nombre de membres (admin). */
export async function listeClans() {
  return db
    .select({
      id: clans.id,
      nom: clans.nom,
      description: clans.description,
      actif: clans.actif,
      membres: count(membres.id),
    })
    .from(clans)
    .leftJoin(membres, eq(membres.clanId, clans.id))
    .groupBy(clans.id)
    .orderBy(asc(clans.nom));
}

export type DonneesClan = { nom: string; description: string | null; actif: boolean };

export async function creerClan(donnees: DonneesClan) {
  await db.insert(clans).values(donnees);
}

export async function modifierClan(id: number, donnees: DonneesClan) {
  await db.update(clans).set(donnees).where(eq(clans.id, id));
}

/** Les membres de ce clan repassent à « À définir ». */
export async function supprimerClan(id: number) {
  await db.delete(clans).where(eq(clans.id, id));
}
