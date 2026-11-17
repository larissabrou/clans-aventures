import { count } from "drizzle-orm";
import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import { clans, membres, universCulturels } from "@/lib/db/schema";
import type { LigneBrute } from "@/lib/import-membres/lecture";
import { creerBaseDeTest, viderBase, type BaseDeTest } from "./setup/db";
import { creerMembre } from "./setup/fabriques";

const base = vi.hoisted(() => ({ db: undefined as unknown }));
vi.mock("@/lib/db", () => ({
  get db() {
    return base.db;
  },
}));

const { analyserImport } = await import("@/lib/import-membres/analyse");

let db: BaseDeTest;
let fermer: () => Promise<void>;

beforeAll(async () => {
  ({ db, fermer } = await creerBaseDeTest());
  base.db = db;
});
afterAll(() => fermer());
beforeEach(async () => {
  await viderBase(db);
  await db.delete(clans);
  await db.delete(universCulturels);
});

let numeroLigne = 1;
/** Ligne valide, modifiable ; `undefined` retire un champ. */
function ligne(valeurs: Partial<Record<string, string | undefined>> = {}, dateAdhesion?: Date): LigneBrute {
  numeroLigne += 1;
  const complet = {
    prenom: "Awa",
    nom: "Koné",
    email: `awa${numeroLigne}@example.com`,
    telephone: `07070700${String(numeroLigne).padStart(2, "0")}`,
    trancheAge: "25-34",
    univers: "aventure",
    ...valeurs,
  };
  const propres = Object.fromEntries(Object.entries(complet).filter(([, v]) => v !== undefined)) as LigneBrute["valeurs"];
  return { ligne: numeroLigne, valeurs: propres, ...(dateAdhesion ? { dateAdhesion } : {}) };
}

async function raisons(...lignes: LigneBrute[]) {
  return (await analyserImport(lignes)).refusees.map((r) => r.raison);
}

