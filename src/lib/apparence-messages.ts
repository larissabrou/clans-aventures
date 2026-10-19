import {
  Bell,
  CalendarDays,
  Gift,
  Heart,
  Info,
  Megaphone,
  MessageCircle,
  PartyPopper,
  Star,
  Tent,
  TriangleAlert,
  type LucideIcon,
} from "lucide-react";

// Apparence des types de messages : l'admin choisit une couleur et une icône dans ces listes
// (classes Tailwind écrites en entier pour être conservées à la compilation).

export const COULEURS_MESSAGES = {
  neutre: { label: "Neutre", pastille: "bg-white/10 text-white", icone: "bg-white/10 text-ivoire" },
  terre: { label: "Terre", pastille: "bg-terre/40 text-white", icone: "bg-terre/40 text-ivoire" },
  bordeaux: { label: "Bordeaux", pastille: "bg-bordeaux text-white", icone: "bg-bordeaux text-ivoire" },
  sable: { label: "Sable", pastille: "bg-sable/25 text-sable", icone: "bg-sable/25 text-sable" },
  foret: { label: "Forêt", pastille: "bg-foret text-ivoire", icone: "bg-foret text-ivoire" },
} as const;

export const ICONES_MESSAGES = {
  info: { label: "Information", Icone: Info },
  calendrier: { label: "Calendrier", Icone: CalendarDays },
  alerte: { label: "Alerte", Icone: TriangleAlert },
  etoile: { label: "Étoile", Icone: Star },
  cloche: { label: "Cloche", Icone: Bell },
  megaphone: { label: "Annonce", Icone: Megaphone },
  cadeau: { label: "Cadeau", Icone: Gift },
  coeur: { label: "Cœur", Icone: Heart },
  tente: { label: "Tente", Icone: Tent },
  fete: { label: "Fête", Icone: PartyPopper },
  bulle: { label: "Bulle", Icone: MessageCircle },
} satisfies Record<string, { label: string; Icone: LucideIcon }>;

export type CleCouleur = keyof typeof COULEURS_MESSAGES;
export type CleIcone = keyof typeof ICONES_MESSAGES;

export const estCouleur = (cle: string): cle is CleCouleur => cle in COULEURS_MESSAGES;
export const estIcone = (cle: string): cle is CleIcone => cle in ICONES_MESSAGES;

/** Classes et icône d'un type ; valeurs inconnues → apparence neutre. */
export function apparenceMessage(couleur: string | null | undefined, icone: string | null | undefined) {
  const c = couleur && estCouleur(couleur) ? COULEURS_MESSAGES[couleur] : COULEURS_MESSAGES.neutre;
  const i = icone && estIcone(icone) ? ICONES_MESSAGES[icone] : ICONES_MESSAGES.info;
  return { pastille: c.pastille, fondIcone: c.icone, Icone: i.Icone };
}
