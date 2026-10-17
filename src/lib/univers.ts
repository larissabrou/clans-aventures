// Les 4 univers CLANS, affichés sur la landing et choisis à l'adhésion.
// Icônes : composant IconeUnivers (SVG), choisi d'après l'id.
export type Univers = {
  id: "aventure" | "rencontres" | "culture" | "reseau";
  titre: string;
  texte: string;
};

export const UNIVERS: Univers[] = [
  {
    id: "aventure",
    titre: "Aventure",
    texte: "Randonnées, campings, excursions et expériences en pleine nature.",
  },
  {
    id: "rencontres",
    titre: "Rencontres",
    texte:
      "Crée de nouvelles connexions, amicales ou sentimentales, dans un cadre naturel.",
  },
  {
    id: "culture",
    titre: "Culture",
    texte:
      "Découvre et partage les cultures, traditions, cuisines et histoires africaines.",
  },
  {
    id: "reseau",
    titre: "Réseau",
    texte:
      "Rencontres professionnelles, entrepreneurs, créateurs et passionnés réunis autour de CLANS.",
  },
];
