// Enregistre la demande d'adhésion puis lance le paiement sur le Payment Gateway (Mobile Money).
import { randomBytes } from "node:crypto";
import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import {
  COOKIE_ADHESION,
  ErreurAdhesion,
  confirmerPaiement,
  demandeAdhesionSchema,
  enregistrerDemande,
  marquerPaiementEchoue,
  montantADebiter,
  noterReponsePasserelle,
} from "@/lib/adhesions";
import { ouvrirSession } from "@/lib/auth";
import { enProduction } from "@/lib/env";
import {
  DEVISE,
  ErreurPasserelle,
  MONTANT_MINIMUM,
  PREFIXE_REFERENCE,
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

function repondre(resultat: ResultatPaiement, statutHttp = 200) {
  return NextResponse.json(resultat, { status: statutHttp });
}

export async function POST(request: Request) {
  const corps = await request.json().catch(() => null);
  const analyse = demandeAdhesionSchema.safeParse(corps);
  if (!analyse.success) {
    const message = analyse.error.issues[0]?.message ?? "Requête invalide.";
    return repondre({ statut: "error", message }, 422);
  }
  const demande = analyse.data;
  const pays = demande.pays as Pays;
  const operateur = demande.operateur as Operateur;

  if (!PAYS[pays].operateurs.includes(operateur)) {
    return repondre({ statut: "error", message: "Choisis un opérateur disponible dans ton pays." }, 422);
  }

  const reference = `${PREFIXE_REFERENCE}${randomBytes(3).toString("hex").toUpperCase()}-${Date.now().toString(36).toUpperCase()}`;
  const montant = Math.max(await montantADebiter(), MONTANT_MINIMUM);
  const telephoneDebite = telephonePasserelle(pays, demande.telephonePaiement);

  let membreId: string;
  try {
    ({ membreId } = await enregistrerDemande(demande, {
      reference,
      montant,
      devise: DEVISE,
      telephone: telephoneDebite,
    }));
  } catch (erreur) {
    if (erreur instanceof ErreurAdhesion) {
      return repondre({ statut: "error", message: erreur.message }, 409);
    }
    console.error("Adhésion : enregistrement impossible", erreur);
    return repondre({ statut: "error", message: "Service momentanément indisponible. Réessaie dans un instant." }, 503);
  }

  (await cookies()).set(COOKIE_ADHESION, reference, {
    httpOnly: true,
    secure: enProduction,
    sameSite: "lax",
    path: "/",
    maxAge: 24 * 3600,
  });

  const payin: Payin = {
    order_id: reference,
    amount: montant,
    currency: DEVISE,
    country: pays,
    operator: operateur,
    phone_number: telephoneDebite,
    metadata: {
      clans_reference: reference,
      type: "adhesion",
      membre_id: membreId,
      email: demande.email,
      membre: `${demande.prenom} ${demande.nom}`,
    },
  };

  // Wave : retour sur le formulaire après paiement. Wave refuse les adresses locales,
  // donc rien n'est envoyé en développement ; le formulaire relit alors le statut lui-même.
  const site = (process.env.NEXT_PUBLIC_SITE_URL ?? "").replace(/\/+$/, "");
  if (operateur === "wave" && site && !/^https?:\/\/(127\.0\.0\.\d+|localhost)(:\d+)?$/.test(site)) {
    const retour = `${site}/inscription?paiement=retour&ref=${encodeURIComponent(reference)}`;
    payin.success_url = retour;
    payin.cancel_url = `${retour}&annule=1`;
  }

  console.info("Adhésion : payin", { reference, operateur, pays, montant });

  let reponse;
  try {
    reponse = await creerPayin(payin);
  } catch (erreur) {
    const message = erreur instanceof Error ? erreur.message : "Paiement indisponible.";
    console.error("Adhésion : erreur payin", { reference, message });
    await marquerPaiementEchoue(reference, "echoue");
    return repondre({ statut: "error", message }, erreur instanceof ErreurPasserelle && erreur.statutHttp === 500 ? 500 : 502);
  }
  await noterReponsePasserelle(reference, reponse);

  const statut = String(reponse.status ?? "").toUpperCase();

  if (operateur === "wave") {
    const url = lienWave(reponse);
    if (url) return repondre({ statut: "redirect", reference, url });
  }

  if (statut === "SUCCESS") {
    const confirmation = await confirmerPaiement(reference);
    if (confirmation.resultat === "confirme" || confirmation.resultat === "deja_confirme") {
      await ouvrirSession(confirmation.membreId);
      return repondre({ statut: "paid", reference });
    }
  }

  if (encoreEnCours(reponse) && statut !== "CANCELLED") {
    return repondre({ statut: "pending", reference, instruction: OPERATEURS[operateur].instruction });
  }

  if (!reponse.success || statut === "FAILED" || statut === "CANCELLED") {
    await marquerPaiementEchoue(reference, statut === "CANCELLED" ? "annule" : "echoue");
    return repondre({
      statut: "error",
      message: reponse.message ?? "Le paiement n’a pas pu être lancé. Réessaie ou choisis un autre opérateur.",
    });
  }

  return repondre({ statut: "pending", reference, instruction: OPERATEURS[operateur].instruction });
}
