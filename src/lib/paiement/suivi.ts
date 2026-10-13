import "server-only";
import {
  confirmerPaiement,
  marquerPaiementEchoue,
  noterReponsePasserelle,
} from "../adhesions";
import { encoreEnCours, statutPaiement, type ReponsePasserelle } from "./gateway";

// Relit le statut d'un paiement auprès de la passerelle et met la base à jour.
// Utilisé par la relecture du formulaire ET par le webhook : on ne fait jamais confiance
// au seul contenu d'un webhook, le statut est toujours revérifié auprès de la passerelle.

export type Suivi =
  | { etat: "paye"; membreId: string }
  | { etat: "en_attente" }
  | { etat: "echoue"; message: string };

function montant(reponse: ReponsePasserelle): number | undefined {
  const valeur = Number(reponse.amount);
  return Number.isFinite(valeur) && valeur > 0 ? valeur : undefined;
}

/** Lève une erreur si la passerelle est injoignable (l'appelant réessaiera). */
export async function suivrePaiement(reference: string): Promise<Suivi> {
  const reponse = await statutPaiement(reference);
  await noterReponsePasserelle(reference, reponse);

  const statut = String(reponse.status ?? "").toUpperCase();
  const terminal = reponse.is_terminal === true || ["SUCCESS", "FAILED", "CANCELLED"].includes(statut);

  // FAILED + « en cours de traitement » = encore en attente (souvent Orange).
  if (!terminal || (statut === "FAILED" && encoreEnCours(reponse))) {
    return { etat: "en_attente" };
  }

  if (statut === "SUCCESS") {
    const confirmation = await confirmerPaiement(reference, montant(reponse));
    if (confirmation.resultat === "confirme" || confirmation.resultat === "deja_confirme") {
      return { etat: "paye", membreId: confirmation.membreId };
    }
    return {
      etat: "echoue",
      message: `Paiement reçu mais non validé. Contacte-nous sur WhatsApp avec la référence ${reference}.`,
    };
  }

  await marquerPaiementEchoue(reference, statut === "CANCELLED" ? "annule" : "echoue");
  return {
    etat: "echoue",
    message: reponse.message ?? "Le paiement a été refusé ou annulé. Tu peux le relancer.",
  };
}
