import "server-only";
import { and, asc, eq, inArray, isNull, or, sql } from "drizzle-orm";
import { db } from "./db";
import { clans, groupesWhatsapp, messagesBienvenue, typesMessages, type Membre } from "./db/schema";
import { remplirVariables, type ValeursMessage } from "./variables-messages";

// Messages reçus par chaque nouveau membre à la confirmation de son adhésion, réglés dans l'admin.

type Executeur = Pick<typeof db, "select">;

const SANS_LIEN = "Le lien de ton groupe te sera envoyé très bientôt par l’équipe CLANS.";

/** Valeurs des variables pour ce membre (clan, salutation, liens WhatsApp…). */
export async function valeursPourMembre(executeur: Executeur, membre: Membre): Promise<ValeursMessage> {
  const [clan] = membre.clanId
    ? await executeur
        .select({ nom: clans.nom, salutation: clans.salutation, lien: clans.lienWhatsapp })
        .from(clans)
        .where(eq(clans.id, membre.clanId))
        .limit(1)
    : [];

  const groupes = await executeur
    .select({ nom: groupesWhatsapp.nom, lien: groupesWhatsapp.lien })
    .from(groupesWhatsapp)
    .where(
      and(
        eq(groupesWhatsapp.actif, true),
        or(isNull(groupesWhatsapp.univers), inArray(groupesWhatsapp.univers, membre.interets)),
      ),
    );

  return {
    prenom: membre.prenom,
    nom: membre.nom,
    numero: membre.numero ?? "",
    clan: clan?.nom ?? "À définir",
    salutation: clan?.salutation?.trim() || "Bienvenue",
    lien_whatsapp_clan: clan?.lien?.trim() || SANS_LIEN,
    groupes_whatsapp: groupes.length ? groupes.map((g) => `• ${g.nom} : ${g.lien}`).join("\n") : SANS_LIEN,
    ville: membre.ville ?? "",
  };
}

/** Messages actifs, dans l'ordre, avec les variables remplacées pour ce membre. */
export async function messagesBienvenuePour(executeur: Executeur, membre: Membre) {
  const [modeles, valeurs] = await Promise.all([
    executeur
      .select({ titre: messagesBienvenue.titre, contenu: messagesBienvenue.contenu, type: messagesBienvenue.type })
      .from(messagesBienvenue)
      .where(eq(messagesBienvenue.actif, true))
      .orderBy(asc(messagesBienvenue.ordre), asc(messagesBienvenue.id)),
    valeursPourMembre(executeur, membre),
  ]);
  return modeles.map((m) => ({
    titre: remplirVariables(m.titre, valeurs),
    contenu: remplirVariables(m.contenu, valeurs),
    type: m.type,
  }));
}

// ---------- Administration ----------

export async function listeMessagesBienvenue() {
  return db
    .select({ message: messagesBienvenue, typeNom: typesMessages.nom, couleur: typesMessages.couleur, icone: typesMessages.icone })
    .from(messagesBienvenue)
    .leftJoin(typesMessages, eq(typesMessages.cle, messagesBienvenue.type))
    .orderBy(asc(messagesBienvenue.ordre), asc(messagesBienvenue.id));
}

export async function messageBienvenue(id: number) {
  const [message] = await db.select().from(messagesBienvenue).where(eq(messagesBienvenue.id, id)).limit(1);
  return message ?? null;
}

export type DonneesMessageBienvenue = { titre: string; contenu: string; type: string; actif: boolean };

/** Un nouveau message se place en dernier. */
export async function creerMessageBienvenue(donnees: DonneesMessageBienvenue) {
  await db.insert(messagesBienvenue).values({
    ...donnees,
    ordre: sql`(select coalesce(max(${messagesBienvenue.ordre}), 0) + 1 from ${messagesBienvenue})`,
  });
}

export async function modifierMessageBienvenue(id: number, donnees: DonneesMessageBienvenue) {
  await db.update(messagesBienvenue).set(donnees).where(eq(messagesBienvenue.id, id));
}

export async function supprimerMessageBienvenue(id: number) {
  await db.delete(messagesBienvenue).where(eq(messagesBienvenue.id, id));
}

/** Nouvel ordre d'envoi : `ids` du premier au dernier message. */
export async function ordonnerMessagesBienvenue(ids: number[]) {
  await db.transaction(async (tx) => {
    const existants = await tx.select({ id: messagesBienvenue.id }).from(messagesBienvenue).where(inArray(messagesBienvenue.id, ids));
    if (existants.length !== ids.length || new Set(ids).size !== ids.length) {
      throw new Error("Liste de messages invalide.");
    }
    for (const [rang, id] of ids.entries()) {
      await tx.update(messagesBienvenue).set({ ordre: rang + 1 }).where(eq(messagesBienvenue.id, id));
    }
  });
}
