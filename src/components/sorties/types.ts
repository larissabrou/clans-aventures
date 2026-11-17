// Sortie telle qu'affichée par <ListeSorties> (Bon plan et page publique /sorties).
// Préparée côté serveur : dates et prix déjà formatés, informations membres seulement en mode membre.

export type SortieAffichee = {
  id: number;
  titre: string;
  description: string | null;
  conditions: string | null;
  date: string; // « 06 février 2027 — 18:30 »
  lieu: string | null;
  prixTexte: string; // « 20 000 FCFA » ou « Gratuit »
  /** Prix payable en ligne (au moins le minimum de la passerelle). */
  payable: boolean;
  /** Prix existant mais trop bas pour la passerelle : à régler auprès de l'équipe. */
  paiementEquipe: boolean;
  placesRestantes: number | null; // null = sans limite
  typeAction: string | null;
  image: string | null;
  // Réservé à l'espace membre.
  inscrit?: boolean;
  etoiles?: number;
  obligatoire?: boolean;
  penalite?: number;
};

/** Retour de la page Wave (?sortie=…&paiement=retour&ref=…), à relire au chargement. */
export type RetourPaiement = { sortieId: number; reference: string; annule: boolean };
