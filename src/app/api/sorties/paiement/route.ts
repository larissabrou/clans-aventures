// Lance le paiement Mobile Money d'une place à une sortie : membre connecté (Bon plan)
// ou non-membre (page publique /sorties, avec ses coordonnées).
import { randomBytes } from "node:crypto";
import { NextResponse } from "next/server";
import { z } from "zod";
import { membreConnecte } from "@/lib/auth";
import {
  DEVISE,
  ErreurPasserelle,
  PREFIXE_REFERENCE_SORTIE,
  creerPayin,
  encoreEnCours,
  lienWave,
  type Payin,
} from "@/lib/paiement/gateway";
import {
  OPERATEURS,
  PAYS,
  telephonePasserelle,
  type Operateur,
  type Pays,
  type ResultatPaiement,
} from "@/lib/paiement/operateurs";
import {
  ErreurSortie,
  confirmerPaiementSortie,
  enregistrerPaiementSortie,
  marquerPaiementSortieEchoue,
  moyenPaiementSchema,
  noterReponseSortie,
  participantSchema,
  type Payeur,
} from "@/lib/sorties";

const demandeSchema = moyenPaiementSchema.extend({
  evenementId: z.number({ error: "Sortie inconnue." }).int().positive("Sortie inconnue."),
  participant: participantSchema.optional(),
});

function repondre(resultat: ResultatPaiement, statutHttp = 200) {
  return NextResponse.json(resultat, { status: statutHttp });
}

export async function POST(request: Request) {
  const corps = await request.json().catch(() => null);
  const analyse = demandeSchema.safeParse(corps);
  if (!analyse.success) {
    return repondre({ statut: "error", message: analyse.error.issues[0]?.message ?? "Requête invalide." }, 422);
  }
  const demande = analyse.data;
  const pays = demande.pays as Pays;
  const operateur = demande.operateur as Operateur;
  if (!PAYS[pays].operateurs.includes(operateur)) {
    return repondre({ statut: "error", message: "Choisis un opérateur disponible dans ton pays." }, 422);
  }

  // Un membre connecté paie toujours en tant que membre ; sinon les coordonnées sont obligatoires.
  const membre = await membreConnecte();
  let payeur: Payeur;
  if (membre) {
    payeur = { membreId: membre.id };
  } else if (demande.participant) {
    payeur = demande.participant;
  } else {
    return repondre({ statut: "error", message: "Indique les coordonnées de la personne qui participe." }, 422);
  }

  const reference = `${PREFIXE_REFERENCE_SORTIE}${randomBytes(3).toString("hex").toUpperCase()}-${Date.now().toString(36).toUpperCase()}`;
  const telephoneDebite = telephonePasserelle(pays, demande.telephonePaiement);

  let montant: number;
  let titre: string;
  try {
    ({ montant, titre } = await enregistrerPaiementSortie(demande.evenementId, payeur, {
      reference,
      operateur,
      pays,
      telephoneDebite,
    }));
  } catch (erreur) {
    if (erreur instanceof ErreurSortie) return repondre({ statut: "error", message: erreur.message }, 409);
    console.error("Sortie : enregistrement impossible", erreur);
    return repondre({ statut: "error", message: "Service momentanément indisponible. Réessaie dans un instant." }, 503);
  }

  const contact = membre ?? demande.participant!;
  const payin: Payin = {
    order_id: reference,
    amount: montant,
    currency: DEVISE,
    country: pays,
    operator: operateur,
    phone_number: telephoneDebite,
    metadata: {
      clans_reference: reference,
      type: "participation",
      evenement_id: demande.evenementId,
      evenement: titre,
      membre_id: membre?.id ?? null,
      email: contact.email,
      participant: `${contact.prenom} ${contact.nom}`,
    },
  };

  // Wave : retour sur la page de la sortie. Wave refuse les adresses locales (rien en développement).
  const site = (process.env.NEXT_PUBLIC_SITE_URL ?? "").replace(/\/+$/, "");
  if (operateur === "wave" && site && !/^https?:\/\/(127\.0\.0\.\d+|localhost)(:\d+)?$/.test(site)) {
    const page = membre ? "/espace-membre/bon-plan" : "/sorties";
    const retour = `${site}${page}?sortie=${demande.evenementId}&paiement=retour&ref=${encodeURIComponent(reference)}`;
    payin.success_url = retour;
    payin.cancel_url = `${retour}&annule=1`;
  }

  console.info("Sortie : payin", { reference, operateur, pays, montant, evenementId: demande.evenementId });

  let reponse;
  try {
    reponse = await creerPayin(payin);
  } catch (erreur) {
    const message = erreur instanceof Error ? erreur.message : "Paiement indisponible.";
    console.error("Sortie : erreur payin", { reference, message });
    await marquerPaiementSortieEchoue(reference, "echoue");
    return repondre({ statut: "error", message }, erreur instanceof ErreurPasserelle && erreur.statutHttp === 500 ? 500 : 502);
  }
  await noterReponseSortie(reference, reponse);

  const statut = String(reponse.status ?? "").toUpperCase();

  if (operateur === "wave") {
    const url = lienWave(reponse);
    if (url) return repondre({ statut: "redirect", reference, url });
  }

  if (statut === "SUCCESS") {
    const confirmation = await confirmerPaiementSortie(reference);
    if (confirmation.resultat === "confirme" || confirmation.resultat === "deja_confirme") {
      return repondre({ statut: "paid", reference });
    }
  }

  if (encoreEnCours(reponse) && statut !== "CANCELLED") {
    return repondre({ statut: "pending", reference, instruction: OPERATEURS[operateur].instruction });
  }

  if (!reponse.success || statut === "FAILED" || statut === "CANCELLED") {
    await marquerPaiementSortieEchoue(reference, statut === "CANCELLED" ? "annule" : "echoue");
    return repondre({
      statut: "error",
      message: reponse.message ?? "Le paiement n’a pas pu être lancé. Réessaie ou choisis un autre opérateur.",
    });
  }

  return repondre({ statut: "pending", reference, instruction: OPERATEURS[operateur].instruction });
}
