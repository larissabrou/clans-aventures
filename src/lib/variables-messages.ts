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

export type CleVariable = (typeof VARIABLES_MESSAGES)[number]["cle"];
export type ValeursMessage = Record<CleVariable, string>;

/** Remplace chaque {variable} connue ; une variable inconnue est laissée telle quelle (faute de frappe visible). */
export function remplirVariables(texte: string, valeurs: ValeursMessage): string {
  return texte.replace(/\{([a-z_]+)\}/g, (brut, cle: string) =>
    cle in valeurs ? valeurs[cle as CleVariable] : brut,
  );
}

/** Valeurs d'exemple, pour l'aperçu dans l'admin. */
export const VALEURS_EXEMPLE = Object.fromEntries(VARIABLES_MESSAGES.map((v) => [v.cle, v.exemple])) as ValeursMessage;

/** Variables inconnues présentes dans un texte (signalées dans l'admin). */
export function variablesInconnues(texte: string): string[] {
  const connues = new Set<string>(VARIABLES_MESSAGES.map((v) => v.cle));
  return [...new Set([...texte.matchAll(/\{([a-z_]+)\}/g)].map((m) => m[1]).filter((cle) => !connues.has(cle)))];
}
