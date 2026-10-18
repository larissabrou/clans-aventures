import "server-only";
import { and, count, desc, eq, gte, ilike, isNull, or, sql, sum } from "drizzle-orm";
import { db } from "./db";
import {
  clans,
  evenements,
  membres,
  messages,
  mouvementsEtoiles,
  participations,
  typesActions,
} from "./db/schema";

// Gestion des membres depuis l'admin : recherche, clan, étoiles.

export class ErreurGestion extends Error {}

const soldeEtoiles = sql<number>`coalesce((select sum(${mouvementsEtoiles.variation}) from ${mouvementsEtoiles} where ${mouvementsEtoiles.membreId} = ${membres.id}), 0)`.mapWith(Number);

/** Membres (adhésion payée ou en attente), filtrés par nom, email, téléphone ou numéro. */
export async function listeMembres(recherche: string, statut: "membre" | "en_attente") {
  const motif = `%${recherche.trim().replace(/[%_\\]/g, "\\$&")}%`;
  return db
    .select({
      id: membres.id,
      numero: membres.numero,
      prenom: membres.prenom,
      nom: membres.nom,
      email: membres.email,
      telephone: membres.telephone,
      clan: clans.nom,
      etoiles: soldeEtoiles,
      adhereLe: membres.adhereLe,
      creeLe: membres.creeLe,
    })
    .from(membres)
    .leftJoin(clans, eq(clans.id, membres.clanId))
    .where(
      and(
        eq(membres.statut, statut),
        recherche.trim()
          ? or(
              ilike(membres.prenom, motif),
              ilike(membres.nom, motif),
              ilike(membres.email, motif),
              ilike(membres.telephone, motif),
              ilike(membres.numero, motif),
            )
          : undefined,
      ),
    )
    .orderBy(desc(membres.adhereLe), desc(membres.creeLe))
    .limit(200);
}

export async function membreAdmin(id: string) {
  const [ligne] = await db
    .select({ membre: membres, clan: clans.nom, etoiles: soldeEtoiles })
    .from(membres)
    .leftJoin(clans, eq(clans.id, membres.clanId))
    .where(eq(membres.id, id))
    .limit(1);
  if (!ligne) return null;

  const parrain = ligne.membre.parrainId
    ? (
        await db
          .select({ numero: membres.numero, prenom: membres.prenom, nom: membres.nom })
          .from(membres)
          .where(eq(membres.id, ligne.membre.parrainId))
          .limit(1)
      )[0]
    : undefined;

  const [historique, presences, [filleuls]] = await Promise.all([
    db
      .select()
      .from(mouvementsEtoiles)
      .where(eq(mouvementsEtoiles.membreId, id))
      .orderBy(desc(mouvementsEtoiles.creeLe), desc(mouvementsEtoiles.id)),
    db
      .select({ id: evenements.id, titre: evenements.titre, date: evenements.date, present: participations.present })
      .from(participations)
      .innerJoin(evenements, eq(evenements.id, participations.evenementId))
      .where(eq(participations.membreId, id))
      .orderBy(desc(evenements.date)),
    db.select({ total: count() }).from(membres).where(eq(membres.parrainId, id)),
  ]);

  return { ...ligne, parrain: parrain ?? null, historique, presences, filleuls: filleuls?.total ?? 0 };
}

export async function changerClan(membreId: string, clanId: number | null) {
  await db
    .update(membres)
    .set({ clanId, modifieLe: sql`now()` })
    .where(eq(membres.id, membreId));
}

/** Attribue une action du barème : le membre gagne les étoiles prévues et reçoit un message. */
export async function attribuerAction(membreId: string, typeActionId: number, precision: string | null) {
  const [action] = await db.select().from(typesActions).where(eq(typesActions.id, typeActionId)).limit(1);
  if (!action) throw new ErreurGestion("Type d’action introuvable.");
  if (action.etoiles === 0) {
    throw new ErreurGestion(`« ${action.nom} » vaut 0 étoile : règle d’abord son barème.`);
  }
  const libelle = precision ? `${action.nom} — ${precision}` : action.nom;
  await crediter(membreId, libelle, action.etoiles, action.id);
}

/** Ajout ou retrait manuel d'étoiles (correction, pénalité…). */
export async function ajusterEtoiles(membreId: string, variation: number, libelle: string) {
  await crediter(membreId, libelle, variation, null);
}

async function crediter(membreId: string, libelle: string, variation: number, typeActionId: number | null) {
  const pluriel = Math.abs(variation) > 1 ? "s" : "";
  await db.transaction(async (tx) => {
    await tx.insert(mouvementsEtoiles).values({ membreId, libelle, variation, typeActionId });
    await tx.insert(messages).values({
      membreId,
      titre: variation > 0 ? `+${variation} étoile${pluriel} CLANS` : `${variation} étoile${pluriel} CLANS`,
      contenu:
        variation > 0
          ? `Bravo ! Tu gagnes ${variation} étoile${pluriel} : ${libelle}.`
          : `${Math.abs(variation)} étoile${pluriel} retirée${pluriel} de ton solde : ${libelle}.`,
      type: variation > 0 ? "star" : "warning",
    });
  });
}

/** Annule un mouvement ajouté à la main (ceux des présences et du parrainage se gèrent à leur source). */
export async function supprimerMouvement(id: number) {
  const supprime = await db
    .delete(mouvementsEtoiles)
    .where(
      and(
        eq(mouvementsEtoiles.id, id),
        isNull(mouvementsEtoiles.participationId),
        isNull(mouvementsEtoiles.filleulId),
      ),
    )
    .returning({ id: mouvementsEtoiles.id });
  if (supprime.length === 0) {
    throw new ErreurGestion("Ce mouvement vient d’une présence ou d’un parrainage : modifie-le à sa source.");
  }
}

/** Chiffres du tableau de bord de l'admin. */
export async function statistiquesAdmin() {
  const [[actifs], [attente], [aVenir], [etoiles], [sansClan]] = await Promise.all([
    db.select({ total: count() }).from(membres).where(eq(membres.statut, "membre")),
    db.select({ total: count() }).from(membres).where(eq(membres.statut, "en_attente")),
    db.select({ total: count() }).from(evenements).where(gte(evenements.date, sql`now()`)),
    db
      .select({ total: sum(mouvementsEtoiles.variation).mapWith(Number) })
      .from(mouvementsEtoiles),
    db
      .select({ total: count() })
      .from(membres)
      .where(and(eq(membres.statut, "membre"), isNull(membres.clanId))),
  ]);
  return {
    membres: actifs?.total ?? 0,
    enAttente: attente?.total ?? 0,
    evenementsAVenir: aVenir?.total ?? 0,
    etoilesDistribuees: etoiles?.total ?? 0,
    sansClan: sansClan?.total ?? 0,
  };
}

export async function derniersMembres() {
  return db
    .select({ id: membres.id, numero: membres.numero, prenom: membres.prenom, nom: membres.nom, adhereLe: membres.adhereLe })
    .from(membres)
    .where(eq(membres.statut, "membre"))
    .orderBy(desc(membres.adhereLe))
    .limit(5);
}
