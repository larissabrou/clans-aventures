import { eq } from "drizzle-orm";
import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import { paiementsSorties, participations } from "@/lib/db/schema";
import { creerBaseDeTest, viderBase, type BaseDeTest } from "./setup/db";
import { creerMembre, creerSortie } from "./setup/fabriques";

// Le code testé utilise la base en mémoire à la place de PostgreSQL.
const base = vi.hoisted(() => ({ db: undefined as unknown }));
vi.mock("@/lib/db", () => ({
  get db() {
    return base.db;
  },
}));

const { enregistrerPaiementSortie, sortiesPubliques } = await import("@/lib/sorties");

let db: BaseDeTest;
let fermer: () => Promise<void>;
let compteur = 0;

beforeAll(async () => {
  ({ db, fermer } = await creerBaseDeTest());
  base.db = db;
});
afterAll(() => fermer());
beforeEach(() => viderBase(db));

const nonMembre = {
  prenom: "Awa",
  nom: "Koné",
  email: "awa@example.com",
  telephone: "2250101010101",
};

function paiement() {
  compteur += 1;
  return {
    reference: `CLANS-EVT-TEST${compteur}`,
    operateur: "orange",
    pays: "CI",
    telephoneDebite: "0101010101",
  };
}

const ilYA = (minutes: number) => new Date(Date.now() - minutes * 60 * 1000);

