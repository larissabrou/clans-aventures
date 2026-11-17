import ExcelJS from "exceljs";
import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import { ancienMembres, membres } from "@/lib/db/schema";
import { creerBaseDeTest, viderBase, type BaseDeTest } from "./setup/db";

const base = vi.hoisted(() => ({ db: undefined as unknown }));
vi.mock("@/lib/db", () => ({
  get db() {
    return base.db;
  },
}));
vi.mock("@/lib/admin", () => ({ verifierAdmin: vi.fn(async () => ({ id: "admin" })) }));
vi.mock("next/cache", () => ({ refresh: vi.fn() }));
vi.mock("@/lib/jobs", () => ({ programmerNotification: vi.fn() }));

const { programmerNotification } = await import("@/lib/jobs");
const { actionImportMembres } = await import("@/app/admin/(gestion)/membres/import/actions");

let db: BaseDeTest;
let fermer: () => Promise<void>;

beforeAll(async () => {
  ({ db, fermer } = await creerBaseDeTest());
  base.db = db;
});
afterAll(() => fermer());
beforeEach(() => viderBase(db));

/** Fichier du modèle : en-têtes complets, colonnes de l'inscription laissées vides (mode liste). */
async function fichier(): Promise<File> {
  const livre = new ExcelJS.Workbook();
  const feuille = livre.addWorksheet("Membres");
  feuille.addRow(["Prénom", "Nom", "E-mail", "Téléphone WhatsApp", "Tranche d'âge", "Univers", "Numéro membre"]);
  feuille.addRow(["Awa", "Koné", "awa@example.com", "", "", "", "350"]);
  feuille.addRow(["Yao", "Kouassi", "", "0707070707", "", "", ""]);
  feuille.addRow(["Sans", "Contact", "", "", "", "", ""]);
  return new File([await livre.xlsx.writeBuffer()], "anciens.xlsx");
}

async function envoyer(mode: string) {
  const donnees = new FormData();
  donnees.set("mode", mode);
  donnees.set("cible", "liste");
  donnees.set("fichier", await fichier());
  return actionImportMembres({ etape: "choix" }, donnees);
}

describe("actionImportMembres en mode liste", () => {
  it("l'aperçu compte les lignes à ajouter et n'importe aucun membre", async () => {
    const etat = await envoyer("analyser");
    expect(etat).toMatchObject({ etape: "apercu", cible: "liste", aImporter: 2 });
    expect(etat.etape === "apercu" && etat.refusees).toEqual([{ ligne: 4, raison: "e-mail ou téléphone obligatoire" }]);
    expect(await db.select().from(ancienMembres)).toHaveLength(0);
  });

  it("l'ajout remplit la liste sans créer de compte ni envoyer d'e-mail", async () => {
    expect(await envoyer("importer")).toEqual({ etape: "termine", cible: "liste", importes: 2 });
    expect(await db.select().from(ancienMembres)).toHaveLength(2);
    expect(await db.select().from(membres)).toHaveLength(0);
    expect(programmerNotification).not.toHaveBeenCalled();
  });
});
