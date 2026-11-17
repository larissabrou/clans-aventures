import { eq } from "drizzle-orm";
import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import { messages, messagesBienvenue, membres, mouvementsEtoiles, paiements } from "@/lib/db/schema";
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
const { confirmerPaiement } = await import("@/lib/adhesions");
const { analyserImport } = await import("@/lib/import-membres/analyse");
const { importerMembres } = await import("@/lib/import-membres/import");

let db: BaseDeTest;
let fermer: () => Promise<void>;

beforeAll(async () => {
  ({ db, fermer } = await creerBaseDeTest());
  base.db = db;
});
afterAll(() => fermer());
beforeEach(async () => {
  await viderBase(db);
  // La séquence des numéros n'est pas remise à zéro par TRUNCATE : on la repart de 1.
  await db.execute("select setval('numero_membre_seq', 1, false)");
  vi.mocked(programmerNotification).mockReset();
});

let n = 1;
function ligne(valeurs: Record<string, string> = {}): LigneBrute {
  n += 1;
  return {
    ligne: n,
    valeurs: {
      prenom: "Awa",
      nom: "Koné",
      email: `awa${n}@example.com`,
      telephone: `07070700${String(n).padStart(2, "0")}`,
      trancheAge: "25-34",
      univers: "aventure",
      ...valeurs,
    },
  };
}

async function importer(...lignes: LigneBrute[]) {
  const { aImporter, refusees } = await analyserImport(lignes);
  expect(refusees).toEqual([]);
  return importerMembres(aImporter);
}

const parEmail = async (email: string) => (await db.select().from(membres).where(eq(membres.email, email)))[0];

describe("importerMembres", () => {
  it("importe un membre avec son ancien numéro et sa date d'adhésion", async () => {
    const entree = ligne({ numero: "350", dateAdhesion: "15/03/2022" });

    expect(await importer(entree)).toEqual({ importes: 1 });

    const membre = await parEmail(entree.valeurs.email as string);
    expect(membre.statut).toBe("membre");
    expect(membre.numero).toBe("CLANS-000350");
    expect(membre.adhereLe).toEqual(new Date(Date.UTC(2022, 2, 15)));
    expect(membre.charteAccepteeLe).not.toBeNull();
    expect(membre.motDePasseHash).toMatch(/^scrypt\$/);
    expect(membre.interets).toEqual(["aventure"]);
  });

  it("attribue un nouveau numéro après le plus grand numéro existant, pour l'import et l'adhésion en ligne", async () => {
    const ancien = ligne({ numero: "350" });
    const sansNumero = ligne();
    await importer(ancien, sansNumero);
    expect((await parEmail(sansNumero.valeurs.email as string)).numero).toBe("CLANS-000351");

    const nouveau = await creerMembre(db, { statut: "en_attente", numero: null, email: "nouveau@example.com" });
    await db.insert(paiements).values({
      reference: "CLANS-ADH-SEQ",
      membreId: nouveau.id,
      montant: 500,
      devise: "XOF",
      operateur: "orange",
      pays: "CI",
      telephone: "2250101010101",
    });
    await confirmerPaiement("CLANS-ADH-SEQ");
    expect((await parEmail("nouveau@example.com")).numero).toBe("CLANS-000352");
  });

  it("envoie acces puis bienvenue à 3 h et dépose les messages de bienvenue", async () => {
    const entree = ligne({ prenom: "Mariam", numero: "12" });
    await importer(entree);

    const appels = vi.mocked(programmerNotification).mock.calls;
    expect(appels).toHaveLength(2);
    expect(appels[0][0]).toMatchObject({ modele: "acces", email: entree.valeurs.email, prenom: "Mariam", numero: "CLANS-000012" });
    expect(appels[1]).toEqual([{ modele: "bienvenue", email: entree.valeurs.email, prenom: "Mariam" }, 3 * 3600]);

    const membre = await parEmail(entree.valeurs.email as string);
    const actifs = await db.select().from(messagesBienvenue).where(eq(messagesBienvenue.actif, true));
    expect(await db.select().from(messages).where(eq(messages.membreId, membre.id))).toHaveLength(actifs.length);
  });

  it("garde le parrain sans lui donner d'étoiles", async () => {
    const parrainSite = await creerMembre(db, { numero: "CLANS-000007" });
    const parrainFichier = ligne({ numero: "40" });
    const filleul1 = ligne({ codeParrainage: "7" });
    const filleul2 = ligne({ codeParrainage: "40" });

    await importer(parrainFichier, filleul1, filleul2);

    const parrainImporte = await parEmail(parrainFichier.valeurs.email as string);
    expect((await parEmail(filleul1.valeurs.email as string)).parrainId).toBe(parrainSite.id);
    expect((await parEmail(filleul2.valeurs.email as string)).parrainId).toBe(parrainImporte.id);
    expect(await db.select().from(mouvementsEtoiles)).toHaveLength(0);
    // Pas de message « Ton filleul a rejoint CLANS ! » non plus.
    expect(await db.select().from(messages).where(eq(messages.membreId, parrainSite.id))).toHaveLength(0);
  });

  it("remplace une inscription en attente de paiement", async () => {
    const attente = await creerMembre(db, { statut: "en_attente", numero: null, email: "attente@example.com" });
    await importer(ligne({ email: "attente@example.com", prenom: "Nouveau" }));

    const lignes = await db.select().from(membres).where(eq(membres.email, "attente@example.com"));
    expect(lignes).toHaveLength(1);
    expect(lignes[0].id).toBe(attente.id);
    expect(lignes[0].statut).toBe("membre");
    expect(lignes[0].prenom).toBe("Nouveau");
  });

  it("annule le paiement en attente d'une inscription remplacée", async () => {
    const attente = await creerMembre(db, { statut: "en_attente", numero: null, email: "paie@example.com" });
    await db.insert(paiements).values({
      reference: "CLANS-ADH-REMPLACE",
      membreId: attente.id,
      montant: 500,
      devise: "XOF",
      operateur: "orange",
      pays: "CI",
      telephone: "2250101010101",
    });

    await importer(ligne({ email: "paie@example.com" }));

    const [paiement] = await db.select().from(paiements).where(eq(paiements.reference, "CLANS-ADH-REMPLACE"));
    expect(paiement.statut).toBe("annule");
  });

  it("réimporter le même fichier refuse toutes les lignes et n'envoie rien", async () => {
    const fichier = [ligne({ numero: "60" }), ligne()];
    await importer(...fichier);
    vi.mocked(programmerNotification).mockReset();

    const second = await analyserImport(fichier);

    expect(second.aImporter).toEqual([]);
    expect(second.refusees.map((r) => r.raison)).toEqual([
      "déjà membre du site (même e-mail)",
      "déjà membre du site (même e-mail)",
    ]);
    expect(await importerMembres(second.aImporter)).toEqual({ importes: 0 });
    expect(programmerNotification).not.toHaveBeenCalled();
  });
});
