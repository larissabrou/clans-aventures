// Le prix de l'adhésion est réglé dans l'admin : voir prixAdhesion() dans lib/parametres.ts.

export function formatFcfa(montant: number) {
  // Espace fine insécable comme séparateur de milliers : « 2 500 ».
  return montant.toLocaleString("fr-FR");
}

export const AVANTAGES_ADHESION = [
  "Ton statut de membre CLANS",
  "Ton intégration à la communauté",
  "L’accès aux espaces et activités réservés aux membres, selon leurs conditions",
  "Ton orientation vers les univers et clans qui te correspondent",
  "Ton pin officiel CLANS, remis lors de ta première participation physique",
];

export const APPARTENANCES_CULTURELLES = [
  { value: "akan", label: "Akan" },
  { value: "krou", label: "Krou" },
  { value: "mande", label: "Mandé" },
  { value: "gur", label: "Gur / Voltaïque" },
  { value: "autre", label: "Autres horizons" },
  { value: "non-precise", label: "Je préfère ne pas préciser" },
];

export const UNIVERS_A_DECOUVRIR = [
  { value: "akan", label: "Univers Akan" },
  { value: "krou", label: "Univers Krou" },
  { value: "mande", label: "Univers Mandé" },
  { value: "gur", label: "Univers Gur" },
  { value: "tous", label: "Tous les univers" },
];

export const TRANCHES_AGE = [
  { value: "18-24", label: "18 – 24 ans" },
  { value: "25-34", label: "25 – 34 ans" },
  { value: "35-44", label: "35 – 44 ans" },
  { value: "45-54", label: "45 – 54 ans" },
  { value: "55+", label: "55 ans et +" },
];
