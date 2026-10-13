import "server-only";
import { and, asc, count, desc, eq, gte, sql, sum } from "drizzle-orm";
import { db } from "./db";
import {
  evenements,
  membres,
  messages,
  mouvementsEtoiles,
  participations,
  type Membre,
} from "./db/schema";

// Lecture des données de l'espace membre. Chaque fonction reçoit le membre déjà authentifié
// (voir exigerMembre dans auth.ts) : impossible de lire les données d'un autre membre.

const FUSEAU = "Africa/Abidjan";

export function formaterDate(date: Date) {
  return date.toLocaleDateString("fr-FR", { day: "2-digit", month: "long", year: "numeric", timeZone: FUSEAU });
}

export function formaterDateHeure(date: Date) {
  const jour = formaterDate(date);
  const heure = date.toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit", timeZone: FUSEAU });
  return `${jour} — ${heure}`;
}

export async function tableauDeBord(membre: Membre) {
  const [[etoiles], [experiences], [filleuls], listeMessages, historique, obligatoires] =
    await Promise.all([
      db
        .select({ total: sum(mouvementsEtoiles.variation).mapWith(Number) })
        .from(mouvementsEtoiles)
        .where(eq(mouvementsEtoiles.membreId, membre.id)),
      db
        .select({ total: count() })
        .from(participations)
        .where(and(eq(participations.membreId, membre.id), eq(participations.present, true))),
      db.select({ total: count() }).from(membres).where(eq(membres.parrainId, membre.id)),
      db
        .select()
        .from(messages)
        .where(eq(messages.membreId, membre.id))
        .orderBy(desc(messages.creeLe), desc(messages.id))
        .limit(50),
      db
        .select()
        .from(mouvementsEtoiles)
        .where(eq(mouvementsEtoiles.membreId, membre.id))
        .orderBy(desc(mouvementsEtoiles.creeLe))
        .limit(20),
      db
        .select()
        .from(evenements)
        .where(and(eq(evenements.obligatoire, true), gte(evenements.date, sql`now()`)))
        .orderBy(asc(evenements.date))
        .limit(5),
    ]);

  return {
    membre: {
      prenom: membre.prenom,
      nom: membre.nom,
      numero: membre.numero ?? "—",
      clan: membre.clan ?? "À définir",
      dateAdhesion: membre.adhereLe ? formaterDate(membre.adhereLe) : "—",
      etoiles: etoiles?.total ?? 0,
      experiences: experiences?.total ?? 0,
      filleuls: filleuls?.total ?? 0,
    },
    messages: listeMessages.map((m) => ({
      id: m.id,
      titre: m.titre,
      contenu: m.contenu,
      type: m.type,
      lu: m.lu,
      date: formaterDateHeure(m.creeLe),
    })),
    historique: historique.map((h) => ({
      id: h.id,
      libelle: h.libelle,
      variation: h.variation,
      date: formaterDate(h.creeLe),
    })),
    evenementsObligatoires: obligatoires.map((e) => ({
      id: e.id,
      titre: e.titre,
      date: formaterDate(e.date),
      penalite: e.penalite,
    })),
  };
}

export type TableauDeBord = Awaited<ReturnType<typeof tableauDeBord>>;

/** Marque un message comme lu, seulement s'il appartient bien à ce membre. */
export async function marquerMessageLu(membreId: string, messageId: number) {
  await db
    .update(messages)
    .set({ lu: true })
    .where(and(eq(messages.id, messageId), eq(messages.membreId, membreId)));
}
