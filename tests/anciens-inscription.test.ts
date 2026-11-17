import { eq } from "drizzle-orm";
import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import { ancienMembres, membres, mouvementsEtoiles } from "@/lib/db/schema";
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
const { demandeAncienSchema } = await import("@/lib/adhesions");
const { inscrireAncienMembre } = await import("@/lib/anciens-membres");

let db: BaseDeTest;
let fermer: () => Promise<void>;

beforeAll(async () => {
  ({ db, fermer } = await creerBaseDeTest());
  base.db = db;
});
afterAll(() => fermer());
beforeEach(async () => {
  await viderBase(db);
  await db.execute("select setval('numero_membre_seq', 1, false)");
  vi.mocked(programmerNotification).mockReset();
});

const formulaire = (valeurs: Record<string, unknown> = {}) =>
  demandeAncienSchema.parse({
    prenom: "Awa",
    nom: "Koné",
    email: "awa@example.com",
    telephone: "07 07 07 07 07",
    age: "25-34",
    interets: ["aventure"],
    charteAcceptee: true,
    ...valeurs,
  });

const ligneListe = async (valeurs: Partial<typeof ancienMembres.$inferInsert> = {}) =>
  (await db.insert(ancienMembres).values({ prenom: "Awa", nom: "Koné", ...valeurs }).returning())[0];

const parEmail = async (email: string) => (await db.select().from(membres).where(eq(membres.email, email)))[0];

describe("inscrireAncienMembre", () => {
  it("active un ancien reconnu par e-mail avec son ancien numéro et sa date", async () => {
    const date = new Date(Date.UTC(2021, 5, 15));
    const ligne = await ligneListe({ email: "awa@example.com", numero: "CLANS-000350", adhereLe: date });

    const resultat = await inscrireAncienMembre(formulaire());

    expect(resultat.resultat).toBe("active");
    const membre = await parEmail("awa@example.com");
    expect(membre).toMatchObject({ statut: "membre", numero: "CLANS-000350", adhereLe: date });
    const [apres] = await db.select().from(ancienMembres).where(eq(ancienMembres.id, ligne.id));
    expect(apres).toMatchObject({ membreId: membre.id, reconnuPar: "email", emailSaisi: "awa@example.com" });
    expect(apres.utiliseLe).not.toBeNull();
    const appels = vi.mocked(programmerNotification).mock.calls;
    expect(appels.map(([tache]) => tache.modele)).toEqual(["acces", "bienvenue"]);
    expect(appels[1][1]).toBe(3 * 3600);
  });

  it("reconnaît par téléphone quand l'e-mail diffère", async () => {
    const ligne = await ligneListe({ telephone: "2250707070707" });

    expect((await inscrireAncienMembre(formulaire({ email: "nouvelle@example.com" }))).resultat).toBe("active");

    const [apres] = await db.select().from(ancienMembres).where(eq(ancienMembres.id, ligne.id));
    expect(apres).toMatchObject({ reconnuPar: "telephone", emailSaisi: "nouvelle@example.com" });
    expect((await parEmail("nouvelle@example.com")).statut).toBe("membre");
  });

  it("inconnu : rien n'est créé", async () => {
    await ligneListe({ email: "autre@example.com" });
    expect(await inscrireAncienMembre(formulaire())).toEqual({ resultat: "inconnu" });
    expect(await db.select().from(membres)).toHaveLength(0);
    expect(programmerNotification).not.toHaveBeenCalled();
  });

  it("ligne déjà utilisée : inconnu", async () => {
    await ligneListe({ email: "awa@example.com", utiliseLe: new Date() });
    expect(await inscrireAncienMembre(formulaire())).toEqual({ resultat: "inconnu" });
  });

  it("deux inscriptions simultanées de la même ligne : une seule activation", async () => {
    await ligneListe({ email: "awa@example.com" });

    const resultats = await Promise.allSettled([inscrireAncienMembre(formulaire()), inscrireAncienMembre(formulaire())]);

    const actives = resultats.filter((r) => r.status === "fulfilled" && r.value.resultat === "active");
    expect(actives).toHaveLength(1);
    const autre = resultats.find((r) => !(r.status === "fulfilled" && r.value.resultat === "active"));
    // La seconde voit soit la ligne déjà utilisée (inconnu), soit la personne déjà membre (refus).
    if (autre?.status === "rejected") {
      expect(String(autre.reason)).toMatch(/déjà (membre|utilisée)/);
    } else {
      expect(autre?.value).toEqual({ resultat: "inconnu" });
    }
    expect((await db.select().from(membres)).filter((m) => m.statut === "membre")).toHaveLength(1);
  });

  it("e-mail de la ligne A et téléphone de la ligne B : la ligne A est utilisée", async () => {
    const a = await ligneListe({ email: "awa@example.com" });
    const b = await ligneListe({ prenom: "Yao", telephone: "2250707070707" });

    await inscrireAncienMembre(formulaire());

    const lignes = await db.select().from(ancienMembres);
    expect(lignes.find((l) => l.id === a.id)?.utiliseLe).not.toBeNull();
    expect(lignes.find((l) => l.id === b.id)?.utiliseLe).toBeNull();
  });

  it("numéro de la ligne déjà pris : nouveau numéro attribué", async () => {
    await creerMembre(db, { numero: "CLANS-000350", email: "pris@example.com", telephone: "2250101010101" });
    await ligneListe({ email: "awa@example.com", numero: "CLANS-000350" });
    const erreurs = vi.spyOn(console, "warn").mockImplementation(() => {});

    expect((await inscrireAncienMembre(formulaire())).resultat).toBe("active");

    expect((await parEmail("awa@example.com")).numero).toBe("CLANS-000001");
    erreurs.mockRestore();
  });

  it("personne déjà membre : refus, ligne non consommée", async () => {
    await creerMembre(db, { email: "awa@example.com", telephone: "2250101010101" });
    const ligne = await ligneListe({ email: "awa@example.com" });

    await expect(inscrireAncienMembre(formulaire())).rejects.toThrow(
      "Cette adresse email est déjà utilisée par un membre. Connecte-toi à ton espace membre.",
    );
    const [apres] = await db.select().from(ancienMembres).where(eq(ancienMembres.id, ligne.id));
    expect(apres.utiliseLe).toBeNull();
  });

  it("pas d'étoiles pour le parrain", async () => {
    await creerMembre(db, { numero: "CLANS-000007", email: "parrain@example.com", telephone: "2250101010101" });
    await ligneListe({ email: "awa@example.com" });

    await inscrireAncienMembre(formulaire({ codeParrainage: "7" }));

    expect(await db.select().from(mouvementsEtoiles)).toHaveLength(0);
  });
});
