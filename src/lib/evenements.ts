import "server-only";
import { and, asc, count, desc, eq, gte, lt, sql } from "drizzle-orm";
import { db } from "./db";
import { evenements, membres, mouvementsEtoiles, participations, typesActions } from "./db/schema";
import { normaliserCodeParrainage } from "./adhesions";

// Événements CLANS gérés depuis l'admin : création, participants, présences.
// Une présence validée rapporte les étoiles du type d'action de l'événement.

export class ErreurEvenement extends Error {}

export type DonneesEvenement = {
  titre: string;
  description: string | null;
  conditions: string | null;
  typeActionId: number | null;
  date: Date;
  lieu: string | null;
  prix: number | null;
  places: number | null;
  obligatoire: boolean;
  penalite: number;
};

const colonnesListe = {
  id: evenements.id,
  titre: evenements.titre,
  date: evenements.date,
  lieu: evenements.lieu,
  prix: evenements.prix,
  places: evenements.places,
  obligatoire: evenements.obligatoire,
  typeAction: typesActions.nom,
  etoiles: typesActions.etoiles,
  inscrits: count(participations.id),
  presents: sql<number>`count(${participations.id}) filter (where ${participations.present})`.mapWith(Number),
};

/** Événements à venir (du plus proche au plus lointain) et passés (du plus récent au plus ancien). */
export async function listeEvenements() {
  const requete = () =>
    db
      .select(colonnesListe)
      .from(evenements)
      .leftJoin(typesActions, eq(typesActions.id, evenements.typeActionId))
      .leftJoin(participations, eq(participations.evenementId, evenements.id))
      .groupBy(evenements.id, typesActions.id);

  const [aVenir, passes] = await Promise.all([
    requete().where(gte(evenements.date, sql`now()`)).orderBy(asc(evenements.date)),
    requete().where(lt(evenements.date, sql`now()`)).orderBy(desc(evenements.date)).limit(50),
  ]);
  return { aVenir, passes };
}

export async function evenementDetail(id: number) {
  const [evenement] = await db
    .select({ evenement: evenements, typeAction: typesActions })
    .from(evenements)
    .leftJoin(typesActions, eq(typesActions.id, evenements.typeActionId))
    .where(eq(evenements.id, id))
    .limit(1);
  if (!evenement) return null;

  const participants = await db
    .select({
      participationId: participations.id,
      present: participations.present,
      membreId: membres.id,
      numero: membres.numero,
      prenom: membres.prenom,
      nom: membres.nom,
      telephone: membres.telephone,
    })
    .from(participations)
    .innerJoin(membres, eq(membres.id, participations.membreId))
    .where(eq(participations.evenementId, id))
    .orderBy(asc(membres.nom), asc(membres.prenom));

  return { ...evenement.evenement, typeAction: evenement.typeAction, participants };
}

export async function creerEvenement(donnees: DonneesEvenement): Promise<number> {
  const [cree] = await db.insert(evenements).values(donnees).returning({ id: evenements.id });
  return cree.id;
}

/** Le barème n'est appliqué qu'au moment de valider une présence : changer le type ne modifie pas les étoiles déjà données. */
export async function modifierEvenement(id: number, donnees: DonneesEvenement) {
  await db.update(evenements).set(donnees).where(eq(evenements.id, id));
}

/** Supprime l'événement, ses participations et les étoiles gagnées par présence. */
export async function supprimerEvenement(id: number) {
  await db.delete(evenements).where(eq(evenements.id, id));
}

/** « Bon plan » de l'espace membre : sorties à venir, avec l'inscription éventuelle de ce membre. */
export async function bonsPlans(membreId: string) {
  return db
    .select({
      id: evenements.id,
      titre: evenements.titre,
      description: evenements.description,
      conditions: evenements.conditions,
      date: evenements.date,
      lieu: evenements.lieu,
      prix: evenements.prix,
      places: evenements.places,
      obligatoire: evenements.obligatoire,
      penalite: evenements.penalite,
      typeAction: typesActions.nom,
      etoiles: sql<number>`case when ${typesActions.actif} then ${typesActions.etoiles} else 0 end`.mapWith(Number),
      inscrits: count(participations.id),
      inscrit: sql<boolean>`coalesce(bool_or(${participations.membreId} = ${membreId}), false)`.mapWith(Boolean),
    })
    .from(evenements)
    .leftJoin(typesActions, eq(typesActions.id, evenements.typeActionId))
    .leftJoin(participations, eq(participations.evenementId, evenements.id))
    .where(gte(evenements.date, sql`now()`))
    .groupBy(evenements.id, typesActions.id)
    .orderBy(asc(evenements.date));
}

/** Inscrit un membre (par son numéro, ex. CLANS-000012 ou 12) à l'événement. */
export async function ajouterParticipant(evenementId: number, saisie: string) {
  const numero = normaliserCodeParrainage(saisie);
  if (!numero) throw new ErreurEvenement("Indique le numéro du membre.");

  await db.transaction(async (tx) => {
    const [evenement] = await tx
      .select({ places: evenements.places })
      .from(evenements)
      .where(eq(evenements.id, evenementId))
      .for("update")
      .limit(1);
    if (!evenement) throw new ErreurEvenement("Événement introuvable.");

    const [membre] = await tx
      .select({ id: membres.id })
      .from(membres)
      .where(and(eq(membres.numero, numero), eq(membres.statut, "membre")))
      .limit(1);
    if (!membre) throw new ErreurEvenement(`Aucun membre avec le numéro ${numero}.`);

    if (evenement.places !== null) {
      const [{ total }] = await tx
        .select({ total: count() })
        .from(participations)
        .where(eq(participations.evenementId, evenementId));
      if (total >= evenement.places) throw new ErreurEvenement("L’événement est complet.");
    }

    const ajout = await tx
      .insert(participations)
      .values({ membreId: membre.id, evenementId })
      .onConflictDoNothing()
      .returning({ id: participations.id });
    if (ajout.length === 0) throw new ErreurEvenement(`${numero} est déjà inscrit à cet événement.`);
  });
}

/** Retire un participant ; s'il était présent, ses étoiles pour cet événement sont retirées aussi. */
export async function retirerParticipant(participationId: number) {
  await db.delete(participations).where(eq(participations.id, participationId));
}

/** Valide ou annule une présence, et ajoute ou retire les étoiles correspondantes. */
export async function marquerPresence(participationId: number, present: boolean) {
  await db.transaction(async (tx) => {
    const [ligne] = await tx
      .update(participations)
      .set({ present })
      .where(eq(participations.id, participationId))
      .returning({ membreId: participations.membreId, evenementId: participations.evenementId });
    if (!ligne) throw new ErreurEvenement("Participation introuvable.");

    if (!present) {
      await tx.delete(mouvementsEtoiles).where(eq(mouvementsEtoiles.participationId, participationId));
      return;
    }

    const [evenement] = await tx
      .select({ titre: evenements.titre, typeAction: typesActions })
      .from(evenements)
      .leftJoin(typesActions, eq(typesActions.id, evenements.typeActionId))
      .where(eq(evenements.id, ligne.evenementId))
      .limit(1);
    const action = evenement?.typeAction;
    if (!action || !action.actif || action.etoiles === 0) return;

    await tx
      .insert(mouvementsEtoiles)
      .values({
        membreId: ligne.membreId,
        libelle: `${action.nom} — ${evenement.titre}`,
        variation: action.etoiles,
        typeActionId: action.id,
        participationId,
      })
      .onConflictDoNothing();
  });
}
