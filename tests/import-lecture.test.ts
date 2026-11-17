import ExcelJS from "exceljs";
import { describe, expect, it } from "vitest";
import { ErreurFichier, lireClasseur, modeleExcel } from "@/lib/import-membres/lecture";

const ENTETES = ["Prénom", "Nom", "E-mail", "Téléphone WhatsApp", "Tranche d'âge", "Univers"];

/** Classeur .xlsx en mémoire : en-têtes puis lignes (undefined = ligne vide). */
async function classeur(entetes: string[], lignes: (unknown[] | undefined)[]): Promise<ArrayBuffer> {
  const livre = new ExcelJS.Workbook();
  const feuille = livre.addWorksheet("Membres");
  feuille.addRow(entetes);
  lignes.forEach((valeurs, i) => {
    if (valeurs) feuille.getRow(i + 2).values = valeurs as ExcelJS.CellValue[];
  });
  const octets = await livre.xlsx.writeBuffer();
  return octets as ArrayBuffer;
}

const ligneComplete = ["Awa", "Koné", "awa@example.com", "0707070707", "25-34", "Aventure"];

describe("lireClasseur", () => {
  it("lit les colonnes par leur en-tête, quelle que soit la casse ou l'accent", async () => {
    const lignes = await lireClasseur(
      await classeur(
        ["e-mail", "PRENOM", "nom", "Telephone whatsapp", "tranche d’age", "univers", "Ville"],
        [["awa@example.com", "Awa", "Koné", "0707070707", "25-34", "Aventure", "Abidjan"]],
      ),
    );
    expect(lignes).toEqual([
      {
        ligne: 2,
        valeurs: {
          email: "awa@example.com",
          prenom: "Awa",
          nom: "Koné",
          telephone: "0707070707",
          trancheAge: "25-34",
          univers: "Aventure",
          ville: "Abidjan",
        },
      },
    ]);
  });

  it("numérote les lignes comme Excel et ignore les lignes vides", async () => {
    const lignes = await lireClasseur(await classeur(ENTETES, [ligneComplete, undefined, ligneComplete]));
    expect(lignes.map((l) => l.ligne)).toEqual([2, 4]);
  });

  it("relit un téléphone saisi comme nombre sans son 0 initial", async () => {
    const [ligne] = await lireClasseur(
      await classeur(ENTETES, [["Awa", "Koné", "awa@example.com", 707070707, "25-34", "Aventure"]]),
    );
    expect(ligne.valeurs.telephone).toBe("0707070707");
  });

  it("garde un long numéro saisi comme nombre sans notation scientifique", async () => {
    const [ligne] = await lireClasseur(
      await classeur(ENTETES, [["Awa", "Koné", "awa@example.com", 2250707070707, "25-34", "Aventure"]]),
    );
    expect(ligne.valeurs.telephone).toBe("2250707070707");
  });

  it("lit le texte d'un e-mail transformé en lien", async () => {
    const [ligne] = await lireClasseur(
      await classeur(ENTETES, [
        ["Awa", "Koné", { text: "awa@example.com", hyperlink: "mailto:awa@example.com" }, "0707070707", "25-34", "Aventure"],
      ]),
    );
    expect(ligne.valeurs.email).toBe("awa@example.com");
  });

  it("lit une date d'adhésion en cellule date et en texte", async () => {
    const date = new Date(Date.UTC(2021, 5, 15));
    const lignes = await lireClasseur(
      await classeur(
        [...ENTETES, "Date d'adhésion"],
        [
          [...ligneComplete, date],
          [...ligneComplete, "15/03/2022"],
        ],
      ),
    );
    expect(lignes[0].dateAdhesion?.toISOString().slice(0, 10)).toBe("2021-06-15");
    expect(lignes[1].valeurs.dateAdhesion).toBe("15/03/2022");
    expect(lignes[1].dateAdhesion).toBeUndefined();
  });

  it("refuse une colonne obligatoire absente", async () => {
    const sansEmail = ENTETES.filter((e) => e !== "E-mail");
    await expect(lireClasseur(await classeur(sansEmail, [["Awa"]]))).rejects.toThrow(
      new ErreurFichier("Colonne obligatoire absente : E-mail."),
    );
  });

  it("refuse un fichier qui n'est pas un .xlsx", async () => {
    const texte = new TextEncoder().encode("prenom;nom\nAwa;Koné").buffer as ArrayBuffer;
    await expect(lireClasseur(texte)).rejects.toThrow("Ce fichier n’est pas un fichier Excel (.xlsx) lisible.");
  });

  it("refuse un fichier sans membre", async () => {
    await expect(lireClasseur(await classeur(ENTETES, []))).rejects.toThrow("Le fichier ne contient aucun membre.");
  });

  it("refuse plus de 1 000 membres", async () => {
    const lignes = Array.from({ length: 1001 }, () => ligneComplete);
    await expect(lireClasseur(await classeur(ENTETES, lignes))).rejects.toThrow(
      "Le fichier dépasse 1 000 membres : découpe-le en plusieurs fichiers.",
    );
  });
});

describe("modeleExcel", () => {
  it("se relit sans erreur et contient la feuille des valeurs acceptées", async () => {
    const octets = await modeleExcel({
      tranches: ["18 – 24 ans"],
      univers: ["Aventure"],
      clans: ["Clan des Lions"],
      universCulturels: ["Akan"],
    });
    const livre = new ExcelJS.Workbook();
    await livre.xlsx.load(octets as unknown as ArrayBuffer);
    expect(livre.worksheets.map((f) => f.name)).toEqual(["Membres", "Valeurs acceptées"]);
    const lignes = await lireClasseur(octets.buffer.slice(octets.byteOffset, octets.byteOffset + octets.byteLength) as ArrayBuffer);
    expect(lignes).toHaveLength(1); // la ligne d'exemple
    expect(lignes[0].valeurs.prenom).toBeTruthy();
  });
});
