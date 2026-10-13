import { Compass, Globe, Handshake, Heart, type LucideIcon } from "lucide-react";

// Les 4 univers CLANS, affichés sur la landing et choisis à l'adhésion.
export type Univers = {
  id: "aventure" | "rencontres" | "culture" | "reseau";
  titre: string;
  texte: string;
  Icone: LucideIcon;
};

export const UNIVERS: Univers[] = [
  {
    id: "aventure",
    titre: "Aventure",
    texte: "Randonnées, campings, excursions et expériences en pleine nature.",
    Icone: Compass,
  },
  {
    id: "rencontres",
    titre: "Rencontres",
    texte:
      "Crée de nouvelles connexions, amicales ou sentimentales, dans un cadre naturel.",
    Icone: Heart,
  },
  {
    id: "culture",
    titre: "Culture",
    texte:
      "Découvre et partage les cultures, traditions, cuisines et histoires africaines.",
    Icone: Globe,
  },
  {
    id: "reseau",
    titre: "Réseau",
    texte:
      "Rencontres professionnelles, entrepreneurs, créateurs et passionnés réunis autour de CLANS.",
    Icone: Handshake,
  },
];
