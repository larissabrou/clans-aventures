import "server-only";
import { and, asc, eq } from "drizzle-orm";
import { db } from "./db";
import { modelesMessages, typesMessages } from "./db/schema";

// Modèles de messages choisis par l'admin lors d'une attribution d'étoiles (voir gestion-membres.ts).

export async function listeModelesMessages() {
  return db
    .select({ modele: modelesMessages, typeNom: typesMessages.nom, couleur: typesMessages.couleur, icone: typesMessages.icone })
    .from(modelesMessages)
    .leftJoin(typesMessages, eq(typesMessages.cle, modelesMessages.type))
    .orderBy(asc(modelesMessages.creeLe), asc(modelesMessages.id));
}

/** Modèles proposés dans « Attribuer une action ». */
export async function modelesMessagesActifs() {
  return db
    .select({ id: modelesMessages.id, titre: modelesMessages.titre, contenu: modelesMessages.contenu })
    .from(modelesMessages)
    .where(eq(modelesMessages.actif, true))
    .orderBy(asc(modelesMessages.creeLe), asc(modelesMessages.id));
}

export async function modeleMessage(id: number, actifSeulement = false) {
  const [modele] = await db
    .select()
    .from(modelesMessages)
    .where(actifSeulement ? and(eq(modelesMessages.id, id), eq(modelesMessages.actif, true)) : eq(modelesMessages.id, id))
    .limit(1);
  return modele ?? null;
}

export type DonneesModeleMessage = { titre: string; contenu: string; type: string; actif: boolean };

export async function creerModeleMessage(donnees: DonneesModeleMessage) {
  await db.insert(modelesMessages).values(donnees);
}

export async function modifierModeleMessage(id: number, donnees: DonneesModeleMessage) {
  await db.update(modelesMessages).set(donnees).where(eq(modelesMessages.id, id));
}

export async function supprimerModeleMessage(id: number) {
  await db.delete(modelesMessages).where(eq(modelesMessages.id, id));
}
