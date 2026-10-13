// Client du Payment Gateway (AggregPay), repris de Czotick.
// Serveur uniquement : la clé API ne doit jamais atteindre le navigateur
// (« server-only » fait échouer le build si ce fichier est importé côté client).
import "server-only";
import { createHmac, timingSafeEqual } from "node:crypto";

/** Préfixe des références d'adhésion envoyées à la passerelle (order_id). */
export const PREFIXE_REFERENCE = "CLANS-ADH-";

export class ErreurPasserelle extends Error {
  constructor(
    message: string,
    public readonly statutHttp: number,
  ) {
    super(message);
    this.name = "ErreurPasserelle";
  }
}

export type ReponsePasserelle = {
  status?: string;
  success?: boolean;
  message?: string;
  is_terminal?: boolean;
  errors?: unknown;
  [cle: string]: unknown;
};

export type Payin = {
  order_id: string;
  amount: number;
  currency: string;
  country: string;
  operator: string;
  phone_number: string;
  metadata?: Record<string, unknown>;
  success_url?: string;
  cancel_url?: string;
};

export const MONTANT_MINIMUM = Number(process.env.PAYMENT_GATEWAY_MIN_AMOUNT ?? 500);
export const DEVISE = process.env.PAYMENT_GATEWAY_DEFAULT_CURRENCY ?? "XOF";

function configuration() {
  const url = (process.env.PAYMENT_GATEWAY_URL ?? "https://payment.czotick.com").replace(/\/+$/, "");
  const cle = process.env.PAYMENT_GATEWAY_API_KEY;
  if (!cle) {
    throw new ErreurPasserelle(
      "Payment Gateway non configuré : PAYMENT_GATEWAY_URL et PAYMENT_GATEWAY_API_KEY dans .env",
      500,
    );
  }
  return { url, cle };
}

export async function creerPayin(payin: Payin): Promise<ReponsePasserelle> {
  const { url, cle } = configuration();
  const reponse = await fetch(`${url}/api/v1/payments`, {
    method: "POST",
    headers: { Authorization: `Bearer ${cle}`, Accept: "application/json", "Content-Type": "application/json" },
    body: JSON.stringify(payin),
    cache: "no-store",
    signal: AbortSignal.timeout(30_000),
  });
  return decoder(reponse);
}

/** Statut en temps réel (422 = échec terminal avec un corps JSON valide). */
export async function statutPaiement(orderId: string): Promise<ReponsePasserelle> {
  const { url, cle } = configuration();
  const reponse = await fetch(`${url}/api/v1/payments/${encodeURIComponent(orderId)}/status`, {
    headers: { Authorization: `Bearer ${cle}`, Accept: "application/json" },
    cache: "no-store",
    signal: AbortSignal.timeout(30_000),
  });
  return decoder(reponse);
}

async function decoder(reponse: Response): Promise<ReponsePasserelle> {
  const json = (await reponse.json().catch(() => ({}))) as ReponsePasserelle;

  if (reponse.ok) return json;
  if (reponse.status === 422 && Object.keys(json).length > 0) return json;

  const premiereErreur = Array.isArray(json.errors)
    ? json.errors.flat()[0]
    : json.errors && typeof json.errors === "object"
      ? Object.values(json.errors).flat()[0]
      : undefined;
  const message = json.message ?? premiereErreur ?? `HTTP ${reponse.status}`;

  throw new ErreurPasserelle("Payment Gateway : " + messageLisible(String(message)), reponse.status);
}

function messageLisible(message: string): string {
  if (message.includes("Non-JSON error response from provider")) {
    return "Le prestataire Mobile Money est temporairement indisponible. Réessaie dans quelques minutes.";
  }
  if (message.includes("validation.min.numeric")) {
    return "Le montant est inférieur au minimum autorisé pour ce moyen de paiement.";
  }
  return message;
}

/** La passerelle (souvent Orange) répond parfois FAILED alors que le paiement est encore en cours. */
export function encoreEnCours(reponse: ReponsePasserelle): boolean {
  const statut = String(reponse.status ?? "").toUpperCase();
  if (["PENDING", "PROCESSING", "INITIATED", "WAITING"].includes(statut)) return true;

  const message = String(reponse.message ?? "").toLowerCase();
  return (
    message !== "" &&
    ["en cours", "processing", "pending", "attente", "initiated", "in progress", "awaiting"].some((indice) =>
      message.includes(indice),
    )
  );
}

/** Lien de la page Wave renvoyé par la passerelle, s'il y en a un. */
export function lienWave(reponse: ReponsePasserelle): string | undefined {
  for (const cle of ["provider_link", "wave_launch_url", "checkout_url", "payment_url", "url"]) {
    const valeur = reponse[cle];
    if (typeof valeur === "string" && valeur !== "") return valeur;
  }
  return undefined;
}

/**
 * Vérifie l'en-tête X-Gateway-Signature (HMAC SHA-256 du corps brut).
 * Sans secret configuré : accepté en développement, refusé en production.
 */
export function signatureValide(corpsBrut: string, signature: string | null): boolean {
  const secret = process.env.PAYMENT_GATEWAY_WEBHOOK_SECRET;
  if (!secret) return process.env.NODE_ENV !== "production";
  if (!signature) return false;

  const attendue = Buffer.from(createHmac("sha256", secret).update(corpsBrut).digest("hex"));
  const recue = Buffer.from(signature);
  return attendue.length === recue.length && timingSafeEqual(attendue, recue);
}
