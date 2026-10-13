// Niveaux de progression d'un membre, selon son nombre d'étoiles.
export type Niveau = {
  nom: string;
  min: number;
  // Seuil du niveau suivant, null pour le dernier niveau.
  suivant: number | null;
};

export const NIVEAUX: Niveau[] = [
  { nom: "Nouveau membre", min: 0, suivant: 10 },
  { nom: "Membre actif", min: 10, suivant: 25 },
  { nom: "Membre engagé", min: 25, suivant: 50 },
  { nom: "Membre confirmé", min: 50, suivant: 100 },
  { nom: "Ambassadeur", min: 100, suivant: 200 },
  { nom: "Excellence", min: 200, suivant: 500 },
  { nom: "Légende", min: 500, suivant: null },
];

export function niveauPour(etoiles: number): Niveau {
  return NIVEAUX.findLast((niveau) => etoiles >= niveau.min) ?? NIVEAUX[0];
}

export function libelleSeuil(niveau: Niveau) {
  return niveau.suivant === null
    ? `${niveau.min}+`
    : `${niveau.min} – ${niveau.suivant - 1}`;
}

export function progression(etoiles: number) {
  const niveau = niveauPour(etoiles);

  if (niveau.suivant === null) {
    return {
      niveau,
      pourcentage: 100,
      message: "Tu as atteint le niveau Légende.",
    };
  }

  const restantes = niveau.suivant - etoiles;
  const pourcentage =
    ((etoiles - niveau.min) / (niveau.suivant - niveau.min)) * 100;

  return {
    niveau,
    pourcentage: Math.min(Math.max(pourcentage, 0), 100),
    message: `Encore ${restantes} étoile${restantes > 1 ? "s" : ""} pour atteindre le prochain niveau.`,
  };
}
