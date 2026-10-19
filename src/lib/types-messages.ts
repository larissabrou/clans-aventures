import "server-only";
import { and, asc, eq, sql } from "drizzle-orm";
import { db } from "./db";
import { envois, messages, typesMessages } from "./db/schema";

// Types de messages gérés depuis l'admin. Les types « systeme » (info, event, warning, star)
// servent aux messages automatiques du site : modifiables, mais pas supprimables.

export async function listeTypesMessages() {
  return db
    .select({
      cle: typesMessages.cle,
      nom: typesMessages.nom,
      couleur: typesMessages.couleur,
      icone: typesMessages.icone,
      systeme: typesMessages.systeme,
      actif: typesMessages.actif,
      messages: sql<number>`(select count(*) from ${messages} where ${messages.type} = ${typesMessages.cle})`.mapWith(Number),
      envois: sql<number>`(select count(*) from ${envois} where ${envois.type} = ${typesMessages.cle})`.mapWith(Number),
    })
    .from(typesMessages)
    .orderBy(asc(typesMessages.creeLe), asc(typesMessages.nom));
}

/** Types proposés dans le formulaire d'envoi. */
export async function typesMessagesActifs() {
  return db
    .select()
    .from(typesMessages)
    .where(eq(typesMessages.actif, true))
    .orderBy(asc(typesMessages.creeLe), asc(typesMessages.nom));
}

export async function typeMessage(cle: string) {
  const [type] = await db.select().from(typesMessages).where(eq(typesMessages.cle, cle)).limit(1);
  return type ?? null;
}

export async function typeMessageActif(cle: string): Promise<boolean> {
  const [type] = await db
    .select({ cle: typesMessages.cle })
    .from(typesMessages)
    .where(and(eq(typesMessages.cle, cle), eq(typesMessages.actif, true)))
    .limit(1);
  return Boolean(type);
}

export type DonneesTypeMessage = { nom: string; couleur: string; icone: string; actif: boolean };

/** « Bon plan du mois » → bon-plan-du-mois (suffixe -2, -3… si la clé existe déjà). */
async function cleLibre(nom: string): Promise<string> {
  const base =
    nom
      .normalize("NFD")
      .replace(/[̀-ͯ]/g, "")
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-|-$/g, "")
      .slice(0, 40) || "type";
  for (let n = 1; ; n++) {
    const cle = n === 1 ? base : `${base}-${n}`;
    // « nouveau » est l'adresse de la page de création (/admin/types-messages/nouveau).
    if (cle !== "nouveau" && !(await typeMessage(cle))) return cle;
  }
}

export async function creerTypeMessage(donnees: DonneesTypeMessage) {
  await db.insert(typesMessages).values({ cle: await cleLibre(donnees.nom), ...donnees });
}

export async function modifierTypeMessage(cle: string, donnees: DonneesTypeMessage) {
  await db.update(typesMessages).set(donnees).where(eq(typesMessages.cle, cle));
}

/** Les messages de ce type repassent en « Information » (clé étrangère ON DELETE SET DEFAULT). */
export async function supprimerTypeMessage(cle: string) {
  await db.delete(typesMessages).where(and(eq(typesMessages.cle, cle), eq(typesMessages.systeme, false)));
}
