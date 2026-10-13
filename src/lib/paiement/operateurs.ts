// Opérateurs Mobile Money acceptés par le Payment Gateway (la passerelle de Czotick)
// et pays servis. Partagé entre le formulaire (navigateur) et les routes API (serveur) :
// aucune donnée secrète ici.

export type Operateur = "orange" | "mtn" | "moov" | "wave";
export type Pays = "CI" | "BJ" | "BF" | "ML" | "TG";

export const OPERATEURS: Record<
  Operateur,
  { nom: string; logo: string; instruction: string }
> = {
  orange: {
    nom: "Orange Money",
    logo: "/images/paiement/orange-money.png",
    instruction:
      "Valide le paiement sur ton téléphone Orange Money : compose #120# puis suis les instructions.",
  },
  mtn: {
    nom: "MTN MoMo",
    logo: "/images/paiement/mtn-money.png",
    instruction: "Compose *133# puis l’option 1 pour valider le paiement.",
  },
  moov: {
    nom: "Moov Money",
    logo: "/images/paiement/moov-money.png",
    instruction: "Compose *155*15# pour valider le paiement.",
  },
  wave: {
    nom: "Wave",
    logo: "/images/paiement/wave.png",
    instruction: "Valide le paiement sur la page Wave qui s’ouvre.",
  },
};

export const PAYS: Record<
  Pays,
  { nom: string; indicatif: string; operateurs: Operateur[] }
> = {
  CI: { nom: "Côte d’Ivoire", indicatif: "225", operateurs: ["orange", "mtn", "moov", "wave"] },
  BJ: { nom: "Bénin", indicatif: "229", operateurs: ["mtn", "moov"] },
  BF: { nom: "Burkina Faso", indicatif: "226", operateurs: ["orange", "moov"] },
  ML: { nom: "Mali", indicatif: "223", operateurs: ["orange", "moov"] },
  TG: { nom: "Togo", indicatif: "228", operateurs: ["moov"] },
};

export function estOperateur(valeur: unknown): valeur is Operateur {
  return typeof valeur === "string" && valeur in OPERATEURS;
}

export function estPays(valeur: unknown): valeur is Pays {
  return typeof valeur === "string" && valeur in PAYS;
}

/** Numéro au format de la passerelle : indicatif + numéro local, sans « + » (ex. 2250700000000). */
export function telephonePasserelle(pays: Pays, telephone: string): string {
  const { indicatif } = PAYS[pays];
  let chiffres = telephone.replace(/\D/g, "");
  if (chiffres.startsWith("00" + indicatif)) {
    chiffres = chiffres.slice(indicatif.length + 2);
  } else if (chiffres.startsWith(indicatif) && chiffres.length > 10) {
    chiffres = chiffres.slice(indicatif.length);
  }
  return indicatif + chiffres;
}

/** Réponse des routes /api/paiement, telle que le formulaire la lit. */
export type ResultatPaiement =
  | { statut: "pending"; reference: string; instruction: string }
  | { statut: "redirect"; reference: string; url: string }
  | { statut: "paid"; reference: string }
  | { statut: "failed"; message: string }
  | { statut: "error"; message: string };