describe("analyserImport", () => {
  it("accepte une ligne complète et la convertit", async () => {
    const [clan] = await db.insert(clans).values({ nom: "Clan des Lions" }).returning();
    await db.insert(universCulturels).values({ nom: "Akan" });
    const entree = ligne({
      email: "Awa.Kone@Example.com",
      telephone: "07 07 07 07 07",
      ville: "Abidjan",
      universCulturel: "akan",
      attentes: "Rencontrer du monde",
      clan: "clan des lions",
      numero: "12",
      dateAdhesion: "15/03/2022",
    });

    const { aImporter, refusees } = await analyserImport([entree]);

    expect(refusees).toEqual([]);
    expect(aImporter).toEqual([
      {
        ligne: entree.ligne,
        prenom: "Awa",
        nom: "Koné",
        email: "awa.kone@example.com",
        telephone: "2250707070707",
        trancheAge: "25-34",
        interets: ["aventure"],
        ville: "Abidjan",
        universADecouvrir: "Akan",
        attente: "Rencontrer du monde",
        clanId: clan.id,
        parrain: null,
        numero: "CLANS-000012",
        adhereLe: new Date(Date.UTC(2022, 2, 15)),
      },
    ]);
  });

  it("accepte la tranche d'âge et les univers par leur libellé", async () => {
    const { aImporter } = await analyserImport([ligne({ trancheAge: "25 – 34 ans", univers: "Aventure, rencontres ; Réseau" })]);
    expect(aImporter[0].trancheAge).toBe("25-34");
    expect(aImporter[0].interets).toEqual(["aventure", "rencontres", "reseau"]);
  });

  it("garde la date d'adhésion d'une cellule date", async () => {
    const date = new Date(Date.UTC(2020, 0, 2));
    const { aImporter } = await analyserImport([ligne({}, date)]);
    expect(aImporter[0].adhereLe).toEqual(date);
  });

  it("refuse un champ obligatoire vide", async () => {
    expect(await raisons(ligne({ prenom: undefined }))).toEqual(["champ obligatoire vide : Prénom"]);
  });

  it("refuse un e-mail invalide", async () => {
    expect(await raisons(ligne({ email: "awa@" }))).toEqual(["e-mail invalide"]);
  });

  it("refuse un téléphone invalide", async () => {
    expect(await raisons(ligne({ telephone: "12" }))).toEqual(["téléphone invalide"]);
  });

  it("refuse une tranche d'âge inconnue", async () => {
    expect(await raisons(ligne({ trancheAge: "12 ans" }))).toEqual(["tranche d’âge inconnue : 12 ans"]);
  });

  it("refuse un univers inconnu", async () => {
    expect(await raisons(ligne({ univers: "Aventure, Cuisine" }))).toEqual(["univers inconnu : Cuisine"]);
  });

  it("refuse un clan inconnu", async () => {
    expect(await raisons(ligne({ clan: "Clan fantôme" }))).toEqual(["clan inconnu : Clan fantôme"]);
  });

  it("refuse un univers culturel inconnu", async () => {
    expect(await raisons(ligne({ universCulturel: "Atlantide" }))).toEqual(["univers culturel inconnu : Atlantide"]);
  });

  it("refuse un numéro membre invalide", async () => {
    expect(await raisons(ligne({ numero: "AB-12" }))).toEqual(["numéro membre invalide : AB-12"]);
  });

  it("refuse un numéro trop grand (faute de frappe probable)", async () => {
    expect(await raisons(ligne({ numero: "999500" }))).toEqual(["numéro membre trop grand : CLANS-999500"]);
  });

  it("annonce le prochain numéro attribué en ligne après l'import", async () => {
    await creerMembre(db, { numero: "CLANS-000120" });
    expect((await analyserImport([ligne({ numero: "350" })])).prochainNumero).toBe("CLANS-000351");
    expect((await analyserImport([ligne({ numero: "40" })])).prochainNumero).toBe("CLANS-000121");
  });

  it("refuse une date d'adhésion invalide", async () => {
    expect(await raisons(ligne({ dateAdhesion: "31/02/2022" }))).toEqual(["date d’adhésion invalide : 31/02/2022"]);
  });

  it("refuse un membre du site (même e-mail)", async () => {
    await creerMembre(db, { email: "olly@example.com" });
    expect(await raisons(ligne({ email: "OLLY@example.com" }))).toEqual(["déjà membre du site (même e-mail)"]);
  });

  it("refuse un membre du site (même téléphone)", async () => {
    await creerMembre(db, { telephone: "2250101010101" });
    expect(await raisons(ligne({ telephone: "01 01 01 01 01" }))).toEqual(["déjà membre du site (même téléphone)"]);
  });

  it("refuse un numéro déjà attribué", async () => {
    await creerMembre(db, { numero: "CLANS-000350" });
    expect(await raisons(ligne({ numero: "350" }))).toEqual(["numéro déjà attribué : CLANS-000350"]);
  });

  it("doublons dans le fichier : seule la première occurrence est gardée", async () => {
    const premiere = ligne({ email: "awa@example.com", telephone: "0707070707", numero: "12" });
    const memeEmail = ligne({ email: "AWA@example.com" });
    const memeTelephone = ligne({ telephone: "+225 07 07 07 07 07" });
    const memeNumero = ligne({ numero: "CLANS-000012" });

    const { aImporter, refusees } = await analyserImport([premiere, memeEmail, memeTelephone, memeNumero]);

    expect(aImporter.map((m) => m.ligne)).toEqual([premiere.ligne]);
    expect(refusees).toEqual([
      { ligne: memeEmail.ligne, raison: `doublon de la ligne ${premiere.ligne} (même e-mail)` },
      { ligne: memeTelephone.ligne, raison: `doublon de la ligne ${premiere.ligne} (même téléphone)` },
      { ligne: memeNumero.ligne, raison: `doublon de la ligne ${premiere.ligne} (même numéro)` },
    ]);
  });

  it("parrain membre du site", async () => {
    const parrain = await creerMembre(db, { numero: "CLANS-000007" });
    const { aImporter } = await analyserImport([ligne({ codeParrainage: "7" })]);
    expect(aImporter[0].parrain).toEqual({ id: parrain.id });
  });

  it("parrain trouvé plus haut dans le fichier", async () => {
    const parrain = ligne({ numero: "40" });
    const filleul = ligne({ codeParrainage: "CLANS-000040" });
    const { aImporter } = await analyserImport([parrain, filleul]);
    expect(aImporter[1].parrain).toEqual({ ligne: parrain.ligne });
  });

  it("parrain plus bas dans le fichier : refusé", async () => {
    const filleul = ligne({ codeParrainage: "41" });
    const parrain = ligne({ numero: "41" });
    expect(await raisons(filleul, parrain)).toEqual(["code de parrainage inconnu : 41"]);
  });

  it("une inscription en attente de paiement n'empêche pas l'import", async () => {
    await creerMembre(db, { email: "attente@example.com", statut: "en_attente", numero: null });
    expect(await raisons(ligne({ email: "attente@example.com" }))).toEqual([]);
  });

  it("n'écrit rien en base", async () => {
    await analyserImport([ligne(), ligne({ email: "x" })]);
    const [{ total }] = await db.select({ total: count() }).from(membres);
    expect(total).toBe(0);
  });
});
