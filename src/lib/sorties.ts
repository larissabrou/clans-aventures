import "server-only";
import { and, asc, count, eq, gte, or, sql } from "drizzle-orm";
import { z } from "zod";
import { db } from "./db";
import { formatFcfa } from "./adhesion";
import { evenements, membres, messages, paiementsSorties, participations, typesActions } from "./db/schema";
import { imageMaj } from "./evenements";
import { programmerNotification } from "./jobs";
import { formaterDateHeure } from "./membres";
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

    // Un seul paiement en cours à la fois depuis un même numéro : empêche de bloquer toutes les
    // places d'une sortie en lançant des paiements en boucle sans les valider.
    const [memeNumero] = await tx
      .select({ reference: paiementsSorties.reference })
      .from(paiementsSorties)
      .where(
        and(
          eq(paiementsSorties.evenementId, evenementId),
          eq(paiementsSorties.telephoneDebite, paiement.telephoneDebite),
          enAttenteRecent,
        ),
      )
      .limit(1);
    if (memeNumero) {
      throw new ErreurSortie(
        estMembre(payeur)
          ? "Un paiement est déjà en cours pour cette sortie."
          : "Un paiement est déjà en cours depuis ce numéro : valide-le ou attends quelques minutes.",
      );
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

export type ConfirmationSortie =
  | { resultat: "confirme" | "deja_confirme"; participationId: number }
  // Argent reçu sans inscription possible : à rembourser par l'équipe (journalisé en erreur).
  | { resultat: "sortie_supprimee" | "deja_inscrit" }
  | { resultat: "introuvable" | "montant_incorrect" };

/**
 * Paiement réussi : la personne est inscrite à la sortie (même si elle s'est remplie entre-temps,
 * l'argent étant encaissé). Idempotent : le webhook, la relecture du formulaire et la relecture
 * automatique peuvent l'appeler. `montantRecu` (si la passerelle l'indique) doit couvrir le prix.
 */
export async function confirmerPaiementSortie(reference: string, montantRecu?: number): Promise<ConfirmationSortie> {
  const confirmation = await db.transaction(async (tx) => {
    const [paiement] = await tx
      .select()
      .from(paiementsSorties)
      .where(eq(paiementsSorties.reference, reference))
      .for("update")
      .limit(1);

    if (!paiement) return { resultat: "introuvable" } as const;
    if (paiement.statut === "reussi") {
      const [inscription] = await tx
        .select({ id: participations.id })
        .from(participations)
        .where(eq(participations.paiementReference, reference))
        .limit(1);
      if (inscription) return { resultat: "deja_confirme", participationId: inscription.id } as const;
      // Déjà traité sans inscription : même réponse qu'à la première confirmation.
      return { resultat: paiement.evenementId === null ? "sortie_supprimee" : "deja_inscrit" } as const;
    }
    if (montantRecu !== undefined && montantRecu < paiement.montant) {
      console.error("Sortie : montant insuffisant", { reference, montantRecu, attendu: paiement.montant });
      return { resultat: "montant_incorrect" } as const;
    }

    await tx
      .update(paiementsSorties)
      .set({ statut: "reussi", confirmeLe: new Date() })
      .where(eq(paiementsSorties.reference, reference));

    if (paiement.evenementId === null) {
      console.error("Sortie : paiement reçu pour une sortie supprimée, à rembourser", {
        reference,
        titre: paiement.evenementTitre,
        montant: paiement.montant,
      });
      return { resultat: "sortie_supprimee" } as const;
    }

    const [sortie] = await tx
      .select({ places: evenements.places, inscrits: count(participations.id) })
      .from(evenements)
      .leftJoin(participations, eq(participations.evenementId, evenements.id))
      .where(eq(evenements.id, paiement.evenementId))
      .groupBy(evenements.id);
    if (sortie?.places !== null && sortie !== undefined && sortie.inscrits >= sortie.places) {
      console.warn("Sortie : place payée alors que la sortie est complète", { reference, evenementId: paiement.evenementId });
    }

    const [inscription] = await tx
      .insert(participations)
      .values({
        evenementId: paiement.evenementId,
        membreId: paiement.membreId,
        // Coordonnées gardées seulement pour un non-membre (celles d'un membre sont sur sa fiche).
        ...(paiement.membreId
          ? {}
          : { prenom: paiement.prenom, nom: paiement.nom, telephone: paiement.telephone, email: paiement.email }),
        paiementReference: reference,
      })
      .onConflictDoNothing()
      .returning({ id: participations.id });

    if (!inscription) {
      // Membre déjà inscrit (autre paiement ou ajout par l'admin) : il a payé deux fois.
      console.error("Sortie : place payée en double, à rembourser", {
        reference,
        membreId: paiement.membreId,
        evenementId: paiement.evenementId,
        montant: paiement.montant,
      });
      return { resultat: "deja_inscrit" } as const;
    }

    return { resultat: "confirme", participationId: inscription.id, paiement } as const;
  });

  if (confirmation.resultat !== "confirme") return confirmation;

  const { paiement, participationId } = confirmation;
  await prevenirParticipant(paiement);
  return { resultat: "confirme", participationId };
}

/** Après l'inscription : e-mail de confirmation et, pour un membre, message dans sa boîte CLANS. */
async function prevenirParticipant(paiement: typeof paiementsSorties.$inferSelect) {
  const [membre] = paiement.membreId
    ? await db.select().from(membres).where(eq(membres.id, paiement.membreId)).limit(1)
    : [];
  const email = membre?.email ?? paiement.email;
  const prenom = membre?.prenom ?? paiement.prenom ?? "";
  const [sortie] = paiement.evenementId
    ? await db.select({ lieu: evenements.lieu }).from(evenements).where(eq(evenements.id, paiement.evenementId))
    : [];
  const date = formaterDateHeure(paiement.evenementDate);

  try {
    if (membre) {
      await db.insert(messages).values({
        membreId: membre.id,
        titre: `Inscription confirmée : ${paiement.evenementTitre}`,
        contenu: `Ton paiement de ${formatFcfa(paiement.montant)} FCFA est confirmé : tu es inscrit à « ${paiement.evenementTitre} », le ${date}${sortie?.lieu ? ` à ${sortie.lieu}` : ""}.\n\nRéférence du paiement : ${paiement.reference}`,
        type: "event",
      });
    }
    if (email) {
      await programmerNotification({
        modele: "participation",
        email,
        prenom,
        titre: paiement.evenementTitre,
        date,
        lieu: sortie?.lieu ?? null,
        reference: paiement.reference,
      });
    }
  } catch (erreur) {
    // L'inscription est faite : un échec d'envoi ne doit pas la remettre en cause.
    console.error("Sortie : confirmation non envoyée", { reference: paiement.reference, erreur });
  }
}

/** Paiement refusé ou annulé par la personne. */
export async function marquerPaiementSortieEchoue(reference: string, statut: "echoue" | "annule") {
  await db
    .update(paiementsSorties)
    .set({ statut })
    .where(and(eq(paiementsSorties.reference, reference), eq(paiementsSorties.statut, "en_attente")));
}

/** Dernière réponse de la passerelle, gardée pour l'équipe en cas de réclamation. */
export async function noterReponseSortie(reference: string, reponse: unknown) {
  await db.update(paiementsSorties).set({ derniereReponse: reponse }).where(eq(paiementsSorties.reference, reference));
}

/** Paiements encore en attente depuis moins de 24 h (relus automatiquement). */
export async function paiementsSortiesEnAttente(): Promise<string[]> {
  const lignes = await db
    .select({ reference: paiementsSorties.reference })
    .from(paiementsSorties)
    .where(and(eq(paiementsSorties.statut, "en_attente"), sql`${paiementsSorties.creeLe} > now() - interval '24 hours'`));
  return lignes.map((l) => l.reference);
}
