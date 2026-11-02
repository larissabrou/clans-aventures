// Variables des messages de bienvenue : {prenom}, {clan}… remplacées par les informations du membre.
// Module sans accès à la base : utilisé à l'envoi (adhesions.ts) et pour l'aperçu dans l'admin.

export const VARIABLES_MESSAGES = [
  { cle: "prenom", description: "Prénom du membre", exemple: "Aminata" },
  { cle: "nom", description: "Nom du membre", exemple: "KOUASSI" },
  { cle: "numero", description: "Numéro membre", exemple: "CLANS-000012" },
  { cle: "clan", description: "Nom de son clan (« À définir » sans clan)", exemple: "Akan" },
  { cle: "salutation", description: "Salutation de son clan (« Bienvenue » par défaut)", exemple: "AKWABA" },
  { cle: "lien_whatsapp_clan", description: "Lien du groupe WhatsApp de son clan", exemple: "https://chat.whatsapp.com/…" },
  { cle: "groupes_whatsapp", description: "Groupes WhatsApp de ses centres d’intérêt (un par ligne)", exemple: "• CLANS Aventure : https://chat.whatsapp.com/…" },
  { cle: "ville", description: "Ville indiquée à l’inscription", exemple: "Abidjan" },
] as const;

/** Variables en plus pour les modèles de messages envoyés avec une attribution d'étoiles. */
export const VARIABLES_ETOILES = [
  { cle: "action", description: "Type d’action choisi", exemple: "Participation à un camping" },
  { cle: "etoiles", description: "Nombre d’étoiles attribuées", exemple: "10" },
  { cle: "precision", description: "Précision saisie par l’admin (peut être vide)", exemple: "— Camping d’Assinie" },
  { cle: "solde", description: "Nouveau solde d’étoiles du membre", exemple: "35" },
] as const;

export type CleVariable = (typeof VARIABLES_MESSAGES)[number]["cle"];
export type ValeursMessage = Record<CleVariable, string>;

/** Remplace chaque {variable} connue ; une variable inconnue est laissée telle quelle (faute de frappe visible). */
export function remplirVariables(texte: string, valeurs: Partial<Record<string, string>>): string {
  return texte.replace(/\{([a-z_]+)\}/g, (brut, cle: string) =>
    Object.hasOwn(valeurs, cle) ? (valeurs[cle] ?? brut) : brut,
  );
}

/** Valeurs d'exemple, pour l'aperçu dans l'admin. */
export const VALEURS_EXEMPLE = Object.fromEntries(VARIABLES_MESSAGES.map((v) => [v.cle, v.exemple])) as ValeursMessage;
export const VALEURS_EXEMPLE_ETOILES: Record<string, string> = {
  ...VALEURS_EXEMPLE,
  ...Object.fromEntries(VARIABLES_ETOILES.map((v) => [v.cle, v.exemple])),
};

/** Variables inconnues présentes dans un texte (signalées dans l'admin). */
export function variablesInconnues(texte: string, avecEtoiles = false): string[] {
  const connues = new Set<string>([
    ...VARIABLES_MESSAGES.map((v) => v.cle),
    ...(avecEtoiles ? VARIABLES_ETOILES.map((v) => v.cle) : []),
  ]);
  return [...new Set([...texte.matchAll(/\{([a-z_]+)\}/g)].map((m) => m[1]).filter((cle) => !connues.has(cle)))];
}
