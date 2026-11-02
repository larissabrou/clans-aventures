import "server-only";
import { and, asc, eq, inArray, sql } from "drizzle-orm";
import { db } from "./db";
import { membres, universCulturels } from "./db/schema";

// Univers culturels proposés à l'inscription (« Univers que tu souhaites découvrir »).
// Le membre garde le nom de l'univers choisi : un univers supprimé ne vide pas les fiches.

/** Univers proposés à l'inscription (actifs, dans l'ordre choisi). */
export async function universProposes() {
  return db
    .select({ id: universCulturels.id, nom: universCulturels.nom })
    .from(universCulturels)
    .where(eq(universCulturels.actif, true))
    .orderBy(asc(universCulturels.ordre), asc(universCulturels.nom));
}

/** Tous les univers, avec le nombre de membres qui l'ont choisi (admin). */
export async function listeUnivers() {
  return db
    .select({
      id: universCulturels.id,
      nom: universCulturels.nom,
      actif: universCulturels.actif,
      membres: sql<number>`(select count(*) from ${membres} where ${membres.universADecouvrir} = ${universCulturels.nom} and ${membres.statut} = 'membre')`.mapWith(Number),
    })
    .from(universCulturels)
    .orderBy(asc(universCulturels.ordre), asc(universCulturels.nom));
}

/** Nom de l'univers choisi à l'inscription, s'il est toujours proposé. */
export async function nomUniversPropose(id: number): Promise<string | null> {
  const [univers] = await db
    .select({ nom: universCulturels.nom })
    .from(universCulturels)
    .where(and(eq(universCulturels.id, id), eq(universCulturels.actif, true)))
    .limit(1);
  return univers?.nom ?? null;
}

export type DonneesUnivers = { nom: string; actif: boolean };

/** Un nouvel univers se place en fin de liste. */
export async function creerUnivers(donnees: DonneesUnivers) {
  await db.insert(universCulturels).values({
    ...donnees,
    ordre: sql`(select coalesce(max(${universCulturels.ordre}), 0) + 1 from ${universCulturels})`,
  });
}

/** Renommer un univers renomme aussi le choix des membres qui l'avaient sélectionné. */
export async function modifierUnivers(id: number, donnees: DonneesUnivers) {
  await db.transaction(async (tx) => {
    const [avant] = await tx.select({ nom: universCulturels.nom }).from(universCulturels).where(eq(universCulturels.id, id)).limit(1);
    if (!avant) return;
    await tx.update(universCulturels).set(donnees).where(eq(universCulturels.id, id));
    if (avant.nom !== donnees.nom) {
      await tx.update(membres).set({ universADecouvrir: donnees.nom }).where(eq(membres.universADecouvrir, avant.nom));
    }
  });
}

export async function supprimerUnivers(id: number) {
  await db.delete(universCulturels).where(eq(universCulturels.id, id));
}

/** Nouvel ordre d'affichage : `ids` du premier au dernier univers. */
export async function ordonnerUnivers(ids: number[]) {
  await db.transaction(async (tx) => {
    const existants = await tx.select({ id: universCulturels.id }).from(universCulturels).where(inArray(universCulturels.id, ids));
    if (existants.length !== ids.length || new Set(ids).size !== ids.length) {
      throw new Error("Liste d'univers invalide.");
    }
    for (const [rang, id] of ids.entries()) {
      await tx.update(universCulturels).set({ ordre: rang + 1 }).where(eq(universCulturels.id, id));
    }
  });
}
