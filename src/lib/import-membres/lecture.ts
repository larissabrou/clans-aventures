import "server-only";
import ExcelJS from "exceljs";
import { COLONNES, normaliserEntete, type CleColonne } from "./colonnes";

// Lecture du fichier Excel d'import (première feuille, première ligne = en-têtes) et modèle à télécharger.

export const MAX_LIGNES_IMPORT = 1000;

export type LigneBrute = {
  /** Numéro de la ligne dans Excel (2 = première ligne après les en-têtes). */
  ligne: number;
  valeurs: Partial<Record<CleColonne, string>>;
  /** Date d'adhésion saisie dans une cellule date d'Excel. */
  dateAdhesion?: Date;
};

export class ErreurFichier extends Error {}

/** Texte d'une cellule, quel que soit son type (lien, texte enrichi, formule, nombre, date). */
function texteCellule(valeur: ExcelJS.CellValue): string {
  if (valeur === null || valeur === undefined) return "";
  if (typeof valeur === "number") {
    // Pas de notation scientifique pour les longs numéros (2250707070707).
    return Number.isInteger(valeur) ? BigInt(valeur).toString() : String(valeur);
  }
  if (typeof valeur === "string" || typeof valeur === "boolean") return String(valeur);
  if (valeur instanceof Date) return valeur.toISOString();
  if ("richText" in valeur) return valeur.richText.map((morceau) => morceau.text).join("");
  if ("text" in valeur) return texteCellule(valeur.text as ExcelJS.CellValue);
  if ("result" in valeur) return texteCellule(valeur.result as ExcelJS.CellValue);
  return "";
}

export async function lireClasseur(octets: ArrayBuffer): Promise<LigneBrute[]> {
  const livre = new ExcelJS.Workbook();
  try {
    await livre.xlsx.load(octets);
  } catch {
    throw new ErreurFichier("Ce fichier n’est pas un fichier Excel (.xlsx) lisible.");
  }
  const feuille = livre.worksheets[0];
  if (!feuille) throw new ErreurFichier("Ce fichier n’est pas un fichier Excel (.xlsx) lisible.");

  // En-têtes : numéro de colonne Excel → clé connue (les colonnes inconnues sont ignorées).
  const positions = new Map<number, CleColonne>();
  const parEntete = new Map(COLONNES.map((c) => [normaliserEntete(c.entete), c.cle]));
  feuille.getRow(1).eachCell((cellule, colonne) => {
    const cle = parEntete.get(normaliserEntete(texteCellule(cellule.value)));
    if (cle) positions.set(colonne, cle);
  });
  const presentes = new Set(positions.values());
  const manquante = COLONNES.find((c) => c.obligatoire && !presentes.has(c.cle));
  if (manquante) throw new ErreurFichier(`Colonne obligatoire absente : ${manquante.entete}.`);

  const lignes: LigneBrute[] = [];
  feuille.eachRow({ includeEmpty: false }, (rangee, numero) => {
    if (numero === 1) return;
    const ligne: LigneBrute = { ligne: numero, valeurs: {} };
    for (const [colonne, cle] of positions) {
      const valeur = rangee.getCell(colonne).value;
      if (cle === "dateAdhesion" && valeur instanceof Date) {
        ligne.dateAdhesion = valeur;
        continue;
      }
      let texte = texteCellule(valeur).trim();
      // Téléphone tapé comme un nombre : Excel a retiré le 0 initial des numéros ivoiriens (10 chiffres).
      if (cle === "telephone" && typeof valeur === "number" && /^\d{9}$/.test(texte)) texte = `0${texte}`;
      if (texte) ligne.valeurs[cle] = texte;
    }
    if (Object.keys(ligne.valeurs).length > 0 || ligne.dateAdhesion) lignes.push(ligne);
  });

  if (lignes.length === 0) throw new ErreurFichier("Le fichier ne contient aucun membre.");
  if (lignes.length > MAX_LIGNES_IMPORT) {
    throw new ErreurFichier("Le fichier dépasse 1 000 membres : découpe-le en plusieurs fichiers.");
  }
  return lignes;
}

/** Modèle à remplir : feuille « Membres » (en-têtes + exemple) et « Valeurs acceptées ». */
export async function modeleExcel(listes: {
  tranches: string[];
  univers: string[];
  clans: string[];
  universCulturels: string[];
}): Promise<Buffer> {
  const livre = new ExcelJS.Workbook();
  const membres = livre.addWorksheet("Membres");
  membres.columns = COLONNES.map((c) => ({ header: c.entete, key: c.cle, width: 22 }));
  membres.getRow(1).font = { bold: true };
  // Téléphones et numéros en texte : Excel ne retire pas le 0 initial.
  membres.getColumn("telephone").numFmt = "@";
  membres.getColumn("numero").numFmt = "@";
  membres.addRow({
    prenom: "Awa",
    nom: "Koné",
    email: "awa.kone@example.com",
    telephone: "0707070707",
    trancheAge: listes.tranches[0] ?? "",
    univers: listes.univers.slice(0, 2).join(", "),
    ville: "Abidjan",
    universCulturel: listes.universCulturels[0] ?? "",
    attentes: "",
    clan: listes.clans[0] ?? "",
    codeParrainage: "",
    numero: "CLANS-000012",
    dateAdhesion: "15/03/2022",
  });

  const valeurs = livre.addWorksheet("Valeurs acceptées");
  const colonnes: [string, string[]][] = [
    ["Tranche d'âge", listes.tranches],
    ["Univers (séparés par des virgules)", listes.univers],
    ["Clan", listes.clans],
    ["Univers culturel", listes.universCulturels],
  ];
  valeurs.columns = colonnes.map(([entete]) => ({ header: entete, width: 34 }));
  valeurs.getRow(1).font = { bold: true };
  const hauteur = Math.max(...colonnes.map(([, liste]) => liste.length));
  for (let i = 0; i < hauteur; i++) valeurs.addRow(colonnes.map(([, liste]) => liste[i] ?? ""));

  return Buffer.from(await livre.xlsx.writeBuffer());
}
