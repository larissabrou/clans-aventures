// Relecture du statut d'un paiement par le formulaire (toutes les quelques secondes).
import { cookies } from "next/headers";
import { NextResponse, connection } from "next/server";
import { COOKIE_ADHESION } from "@/lib/adhesions";
import { ouvrirSession } from "@/lib/auth";
import { PREFIXE_REFERENCE } from "@/lib/paiement/gateway";
import type { ResultatPaiement } from "@/lib/paiement/operateurs";
import { suivrePaiement } from "@/lib/paiement/suivi";

export async function GET(_request: Request, { params }: { params: Promise<{ reference: string }> }) {
  await connection(); // toujours à la demande : jamais prérendu
  const { reference } = await params;

  if (!reference.startsWith(PREFIXE_REFERENCE)) {
    return NextResponse.json({ statut: "error", message: "Référence inconnue." }, { status: 404 });
  }

  let suivi;
  try {
    suivi = await suivrePaiement(reference);
  } catch (erreur) {
    console.warn("Adhésion : statut indisponible", { reference, message: erreur instanceof Error ? erreur.message : erreur });
    // Erreur passagère : le formulaire réessaiera au prochain tour.
    return NextResponse.json({ statut: "pending", reference, instruction: "" } satisfies ResultatPaiement);
  }

  if (suivi.etat === "en_attente") {
    return NextResponse.json({ statut: "pending", reference, instruction: "" } satisfies ResultatPaiement);
  }

  if (suivi.etat === "echoue") {
    return NextResponse.json({ statut: "failed", message: suivi.message } satisfies ResultatPaiement);
  }

  // Payé : on connecte directement la personne, si c'est bien ce navigateur qui a lancé le paiement.
  const magasin = await cookies();
  if (magasin.get(COOKIE_ADHESION)?.value === reference) {
    await ouvrirSession(suivi.membreId);
    magasin.delete(COOKIE_ADHESION);
  }
  return NextResponse.json({ statut: "paid", reference } satisfies ResultatPaiement);
}
