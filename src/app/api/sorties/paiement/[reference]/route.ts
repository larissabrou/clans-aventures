// Relecture du statut d'un paiement de sortie par le formulaire (toutes les quelques secondes).
import { NextResponse, connection } from "next/server";
import { PREFIXE_REFERENCE_SORTIE } from "@/lib/paiement/gateway";
import type { ResultatPaiement } from "@/lib/paiement/operateurs";
import { suivrePaiementSortie } from "@/lib/paiement/suivi-sorties";

export async function GET(_request: Request, { params }: { params: Promise<{ reference: string }> }) {
  await connection(); // toujours à la demande : jamais prérendu
  const { reference } = await params;

  if (!reference.startsWith(PREFIXE_REFERENCE_SORTIE)) {
    return NextResponse.json({ statut: "error", message: "Référence inconnue." }, { status: 404 });
  }

  let suivi;
  try {
    suivi = await suivrePaiementSortie(reference);
  } catch (erreur) {
    console.warn("Sortie : statut indisponible", { reference, message: erreur instanceof Error ? erreur.message : erreur });
    // Erreur passagère : le formulaire réessaiera au prochain tour.
    return NextResponse.json({ statut: "pending", reference, instruction: "" } satisfies ResultatPaiement);
  }

  if (suivi.etat === "en_attente") {
    return NextResponse.json({ statut: "pending", reference, instruction: "" } satisfies ResultatPaiement);
  }
  if (suivi.etat === "echoue") {
    return NextResponse.json({ statut: "failed", message: suivi.message } satisfies ResultatPaiement);
  }
  return NextResponse.json({ statut: "paid", reference } satisfies ResultatPaiement);
}
