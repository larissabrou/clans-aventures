import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import { participations } from "@/lib/db/schema";
import { creerBaseDeTest, viderBase, type BaseDeTest } from "./setup/db";
import { creerMembre, creerSortie } from "./setup/fabriques";

let db: BaseDeTest;
let fermer: () => Promise<void>;

beforeAll(async () => {
  ({ db, fermer } = await creerBaseDeTest());
});
afterAll(() => fermer());
beforeEach(() => viderBase(db));

describe("schéma des sorties", () => {
  it("toutes les migrations s'appliquent", () => {
    expect(db).toBeDefined();
  });

  it("une sortie est publique par défaut", async () => {
    const sortie = await creerSortie(db);
    expect(sortie.publique).toBe(true);
  });

  it("une participation sans membre est acceptée", async () => {
    const sortie = await creerSortie(db);
    const [ligne] = await db
      .insert(participations)
      .values({
        evenementId: sortie.id,
        prenom: "Awa",
        nom: "Koné",
        telephone: "2250707070707",
        email: "awa@example.com",
      })
      .returning();
    expect(ligne.membreId).toBeNull();
    expect(ligne.prenom).toBe("Awa");
  });

  it("un membre ne peut pas être inscrit deux fois", async () => {
    const sortie = await creerSortie(db);
    const membre = await creerMembre(db);
    await db.insert(participations).values({ evenementId: sortie.id, membreId: membre.id });
    await expect(
      db.insert(participations).values({ evenementId: sortie.id, membreId: membre.id }),
    ).rejects.toThrow();
  });
});
