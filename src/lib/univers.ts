// Les 4 univers CLANS, affichés sur la landing et choisis à l'adhésion.
// Icônes fournies par le designer (public/images/univers, 30×30 px sur pastille vert forêt).
export type Univers = {
  id: "aventure" | "rencontres" | "culture" | "reseau";
  titre: string;
  texte: string;
  icone: string;
};

export const UNIVERS: Univers[] = [
  {
    id: "aventure",
    titre: "Aventure",
    texte: "Randonnées, campings, excursions et expériences en pleine nature.",
    icone: "/images/univers/aventure.png",
  },
  {
    id: "rencontres",
    titre: "Rencontres",
    texte:
      "Crée de nouvelles connexions, amicales ou sentimentales, dans un cadre naturel.",
    icone: "/images/univers/rencontres.png",
  },
  {
    id: "culture",
    titre: "Culture",
    texte:
      "Découvre et partage les cultures, traditions, cuisines et histoires africaines.",
    icone: "/images/univers/culture.png",
  },
  {
    id: "reseau",
    titre: "Réseau",
    texte:
      "Rencontres professionnelles, entrepreneurs, créateurs et passionnés réunis autour de CLANS.",
    icone: "/images/univers/reseau.png",
  },
];
