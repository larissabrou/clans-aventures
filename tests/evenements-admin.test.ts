import { eq } from "drizzle-orm";
import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import { mouvementsEtoiles, paiementsSorties, participations, typesActions } from "@/lib/db/schema";
import { creerBaseDeTest, viderBase, type BaseDeTest } from "./setup/db";
import { creerMembre, creerSortie } from "./setup/fabriques";

const base = vi.hoisted(() => ({ db: undefined as unknown }));
vi.mock("@/lib/db", () => ({
  get db() {
    return base.db;
  },
}));

const { evenementDetail, marquerPresence, supprimerEvenement } = await import("@/lib/evenements");

let db: BaseDeTest;
let fermer: () => Promise<void>;

beforeAll(async () => {
  ({ db, fermer } = await creerBaseDeTest());
  base.db = db;
});
afterAll(() => fermer());
beforeEach(() => viderBase(db));

async function sortieAvecEtoiles() {
  const [action] = await db.insert(typesActions).values({ nom: "Camping test", etoiles: 3 }).returning();
  return creerSortie(db, { typeActionId: action.id });
}

describe("administration des sorties", () => {
  it("marquer présent un non-membre ne crée aucun mouvement d'étoiles", async () => {
    const sortie = await sortieAvecEtoiles();
    const [inscription] = await db
      .insert(participations)
      .values({ evenementId: sortie.id, prenom: "Awa", nom: "Koné" })
      .returning();

    await marquerPresence(inscription.id, true);

    const [ligne] = await db.select().from(participations).where(eq(participations.id, inscription.id));
    expect(ligne.present).toBe(true);
    expect(await db.select().from(mouvementsEtoiles)).toHaveLength(0);
  });

  it("marquer présent un membre lui donne toujours ses étoiles", async () => {
    const sortie = await sortieAvecEtoiles();
    const membre = await creerMembre(db);
    const [inscription] = await db.insert(participations).values({ evenementId: sortie.id, membreId: membre.id }).returning();

    await marquerPresence(inscription.id, true);

    const mouvements = await db.select().from(mouvementsEtoiles);
    expect(mouvements).toHaveLength(1);
    expect(mouvements[0]).toMatchObject({ membreId: membre.id, variation: 3 });
  });

  it("evenementDetail liste membres et non-membres", async () => {
    const sortie = await creerSortie(db);
    const membre = await creerMembre(db, { prenom: "Olly", nom: "Angba" });
    await db.insert(participations).values([
      { evenementId: sortie.id, membreId: membre.id },
      {
        evenementId: sortie.id,
        prenom: "Awa",
        nom: "Koné",
        telephone: "2250101010101",
        email: "awa@example.com",
        paiementReference: "CLANS-EVT-1",
      },
    ]);

    const detail = await evenementDetail(sortie.id);

    expect(detail?.participants).toHaveLength(2);
    const awa = detail?.participants.find((p) => p.prenom === "Awa");
    expect(awa).toMatchObject({ membre: false, numero: null, email: "awa@example.com", paiementReference: "CLANS-EVT-1" });
    const olly = detail?.participants.find((p) => p.prenom === "Olly");
    expect(olly).toMatchObject({ membre: true, numero: membre.numero, telephone: membre.telephone });
  });

  it("supprimer une sortie avec des paiements réussis exige la confirmation", async () => {
    const sortie = await creerSortie(db);
    await db.insert(paiementsSorties).values({
      reference: "CLANS-EVT-1",
      evenementId: sortie.id,
      evenementTitre: sortie.titre,
      evenementDate: sortie.date,
      montant: 20000,
      devise: "XOF",
      operateur: "orange",
      pays: "CI",
      telephoneDebite: "2250101010101",
      statut: "reussi",
    });

    await expect(supprimerEvenement(sortie.id)).rejects.toThrow(
      "Des participants ont payé en ligne : confirme la suppression.",
    );
    expect(await evenementDetail(sortie.id)).not.toBeNull();

    await supprimerEvenement(sortie.id, true);

    expect(await evenementDetail(sortie.id)).toBeNull();
    const [paiement] = await db.select().from(paiementsSorties);
    expect(paiement.evenementId).toBeNull();
    expect(paiement.evenementTitre).toBe("Notre Night Clans");
  });

  it("supprimer une sortie sans paiement en ligne ne demande rien", async () => {
    const sortie = await creerSortie(db);
    await supprimerEvenement(sortie.id);
    expect(await evenementDetail(sortie.id)).toBeNull();
  });
});
