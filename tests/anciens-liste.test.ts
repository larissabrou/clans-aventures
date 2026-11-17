import { count } from "drizzle-orm";
import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import { ancienMembres, membres } from "@/lib/db/schema";
import type { LigneBrute } from "@/lib/import-membres/lecture";
import { creerBaseDeTest, viderBase, type BaseDeTest } from "./setup/db";
import { creerMembre } from "./setup/fabriques";

const base = vi.hoisted(() => ({ db: undefined as unknown }));
vi.mock("@/lib/db", () => ({
  get db() {
    return base.db;
  },
}));
vi.mock("@/lib/jobs", () => ({ programmerNotification: vi.fn() }));

const { programmerNotification } = await import("@/lib/jobs");
const { ajouterALaListe, analyserListeAnciens, listeAnciensMembres, supprimerAncienMembre } = await import(
  "@/lib/anciens-membres"
);

let db: BaseDeTest;
let fermer: () => Promise<void>;

beforeAll(async () => {
  ({ db, fermer } = await creerBaseDeTest());
  base.db = db;
});
afterAll(() => fermer());
beforeEach(() => viderBase(db));

let n = 1;
function ligne(valeurs: Partial<Record<string, string | undefined>> = {}): LigneBrute {
  n += 1;
  const complet = { prenom: "Awa", nom: "Koné", email: `ancien${n}@example.com`, telephone: `07070700${String(n).padStart(2, "0")}`, ...valeurs };
  return { ligne: n, valeurs: Object.fromEntries(Object.entries(complet).filter(([, v]) => v !== undefined)) as LigneBrute["valeurs"] };
}

async function raisons(...lignes: LigneBrute[]) {
  return (await analyserListeAnciens(lignes)).refusees.map((r) => r.raison);
}

describe("analyserListeAnciens", () => {
  it("accepte une ligne avec téléphone seulement", async () => {
    const { aAjouter, refusees } = await analyserListeAnciens([ligne({ email: undefined, telephone: "07 07 07 07 07", numero: "350" })]);
    expect(refusees).toEqual([]);
    expect(aAjouter[0]).toMatchObject({ email: null, telephone: "2250707070707", numero: "CLANS-000350" });
  });

  it("exige un e-mail ou un téléphone", async () => {
    expect(await raisons(ligne({ email: undefined, telephone: undefined }))).toEqual(["e-mail ou téléphone obligatoire"]);
  });

  it("exige le prénom et le nom", async () => {
    expect(await raisons(ligne({ nom: undefined }))).toEqual(["champ obligatoire vide : Nom"]);
  });

  it("garde les règles de format de l'import", async () => {
    expect(await raisons(ligne({ email: "x@" }), ligne({ numero: "999500" }), ligne({ dateAdhesion: "31/02/2022" }))).toEqual([
      "e-mail invalide",
      "numéro membre trop grand : CLANS-999500",
      "date d’adhésion invalide : 31/02/2022",
    ]);
  });

  it("refuse un membre du site", async () => {
    await creerMembre(db, { email: "olly@example.com", numero: "CLANS-000007" });
    expect(await raisons(ligne({ email: "OLLY@example.com" }), ligne({ numero: "7" }))).toEqual([
      "déjà membre du site (même e-mail)",
      "numéro déjà attribué : CLANS-000007",
    ]);
  });

  it("refuse un e-mail déjà dans la liste (ligne non utilisée)", async () => {
    await db.insert(ancienMembres).values({ prenom: "A", nom: "B", email: "liste@example.com", telephone: "2250101010101", numero: "CLANS-000020" });
    expect(
      await raisons(ligne({ email: "liste@example.com" }), ligne({ telephone: "0101010101" }), ligne({ numero: "20" })),
    ).toEqual([
      "déjà dans la liste des anciens membres (même e-mail)",
      "déjà dans la liste des anciens membres (même téléphone)",
      "déjà dans la liste des anciens membres (même numéro)",
    ]);
  });

  it("accepte un e-mail d'une ligne déjà utilisée", async () => {
    await db.insert(ancienMembres).values({ prenom: "A", nom: "B", email: "utilise@example.com", utiliseLe: new Date() });
    expect(await raisons(ligne({ email: "utilise@example.com" }))).toEqual([]);
  });

  it("refuse les doublons dans le fichier", async () => {
    const premiere = ligne({ email: "d@example.com" });
    expect(await raisons(premiere, ligne({ email: "D@example.com" }))).toEqual([
      `doublon de la ligne ${premiere.ligne} (même e-mail)`,
    ]);
  });
});

describe("ajouterALaListe", () => {
  it("n'envoie aucun e-mail et ne crée aucun membre", async () => {
    const { aAjouter } = await analyserListeAnciens([ligne(), ligne()]);
    expect(await ajouterALaListe(aAjouter)).toEqual({ ajoutes: 2 });
    const [{ total }] = await db.select({ total: count() }).from(membres);
    expect(total).toBe(0);
    expect(await db.select().from(ancienMembres)).toHaveLength(2);
    expect(programmerNotification).not.toHaveBeenCalled();
  });
});

describe("ajouterALaListe et la numérotation", () => {
  it("place la séquence après les numéros de la liste", async () => {
    await db.execute("select setval('numero_membre_seq', 1, false)");
    const { aAjouter } = await analyserListeAnciens([ligne({ numero: "300" })]);
    await ajouterALaListe(aAjouter);
    const { rows } = await db.execute<{ prochain: string }>(
      "select case when is_called then last_value + 1 else last_value end as prochain from numero_membre_seq",
    );
    expect(Number(rows[0].prochain)).toBe(301);
  });
});

describe("listeAnciensMembres et supprimerAncienMembre", () => {
  it("cherche par nom et par numéro", async () => {
    await db.insert(ancienMembres).values([
      { prenom: "Mariam", nom: "Traoré", email: "m@example.com", numero: "CLANS-000041" },
      { prenom: "Yao", nom: "Kouassi", email: "y@example.com" },
    ]);
    expect((await listeAnciensMembres("traoré")).map((l) => l.prenom)).toEqual(["Mariam"]);
    expect((await listeAnciensMembres("CLANS-000041")).map((l) => l.prenom)).toEqual(["Mariam"]);
    expect(await listeAnciensMembres("")).toHaveLength(2);
  });

  it("refuse de supprimer une ligne utilisée", async () => {
    const [utilisee] = await db.insert(ancienMembres).values({ prenom: "A", nom: "B", email: "u@example.com", utiliseLe: new Date() }).returning();
    const [libre] = await db.insert(ancienMembres).values({ prenom: "C", nom: "D", email: "l@example.com" }).returning();
    await expect(supprimerAncienMembre(utilisee.id)).rejects.toThrow("Cette ligne a déjà servi à une inscription.");
    await supprimerAncienMembre(libre.id);
    expect((await db.select().from(ancienMembres)).map((l) => l.id)).toEqual([utilisee.id]);
  });
});
