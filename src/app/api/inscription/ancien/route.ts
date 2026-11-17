// Inscription d'un ancien membre (adhésion déjà réglée hors du site) : s'il est dans la liste
// chargée par l'admin, il devient membre sans paiement et sa session est ouverte.
import { NextResponse } from "next/server";
import { ErreurAdhesion, demandeAncienSchema } from "@/lib/adhesions";
import { inscrireAncienMembre } from "@/lib/anciens-membres";
import { ouvrirSession } from "@/lib/auth";

export type ResultatInscriptionAncien =
  | { statut: "active" }
  | { statut: "inconnu" }
  | { statut: "error"; message: string };

function repondre(resultat: ResultatInscriptionAncien, statutHttp = 200) {
  return NextResponse.json(resultat, { status: statutHttp });
}

export async function POST(request: Request) {
  const corps = await request.json().catch(() => null);
  const analyse = demandeAncienSchema.safeParse(corps);
  if (!analyse.success) {
    return repondre({ statut: "error", message: analyse.error.issues[0]?.message ?? "Requête invalide." }, 422);
  }

  try {
    const resultat = await inscrireAncienMembre(analyse.data);
    if (resultat.resultat === "inconnu") return repondre({ statut: "inconnu" });
    await ouvrirSession(resultat.membreId);
    return repondre({ statut: "active" });
  } catch (erreur) {
    if (erreur instanceof ErreurAdhesion) return repondre({ statut: "error", message: erreur.message }, 409);
    console.error("Inscription d'un ancien membre : échec", erreur);
    return repondre({ statut: "error", message: "Service momentanément indisponible. Réessaie dans un instant." }, 503);
  }
}
