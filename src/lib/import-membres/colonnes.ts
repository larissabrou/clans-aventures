// Colonnes du fichier Excel d'import des anciens membres (celles de l'inscription, plus le
// numéro membre et la date d'adhésion). Les en-têtes sont reconnus sans casse ni accents.

export type CleColonne =
  | "prenom"
  | "nom"
  | "email"
  | "telephone"
  | "trancheAge"
  | "univers"
  | "ville"
  | "universCulturel"
  | "attentes"
  | "clan"
  | "codeParrainage"
  | "numero"
  | "dateAdhesion";

export const COLONNES: { cle: CleColonne; entete: string; obligatoire: boolean }[] = [
  { cle: "prenom", entete: "Prénom", obligatoire: true },
  { cle: "nom", entete: "Nom", obligatoire: true },
  { cle: "email", entete: "E-mail", obligatoire: true },
  { cle: "telephone", entete: "Téléphone WhatsApp", obligatoire: true },
  { cle: "trancheAge", entete: "Tranche d'âge", obligatoire: true },
  { cle: "univers", entete: "Univers", obligatoire: true },
  { cle: "ville", entete: "Ville", obligatoire: false },
  { cle: "universCulturel", entete: "Univers culturel", obligatoire: false },
  { cle: "attentes", entete: "Attentes", obligatoire: false },
  { cle: "clan", entete: "Clan", obligatoire: false },
  { cle: "codeParrainage", entete: "Code de parrainage", obligatoire: false },
  { cle: "numero", entete: "Numéro membre", obligatoire: false },
  { cle: "dateAdhesion", entete: "Date d'adhésion", obligatoire: false },
];

/** « Tranche d’Âge » → « tranche d'age » : minuscules, sans accents ni espaces superflus. */
export function normaliserEntete(texte: string): string {
  return texte
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[’‘`´]/g, "'")
    .replace(/\s+/g, " ")
    .trim()
    .toLowerCase();
}