describe("enregistrerPaiementSortie", () => {
  it("enregistre un paiement en attente avec le prix de la sortie", async () => {
    const sortie = await creerSortie(db, { prix: 20000 });
    const p = paiement();
    const resultat = await enregistrerPaiementSortie(sortie.id, nonMembre, p);

    expect(resultat).toEqual({ montant: 20000, titre: "Notre Night Clans" });
    const [ligne] = await db.select().from(paiementsSorties).where(eq(paiementsSorties.reference, p.reference));
    expect(ligne.statut).toBe("en_attente");
    expect(ligne.montant).toBe(20000);
    expect(ligne.evenementTitre).toBe("Notre Night Clans");
    expect(ligne.prenom).toBe("Awa");
    expect(ligne.membreId).toBeNull();
  });

  it("refuse une sortie introuvable", async () => {
    await expect(enregistrerPaiementSortie(9999, nonMembre, paiement())).rejects.toThrow(
      "Cette sortie n’existe plus.",
    );
  });

  it("refuse une sortie passée", async () => {
    const sortie = await creerSortie(db, { date: ilYA(60) });
    await expect(enregistrerPaiementSortie(sortie.id, nonMembre, paiement())).rejects.toThrow(
      "Cette sortie est déjà passée.",
    );
  });

  it("refuse un non-membre sur une sortie réservée aux membres", async () => {
    const sortie = await creerSortie(db, { publique: false });
    await expect(enregistrerPaiementSortie(sortie.id, nonMembre, paiement())).rejects.toThrow(
      "Cette sortie est réservée aux membres.",
    );
  });

  it("accepte un membre sur une sortie réservée aux membres", async () => {
    const sortie = await creerSortie(db, { publique: false });
    const membre = await creerMembre(db);
    await expect(enregistrerPaiementSortie(sortie.id, { membreId: membre.id }, paiement())).resolves.toBeDefined();
  });

  it("refuse le paiement en ligne sous le montant minimum", async () => {
    const sortie = await creerSortie(db, { prix: 300 });
    await expect(enregistrerPaiementSortie(sortie.id, nonMembre, paiement())).rejects.toThrow(
      "Le paiement en ligne n’est pas disponible pour cette sortie.",
    );
  });

  it("refuse une sortie gratuite", async () => {
    const sortie = await creerSortie(db, { prix: null });
    await expect(enregistrerPaiementSortie(sortie.id, nonMembre, paiement())).rejects.toThrow(
      "Le paiement en ligne n’est pas disponible pour cette sortie.",
    );
  });

  it("refuse un membre déjà inscrit", async () => {
    const sortie = await creerSortie(db);
    const membre = await creerMembre(db);
    await db.insert(participations).values({ evenementId: sortie.id, membreId: membre.id });
    await expect(enregistrerPaiementSortie(sortie.id, { membreId: membre.id }, paiement())).rejects.toThrow(
      "Tu es déjà inscrit à cette sortie.",
    );
  });

  it("refuse un membre qui a déjà un paiement en cours pour cette sortie", async () => {
    const sortie = await creerSortie(db);
    const membre = await creerMembre(db);
    await enregistrerPaiementSortie(sortie.id, { membreId: membre.id }, paiement());
    await expect(enregistrerPaiementSortie(sortie.id, { membreId: membre.id }, paiement())).rejects.toThrow(
      "Un paiement est déjà en cours pour cette sortie.",
    );
  });

  it("refuse un non-membre dont l'e-mail est celui d'un membre", async () => {
    const sortie = await creerSortie(db);
    await creerMembre(db, { email: "Olly@Example.com" });
    await expect(
      enregistrerPaiementSortie(sortie.id, { ...nonMembre, email: "olly@example.com" }, paiement()),
    ).rejects.toThrow("Tu es déjà membre : connecte-toi pour payer depuis ton espace.");
  });

  it("reconnaît le téléphone +225 07 07 07 07 07 d'un membre", async () => {
    const sortie = await creerSortie(db);
    await creerMembre(db, { telephone: "2250707070707" });
    await expect(
      enregistrerPaiementSortie(sortie.id, { ...nonMembre, telephone: "+225 07 07 07 07 07" }, paiement()),
    ).rejects.toThrow("Tu es déjà membre : connecte-toi pour payer depuis ton espace.");
  });

  it("refuse une sortie complète", async () => {
    const sortie = await creerSortie(db, { places: 1 });
    await db.insert(participations).values({ evenementId: sortie.id, ...nonMembre });
    await expect(enregistrerPaiementSortie(sortie.id, nonMembre, paiement())).rejects.toThrow(
      "Cette sortie est complète.",
    );
  });

  it("réserve la dernière place pendant un paiement en cours", async () => {
    const sortie = await creerSortie(db, { places: 1 });
    await enregistrerPaiementSortie(sortie.id, nonMembre, paiement());
    await expect(
      enregistrerPaiementSortie(sortie.id, { ...nonMembre, prenom: "Yao" }, paiement()),
    ).rejects.toThrow("Cette sortie est complète.");
  });

  it("un paiement en attente de plus de 15 minutes ne bloque plus la place", async () => {
    const sortie = await creerSortie(db, { places: 1 });
    const ancien = paiement();
    await enregistrerPaiementSortie(sortie.id, nonMembre, ancien);
    await db.update(paiementsSorties).set({ creeLe: ilYA(16) }).where(eq(paiementsSorties.reference, ancien.reference));
    await expect(enregistrerPaiementSortie(sortie.id, nonMembre, paiement())).resolves.toBeDefined();
  });

  it("un non-membre peut payer plusieurs places", async () => {
    const sortie = await creerSortie(db);
    await enregistrerPaiementSortie(sortie.id, nonMembre, paiement());
    await expect(enregistrerPaiementSortie(sortie.id, nonMembre, paiement())).resolves.toBeDefined();
  });
});

describe("sortiesPubliques", () => {
  it("ne liste que les sorties publiques à venir", async () => {
    await creerSortie(db, { titre: "Publique" });
    await creerSortie(db, { titre: "Interne", publique: false });
    await creerSortie(db, { titre: "Passée", date: ilYA(60) });
    const sorties = await sortiesPubliques();
    expect(sorties.map((s) => s.titre)).toEqual(["Publique"]);
  });

  it("n'expose ni étoiles, ni pénalité, ni caractère obligatoire", async () => {
    await creerSortie(db, { obligatoire: true, penalite: 2 });
    const [sortie] = await sortiesPubliques();
    expect(sortie).not.toHaveProperty("etoiles");
    expect(sortie).not.toHaveProperty("penalite");
    expect(sortie).not.toHaveProperty("obligatoire");
    expect(sortie.inscrits).toBe(0);
  });
});
