import { CalendarDays, Info, Star, TriangleAlert, type LucideIcon } from "lucide-react";
import type { Message } from "./messages-context";

/** Libellé, icône et couleurs de chaque type de message (sur le fond sombre de l'espace membre). */
export const TYPES_MESSAGES: Record<
  Message["type"],
  { label: string; pluriel: string; Icone: LucideIcon; pastille: string; icone: string }
> = {
  info: { label: "Information", pluriel: "Informations", Icone: Info, pastille: "bg-white/10 text-white", icone: "bg-white/10 text-ivoire" },
  event: { label: "Événement", pluriel: "Événements", Icone: CalendarDays, pastille: "bg-terre/40 text-white", icone: "bg-terre/40 text-ivoire" },
  warning: { label: "Important", pluriel: "Importants", Icone: TriangleAlert, pastille: "bg-bordeaux text-white", icone: "bg-bordeaux text-ivoire" },
  star: { label: "Étoiles", pluriel: "Étoiles", Icone: Star, pastille: "bg-sable/25 text-sable", icone: "bg-sable/25 text-sable" },
};
