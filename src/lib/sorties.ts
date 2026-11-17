import "server-only";
import { and, asc, count, eq, gte, or, sql } from "drizzle-orm";
import { z } from "zod";
import { db } from "./db";
import { evenements, membres, paiementsSorties, participations, typesActions } from "./db/schema";
import { imageMaj } from "./evenements";
import { DEVISE, MONTANT_MINIMUM } from "./paiement/gateway";
import { estOperateur, estPays } from "./paiement/operateurs";
import { normaliserTelephone } from "./telephone";

// Paiement en ligne des sorties (références CLANS-EVT-…), séparé du paiement d'adhésion.
// Un membre paie depuis Bon plan ; un non-membre depuis la page publique /sorties.

export class ErreurSortie extends Error {}

/** Un paiement en attente garde sa place pendant ce délai (évite de vendre deux fois la dernière). */
export const DELAI_RESERVATION_MINUTES = 15;

/** La passerelle refuse les petits montants : en dessous, le paiement se fait auprès de l'équipe. */
export function paiementEnLignePossible(prix: number | null): boolean {
  return prix !== null && prix >= MONTANT_MINIMUM;
}

const texteRequis = (message: string, max = 80) =>
  z.string({ error: message }).trim().min(1, message).max(max);

/** Moyen de paiement Mobile Money (membres et non-membres). */
export const moyenPaiementSchema = z.object({
  pays: z.string({ error: "Choisis ton pays." }).refine(estPays, "Pays non pris en charge."),
  operateur: z
    .string({ error: "Choisis ton opérateur Mobile Money." })
    .refine(estOperateur, "Opérateur non pris en charge."),
  telephonePaiement: texteRequis("Indique le numéro Mobile Money à débiter.", 30),
});

/** Personne qui participe, quand elle n'est pas membre. */
export const participantSchema = z.object({
  prenom: texteRequis("Indique le prénom de la personne qui participe."),
  nom: texteRequis("Indique le nom de la personne qui participe."),
  email: z.email({ error: "L’adresse email ne semble pas valide." }).trim().max(200),
  telephone: texteRequis("Indique un numéro de téléphone.", 30),
});

export type Payeur = { membreId: string } | z.infer<typeof participantSchema>;

const estMembre = (payeur: Payeur): payeur is { membreId: string } => "membreId" in payeur;

/** Paiements encore en attente depuis moins de DELAI_RESERVATION_MINUTES. */
const enAttenteRecent = sql`${paiementsSorties.statut} = 'en_attente' and ${paiementsSorties.creeLe} > now() - make_interval(mins => ${DELAI_RESERVATION_MINUTES})`;

/**
 * Vérifie que la place peut être payée puis enregistre le paiement « en attente ».
 * Lève ErreurSortie (message affichable) si la sortie ne peut pas être payée par cette personne.
 */
export async function enregistrerPaiementSortie(
  evenementId: number,
  payeur: Payeur,
  paiement: { reference: string; operateur: string; pays: string; telephoneDebite: string },
): Promise<{ montant: number; titre: string }> {
  return db.transaction(async (tx) => {
    // Verrou sur la sortie : deux paiements simultanés comptent les places l'un après l'autre.
    const [sortie] = await tx.select().from(evenements).where(eq(evenements.id, evenementId)).for("update").limit(1);

    if (!sortie) throw new ErreurSortie("Cette sortie n’existe plus.");
    if (sortie.date.getTime() <= Date.now()) throw new ErreurSortie("Cette sortie est déjà passée.");
    if (!estMembre(payeur) && !sortie.publique) throw new ErreurSortie("Cette sortie est réservée aux membres.");
    if (!paiementEnLignePossible(sortie.prix)) {
      throw new ErreurSortie("Le paiement en ligne n’est pas disponible pour cette sortie.");
    }

    let coordonnees: { prenom: string; nom: string; email: string; telephone: string } | null = null;

    if (estMembre(payeur)) {
      const [inscrit] = await tx
        .select({ id: participations.id })
        .from(participations)
        .where(and(eq(participations.evenementId, evenementId), eq(participations.membreId, payeur.membreId)))
        .limit(1);
      if (inscrit) throw new ErreurSortie("Tu es déjà inscrit à cette sortie.");

      const [enCours] = await tx
        .select({ reference: paiementsSorties.reference })
        .from(paiementsSorties)
        .where(
          and(eq(paiementsSorties.evenementId, evenementId), eq(paiementsSorties.membreId, payeur.membreId), enAttenteRecent),
        )
        .limit(1);
      if (enCours) throw new ErreurSortie("Un paiement est déjà en cours pour cette sortie.");
    } else {
      coordonnees = {
        prenom: payeur.prenom,
        nom: payeur.nom,
        email: payeur.email.toLowerCase(),
        telephone: normaliserTelephone(payeur.telephone),
      };
      // Un membre qui passe par la page publique doit payer depuis son espace (étoiles, pas de doublon).
      const [membre] = await tx
        .select({ id: membres.id })
        .from(membres)
        .where(
          and(
            eq(membres.statut, "membre"),
            or(eq(membres.telephone, coordonnees.telephone), sql`lower(${membres.email}) = ${coordonnees.email}`),
          ),
        )
        .limit(1);
      if (membre) throw new ErreurSortie("Tu es déjà membre : connecte-toi pour payer depuis ton espace.");
    }

    if (sortie.places !== null) {
      const [{ inscrits }] = await tx
        .select({ inscrits: count() })
        .from(participations)
        .where(eq(participations.evenementId, evenementId));
      const [{ reserves }] = await tx
        .select({ reserves: count() })
        .from(paiementsSorties)
        .where(and(eq(paiementsSorties.evenementId, evenementId), enAttenteRecent));
      if (inscrits + reserves >= sortie.places) throw new ErreurSortie("Cette sortie est complète.");
    }

    const montant = sortie.prix as number;
    await tx.insert(paiementsSorties).values({
      reference: paiement.reference,
      evenementId,
      membreId: estMembre(payeur) ? payeur.membreId : null,
      ...coordonnees,
      evenementTitre: sortie.titre,
      evenementDate: sortie.date,
      montant,
      devise: DEVISE,
      operateur: paiement.operateur,
      pays: paiement.pays,
      telephoneDebite: paiement.telephoneDebite,
    });

    return { montant, titre: sortie.titre };
  });
}

/** Page publique /sorties : sorties publiques à venir, sans les informations réservées aux membres. */
export async function sortiesPubliques() {
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
      typeAction: typesActions.nom,
      inscrits: count(participations.id),
      imageMaj,
    })
    .from(evenements)
    .leftJoin(typesActions, eq(typesActions.id, evenements.typeActionId))
    .leftJoin(participations, eq(participations.evenementId, evenements.id))
    .where(and(eq(evenements.publique, true), gte(evenements.date, sql`now()`)))
    .groupBy(evenements.id, typesActions.id)
    .orderBy(asc(evenements.date));
}
