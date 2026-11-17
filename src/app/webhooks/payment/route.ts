// Webhook du Payment Gateway (AggregPay), à déclarer sur la fiche partenaire :
// POST https://clans-aventures.com/webhooks/payment
import { NextResponse } from "next/server";
import { PREFIXE_REFERENCE, PREFIXE_REFERENCE_SORTIE, signatureValide } from "@/lib/paiement/gateway";
import { suivrePaiement } from "@/lib/paiement/suivi";
import { suivrePaiementSortie } from "@/lib/paiement/suivi-sorties";

export async function POST(request: Request) {
  const corpsBrut = await request.text();

  if (!signatureValide(corpsBrut, request.headers.get("x-gateway-signature"))) {
    console.warn("Webhook AggregPay : signature invalide");
    return NextResponse.json({ message: "Signature invalide" }, { status: 401 });
  }

  let payload: Record<string, unknown>;
  try {
    payload = JSON.parse(corpsBrut);
  } catch {
    return NextResponse.json({ message: "Corps JSON invalide" }, { status: 400 });
  }
  if (!payload || typeof payload !== "object") {
    return NextResponse.json({ message: "Corps JSON invalide" }, { status: 400 });
  }

  const orderId = typeof payload.order_id === "string" ? payload.order_id : null;
  if (!orderId) {
    return NextResponse.json({ message: "order_id manquant" }, { status: 400 });
  }
  // Adhésion (CLANS-ADH-…) ou place à une sortie (CLANS-EVT-…) : chacun a son propre suivi.
  const suivre = orderId.startsWith(PREFIXE_REFERENCE)
    ? suivrePaiement
    : orderId.startsWith(PREFIXE_REFERENCE_SORTIE)
      ? suivrePaiementSortie
      : null;
  if (!suivre) {
    console.warn("Webhook AggregPay : référence inconnue", { orderId });
    return NextResponse.json({ received: true, found: false });
  }

  console.info("Webhook AggregPay reçu", { event: payload.event, orderId, statut: payload.status });

  // Le statut est revérifié auprès de la passerelle avant toute écriture en base :
  // un webhook falsifié ne peut donc pas valider une adhésion ni une place.
  try {
    const suivi = await suivre(orderId);
    return NextResponse.json({ received: true, found: true, etat: suivi.etat });
  } catch (erreur) {
    console.error("Webhook AggregPay : vérification impossible", {
      orderId,
      message: erreur instanceof Error ? erreur.message : erreur,
    });
    // 503 : la passerelle pourra renvoyer le webhook plus tard.
    return NextResponse.json({ received: false }, { status: 503 });
  }
}
