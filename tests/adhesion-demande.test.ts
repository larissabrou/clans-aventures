import { eq } from "drizzle-orm";
import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import { membres, paiements } from "@/lib/db/schema";
import { creerBaseDeTest, viderBase, type BaseDeTest } from "./setup/db";
import { creerMembre } from "./setup/fabriques";

// Non-régression de l'inscription payante : comportement figé avant le partage de son code avec les anciens membres.

const base = vi.hoisted(() => ({ db: undefined as unknown }));
vi.mock("@/lib/db", () => ({
  get db() {
    return base.db;
  },
}));
vi.mock("@/lib/jobs", () => ({ programmerNotification: vi.fn() }));

const { demandeAdhesionSchema, enregistrerDemande } = await import("@/lib/adhesions");

let db: BaseDeTest;
let fermer: () => Promise<void>;

beforeAll(async () => {
  ({ db, fermer } = await creerBaseDeTest());
  base.db = db;
});
afterAll(() => fermer());
beforeEach(() => viderBase(db));

const formulaire = (valeurs: Record<string, unknown> = {}) =>
  demandeAdhesionSchema.parse({
    prenom: "Yao",
    nom: "Kouassi",
    email: "Yao@Example.com",
    telephone: "07 07 07 07 07",
    age: "25-34",
    interets: ["aventure"],
    charteAcceptee: true,
    pays: "CI",
    operateur: "orange",
    telephonePaiement: "0707070707",
    ...valeurs,
  });

const paiement = { reference: "CLANS-ADH-DEMANDE", montant: 500, devise: "XOF", telephone: "2250707070707" };

describe("enregistrerDemande (inscription payante)", () => {
  it("crée la fiche en attente et le paiement", async () => {
    const { membreId } = await enregistrerDemande(formulaire(), paiement);

    const [fiche] = await db.select().from(membres).where(eq(membres.id, membreId));
    expect(fiche).toMatchObject({ statut: "en_attente", email: "yao@example.com", telephone: "2250707070707", numero: null });
    const [ligne] = await db.select().from(paiements).where(eq(paiements.reference, "CLANS-ADH-DEMANDE"));
    expect(ligne).toMatchObject({ membreId, statut: "en_attente", montant: 500 });
  });

  it("refuse une personne déjà membre (même e-mail)", async () => {
    await creerMembre(db, { email: "yao@example.com" });
    await expect(enregistrerDemande(formulaire(), paiement)).rejects.toThrow(
      "Cette adresse email est déjà utilisée par un membre. Connecte-toi à ton espace membre.",
    );
  });

  it("refuse une personne déjà membre (même téléphone)", async () => {
    await creerMembre(db, { telephone: "2250707070707" });
    await expect(enregistrerDemande(formulaire(), paiement)).rejects.toThrow(
      "Ce numéro WhatsApp est déjà membre de CLANS. Connecte-toi à ton espace membre.",
    );
  });
});
