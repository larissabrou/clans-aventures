import "server-only";
import { asc, count, eq, inArray, sql } from "drizzle-orm";
import { db } from "./db";
import { clans, membres } from "./db/schema";

/** Clans proposés à l'inscription (actifs uniquement). */
export async function clansProposes() {
  return db
    .select({ id: clans.id, nom: clans.nom, description: clans.description })
    .from(clans)
    .where(eq(clans.actif, true))
    .orderBy(asc(clans.ordre), asc(clans.nom));
}

/** Tous les clans, avec leur nombre de membres (admin). */
export async function listeClans() {
  return db
    .select({
      id: clans.id,
      nom: clans.nom,
      description: clans.description,
      actif: clans.actif,
      salutation: clans.salutation,
      lienWhatsapp: clans.lienWhatsapp,
      membres: count(membres.id),
    })
    .from(clans)
    .leftJoin(membres, eq(membres.clanId, clans.id))
    .groupBy(clans.id)
    .orderBy(asc(clans.ordre), asc(clans.nom));
}

export type DonneesClan = {
  nom: string;
  description: string | null;
  actif: boolean;
  // Variables {salutation} et {lien_whatsapp_clan} des messages de bienvenue.
  salutation: string | null;
  lienWhatsapp: string | null;
};

/** Un nouveau clan se place en fin de liste. */
export async function creerClan(donnees: DonneesClan) {
  await db.insert(clans).values({
    ...donnees,
    ordre: sql`(select coalesce(max(${clans.ordre}), 0) + 1 from ${clans})`,
  });
}

/** Nouvel ordre d'affichage : `ids` du premier au dernier clan. */
export async function ordonnerClans(ids: number[]) {
  await db.transaction(async (tx) => {
    const existants = await tx.select({ id: clans.id }).from(clans).where(inArray(clans.id, ids));
    // La liste doit contenir chaque clan une seule fois (pas d'identifiant inconnu ou en double).
    if (existants.length !== ids.length || new Set(ids).size !== ids.length) {
      throw new Error("Liste de clans invalide.");
    }
    for (const [rang, id] of ids.entries()) {
      await tx.update(clans).set({ ordre: rang + 1 }).where(eq(clans.id, id));
    }
  });
}

export async function modifierClan(id: number, donnees: DonneesClan) {
  await db.update(clans).set(donnees).where(eq(clans.id, id));
}

/** Les membres de ce clan repassent à « À définir ». */
export async function supprimerClan(id: number) {
  await db.delete(clans).where(eq(clans.id, id));
}
