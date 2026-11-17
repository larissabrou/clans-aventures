import "server-only";
import type { RetourPaiement, SortieAffichee } from "@/components/sorties/types";
import { formatFcfa } from "./adhesion";
import { urlImageEvenement } from "./images";
import { formaterDateHeure } from "./membres";
import { PREFIXE_REFERENCE_SORTIE } from "./paiement/gateway";
import { paiementEnLignePossible } from "./sorties";

// Prépare côté serveur les sorties affichées par <ListeSorties> (Bon plan et /sorties).

type LigneSortie = {
  id: number;
  titre: string;
  description: string | null;
  conditions: string | null;
  date: Date;
  lieu: string | null;
  prix: number | null;
  places: number | null;
  inscrits: number;
  typeAction: string | null;
  imageMaj: Date | null;
};

export function versAffichage(ligne: LigneSortie): SortieAffichee {
  return {
    id: ligne.id,
    titre: ligne.titre,
    description: ligne.description,
    conditions: ligne.conditions,
    date: formaterDateHeure(ligne.date),
    lieu: ligne.lieu,
    prixTexte: ligne.prix ? `${formatFcfa(ligne.prix)} FCFA` : "Gratuit",
    payable: paiementEnLignePossible(ligne.prix),
    paiementEquipe: ligne.prix !== null && ligne.prix > 0 && !paiementEnLignePossible(ligne.prix),
    placesRestantes: ligne.places === null ? null : Math.max(ligne.places - ligne.inscrits, 0),
    typeAction: ligne.typeAction,
    image: urlImageEvenement(ligne.id, ligne.imageMaj),
  };
}

type Parametres = Record<string, string | string[] | undefined>;

/** Sortie à ouvrir (?sortie=12) et éventuel retour de la page Wave (?paiement=retour&ref=…). */
export function lireParametresSorties(parametres: Parametres): { selection?: number; retour?: RetourPaiement } {
  const texte = (cle: string) => (typeof parametres[cle] === "string" ? (parametres[cle] as string) : undefined);
  const sortie = texte("sortie");
  const selection = sortie && /^\d{1,10}$/.test(sortie) ? Number(sortie) : undefined;
  const reference = texte("ref");
  const retour =
    selection !== undefined && texte("paiement") === "retour" && reference?.startsWith(PREFIXE_REFERENCE_SORTIE)
      ? { sortieId: selection, reference, annule: texte("annule") === "1" }
      : undefined;
  return { selection, retour };
}
