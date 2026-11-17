import { and, eq } from "drizzle-orm";
import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import { messages, messagesBienvenue, membres, paiements } from "@/lib/db/schema";
import { creerBaseDeTest, viderBase, type BaseDeTest } from "./setup/db";
import { creerMembre } from "./setup/fabriques";

// Non-régression de l'adhésion en ligne : comportement figé avant le partage de son code avec l'import.

const base = vi.hoisted(() => ({ db: undefined as unknown }));
vi.mock("@/lib/db", () => ({
  get db() {
    return base.db;
  },
}));
vi.mock("@/lib/jobs", () => ({ programmerNotification: vi.fn() }));

const { programmerNotification } = await import("@/lib/jobs");
const { confirmerPaiement } = await import("@/lib/adhesions");

let db: BaseDeTest;
let fermer: () => Promise<void>;

beforeAll(async () => {
  ({ db, fermer } = await creerBaseDeTest());
  base.db = db;
});
afterAll(() => fermer());
beforeEach(async () => {
  await viderBase(db);
  // TRUNCATE ne remet pas la séquence des numéros à zéro.
  await db.execute("select setval('numero_membre_seq', 1, false)");
  vi.mocked(programmerNotification).mockReset();
});

describe("confirmerPaiement (adhésion en ligne)", () => {
  it("saute un numéro déjà pris si la séquence est en retard", async () => {
    // Séquence repartie de 1 alors que CLANS-000001 et CLANS-000002 existent déjà (import, course…).
    await db.execute("select setval('numero_membre_seq', 1, false)");
    await creerMembre(db, { numero: "CLANS-000001" });
    await creerMembre(db, { numero: "CLANS-000002" });
    const nouveau = await creerMembre(db, { statut: "en_attente", numero: null, email: "suivant@example.com" });
    await db.insert(paiements).values({
      reference: "CLANS-ADH-RETARD",
      membreId: nouveau.id,
      montant: 500,
      devise: "XOF",
      operateur: "orange",
      pays: "CI",
      telephone: "2250101010101",
    });

    expect((await confirmerPaiement("CLANS-ADH-RETARD")).resultat).toBe("confirme");
    const [membre] = await db.select().from(membres).where(eq(membres.id, nouveau.id));
    expect(membre.numero).toBe("CLANS-000003");
  });

  it("ne réactive pas une personne déjà membre (importée entre-temps)", async () => {
    const membre = await creerMembre(db, { numero: "CLANS-000350", motDePasseHash: "scrypt$sel$empreinte" });
    await db.insert(paiements).values({
      reference: "CLANS-ADH-TARDIF",
      membreId: membre.id,
      montant: 500,
      devise: "XOF",
      operateur: "orange",
      pays: "CI",
      telephone: "2250101010101",
    });
    const erreurs = vi.spyOn(console, "error").mockImplementation(() => {});

    const resultat = await confirmerPaiement("CLANS-ADH-TARDIF", 500);

    expect(resultat).toEqual({ resultat: "deja_confirme", membreId: membre.id });
    const [apres] = await db.select().from(membres).where(eq(membres.id, membre.id));
    expect(apres.motDePasseHash).toBe("scrypt$sel$empreinte");
    expect(programmerNotification).not.toHaveBeenCalled();
    expect(await db.select().from(messages).where(eq(messages.membreId, membre.id))).toHaveLength(0);
    expect(erreurs).toHaveBeenCalled();
    erreurs.mockRestore();
  });

  it("attribue un numéro, envoie acces et bienvenue, dépose les messages de bienvenue et prévient le parrain", async () => {
    const parrain = await creerMembre(db, { numero: "CLANS-000900" });
    const filleul = await creerMembre(db, {
      statut: "en_attente",
      numero: null,
      prenom: "Yao",
      nom: "Kouassi",
      email: "yao@example.com",
      parrainId: parrain.id,
    });
    await db.insert(paiements).values({
      reference: "CLANS-ADH-TEST",
      membreId: filleul.id,
      montant: 500,
      devise: "XOF",
      operateur: "orange",
      pays: "CI",
      telephone: "2250101010101",
    });

    const resultat = await confirmerPaiement("CLANS-ADH-TEST", 500);

    expect(resultat).toEqual({ resultat: "confirme", membreId: filleul.id });
    const [membre] = await db.select().from(membres).where(eq(membres.id, filleul.id));
    expect(membre.statut).toBe("membre");
    expect(membre.numero).toBe("CLANS-000001");
    expect(membre.adhereLe).not.toBeNull();
    expect(membre.motDePasseHash).toMatch(/^scrypt\$/);

    const appels = vi.mocked(programmerNotification).mock.calls;
    expect(appels).toHaveLength(2);
    expect(appels[0][0]).toMatchObject({ modele: "acces", email: "yao@example.com", prenom: "Yao", numero: "CLANS-000001" });
    expect(appels[1]).toEqual([{ modele: "bienvenue", email: "yao@example.com", prenom: "Yao" }, 3 * 3600]);

    const actifs = await db.select().from(messagesBienvenue).where(eq(messagesBienvenue.actif, true));
    const boite = await db.select().from(messages).where(eq(messages.membreId, filleul.id));
    expect(boite).toHaveLength(actifs.length);

    const pourParrain = await db
      .select()
      .from(messages)
      .where(and(eq(messages.membreId, parrain.id), eq(messages.titre, "Ton filleul a rejoint CLANS !")));
    expect(pourParrain).toHaveLength(1);
  });
});
