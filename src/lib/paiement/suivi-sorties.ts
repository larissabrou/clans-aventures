import "server-only";
import {
  confirmerPaiementSortie,
  marquerPaiementSortieEchoue,
  noterReponseSortie,
  paiementsSortiesEnAttente,
} from "../sorties";
import { encoreEnCours, statutPaiement, type ReponsePasserelle } from "./gateway";

// Relit le statut d'un paiement de sortie auprès de la passerelle et met la base à jour.
// Utilisé par la relecture du formulaire, le webhook et la relecture automatique (toutes les
// 5 minutes) : on ne fait jamais confiance au seul contenu d'un webhook.

export type SuiviSortie = { etat: "paye" } | { etat: "en_attente" } | { etat: "echoue"; message: string };

function montant(reponse: ReponsePasserelle): number | undefined {
  const valeur = Number(reponse.amount);
  return Number.isFinite(valeur) && valeur > 0 ? valeur : undefined;
}

/** Lève une erreur si la passerelle est injoignable (l'appelant réessaiera). */
export async function suivrePaiementSortie(reference: string): Promise<SuiviSortie> {
  const reponse = await statutPaiement(reference);
  await noterReponseSortie(reference, reponse);

  const statut = String(reponse.status ?? "").toUpperCase();
  const terminal = reponse.is_terminal === true || ["SUCCESS", "FAILED", "CANCELLED"].includes(statut);

  // FAILED + « en cours de traitement » = encore en attente (souvent Orange).
  if (!terminal || (statut === "FAILED" && encoreEnCours(reponse))) {
    return { etat: "en_attente" };
  }

  if (statut === "SUCCESS") {
    const confirmation = await confirmerPaiementSortie(reference, montant(reponse));
    if (confirmation.resultat === "confirme" || confirmation.resultat === "deja_confirme") {
      return { etat: "paye" };
    }
    return {
      etat: "echoue",
      message: `Paiement reçu mais non validé. Contacte-nous sur WhatsApp avec la référence ${reference}.`,
    };
  }

  await marquerPaiementSortieEchoue(reference, statut === "CANCELLED" ? "annule" : "echoue");
  return {
    etat: "echoue",
    message: reponse.message ?? "Le paiement a été refusé ou annulé. Tu peux le relancer.",
  };
}

/**
 * Relit tous les paiements de sorties encore en attente depuis moins de 24 h : rattrape un webhook
 * perdu quand la personne a fermé la page. Renvoie le nombre de paiements relus.
 */
export async function relancerPaiementsSortiesEnAttente(): Promise<number> {
  const references = await paiementsSortiesEnAttente();
  for (const reference of references) {
    try {
      await suivrePaiementSortie(reference);
    } catch (erreur) {
      console.warn("Sortie : relecture impossible", {
        reference,
        message: erreur instanceof Error ? erreur.message : erreur,
      });
    }
  }
  return references.length;
}
