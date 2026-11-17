import { eq } from "drizzle-orm";
import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import { evenements, messages, paiementsSorties, participations } from "@/lib/db/schema";
import { creerBaseDeTest, viderBase, type BaseDeTest } from "./setup/db";
import { creerMembre, creerSortie } from "./setup/fabriques";

const base = vi.hoisted(() => ({ db: undefined as unknown }));
vi.mock("@/lib/db", () => ({
  get db() {
    return base.db;
  },
}));
// File d'envoi des e-mails et passerelle de paiement : simulées.
vi.mock("@/lib/jobs", () => ({ programmerNotification: vi.fn() }));
vi.mock("@/lib/paiement/gateway", async (original) => ({
  ...(await original<typeof import("@/lib/paiement/gateway")>()),
  statutPaiement: vi.fn(),
}));

const { programmerNotification } = await import("@/lib/jobs");
const { statutPaiement } = await import("@/lib/paiement/gateway");
const { confirmerPaiementSortie, enregistrerPaiementSortie } = await import("@/lib/sorties");
const { relancerPaiementsSortiesEnAttente, suivrePaiementSortie } = await import("@/lib/paiement/suivi-sorties");

let db: BaseDeTest;
let fermer: () => Promise<void>;
let compteur = 0;

beforeAll(async () => {
  ({ db, fermer } = await creerBaseDeTest());
  base.db = db;
});
afterAll(() => fermer());
beforeEach(async () => {
  await viderBase(db);
  vi.mocked(programmerNotification).mockReset();
  vi.mocked(statutPaiement).mockReset();
});

const nonMembre = { prenom: "Awa", nom: "Koné", email: "awa@example.com", telephone: "2250101010101" };

async function paiementEnAttente(payeur: Parameters<typeof enregistrerPaiementSortie>[1], sortieId?: number) {
  compteur += 1;
  const reference = `CLANS-EVT-TEST${compteur}`;
  const id = sortieId ?? (await creerSortie(db)).id;
  await enregistrerPaiementSortie(id, payeur, { reference, operateur: "orange", pays: "CI", telephoneDebite: "0101010101" });
  return { reference, sortieId: id };
}

const inscriptions = (sortieId: number) =>
  db.select().from(participations).where(eq(participations.evenementId, sortieId));

describe("confirmerPaiementSortie", () => {
  it("inscrit un membre, lui envoie un e-mail et un message", async () => {
    const membre = await creerMembre(db);
    const { reference, sortieId } = await paiementEnAttente({ membreId: membre.id });

    const resultat = await confirmerPaiementSortie(reference, 20000);

    expect(resultat.resultat).toBe("confirme");
    const lignes = await inscriptions(sortieId);
    expect(lignes).toHaveLength(1);
    expect(lignes[0].membreId).toBe(membre.id);
    expect(lignes[0].paiementReference).toBe(reference);
    expect(programmerNotification).toHaveBeenCalledTimes(1);
    expect(vi.mocked(programmerNotification).mock.calls[0][0]).toMatchObject({
      modele: "participation",
      email: membre.email,
      prenom: membre.prenom,
      titre: "Notre Night Clans",
      reference,
    });
    const boite = await db.select().from(messages).where(eq(messages.membreId, membre.id));
    expect(boite).toHaveLength(1);
    expect(boite[0].type).toBe("event");
  });

  it("inscrit un non-membre avec ses coordonnées et la référence", async () => {
    const { reference, sortieId } = await paiementEnAttente(nonMembre);

    await confirmerPaiementSortie(reference);

    const [ligne] = await inscriptions(sortieId);
    expect(ligne).toMatchObject({ membreId: null, prenom: "Awa", nom: "Koné", email: "awa@example.com", paiementReference: reference });
    expect(vi.mocked(programmerNotification).mock.calls[0][0]).toMatchObject({ email: "awa@example.com", prenom: "Awa" });
    const [paiement] = await db.select().from(paiementsSorties).where(eq(paiementsSorties.reference, reference));
    expect(paiement.statut).toBe("reussi");
    expect(paiement.confirmeLe).not.toBeNull();
  });

  it("deux confirmations simultanées ne créent qu'une participation", async () => {
    const { reference, sortieId } = await paiementEnAttente(nonMembre);

    const resultats = await Promise.all([confirmerPaiementSortie(reference), confirmerPaiementSortie(reference)]);

    expect(resultats.map((r) => r.resultat).sort()).toEqual(["confirme", "deja_confirme"]);
    expect(await inscriptions(sortieId)).toHaveLength(1);
    expect(programmerNotification).toHaveBeenCalledTimes(1);
  });

  it("refuse un montant reçu insuffisant", async () => {
    const { reference, sortieId } = await paiementEnAttente(nonMembre);

    const resultat = await confirmerPaiementSortie(reference, 500);

    expect(resultat.resultat).toBe("montant_incorrect");
    expect(await inscriptions(sortieId)).toHaveLength(0);
  });

  it("renvoie introuvable pour une référence inconnue", async () => {
    expect((await confirmerPaiementSortie("CLANS-EVT-INCONNU")).resultat).toBe("introuvable");
  });

  it("sortie supprimée : le paiement est réussi sans participation", async () => {
    const { reference, sortieId } = await paiementEnAttente(nonMembre);
    await db.delete(evenements).where(eq(evenements.id, sortieId));

    const resultat = await confirmerPaiementSortie(reference);

    expect(resultat).toEqual({ resultat: "confirme", participationId: null });
    const [paiement] = await db.select().from(paiementsSorties).where(eq(paiementsSorties.reference, reference));
    expect(paiement.statut).toBe("reussi");
    expect(paiement.evenementTitre).toBe("Notre Night Clans");
  });

  it("sortie complète entre-temps : la personne est inscrite quand même", async () => {
    const sortie = await creerSortie(db, { places: 1 });
    const { reference } = await paiementEnAttente(nonMembre, sortie.id);
    await db.insert(participations).values({ evenementId: sortie.id, prenom: "Yao", nom: "N'Guessan" });

    await confirmerPaiementSortie(reference);

    expect(await inscriptions(sortie.id)).toHaveLength(2);
  });
});

describe("suivrePaiementSortie", () => {
  it("SUCCESS : paiement confirmé", async () => {
    const { reference, sortieId } = await paiementEnAttente(nonMembre);
    vi.mocked(statutPaiement).mockResolvedValue({ status: "SUCCESS", amount: 20000, is_terminal: true });

    expect(await suivrePaiementSortie(reference)).toEqual({ etat: "paye" });
    expect(await inscriptions(sortieId)).toHaveLength(1);
  });

  it("FAILED encore en cours de traitement : toujours en attente", async () => {
    const { reference } = await paiementEnAttente(nonMembre);
    vi.mocked(statutPaiement).mockResolvedValue({ status: "FAILED", message: "Transaction en cours de traitement" });

    expect(await suivrePaiementSortie(reference)).toEqual({ etat: "en_attente" });
  });

  it("CANCELLED : échec et paiement annulé", async () => {
    const { reference } = await paiementEnAttente(nonMembre);
    vi.mocked(statutPaiement).mockResolvedValue({ status: "CANCELLED", is_terminal: true, message: "Annulé" });

    const suivi = await suivrePaiementSortie(reference);

    expect(suivi.etat).toBe("echoue");
    const [paiement] = await db.select().from(paiementsSorties).where(eq(paiementsSorties.reference, reference));
    expect(paiement.statut).toBe("annule");
  });
});

describe("relancerPaiementsSortiesEnAttente", () => {
  it("relit les paiements en attente de moins de 24 h seulement", async () => {
    const recent = await paiementEnAttente(nonMembre);
    const ancien = await paiementEnAttente(nonMembre);
    await db
      .update(paiementsSorties)
      .set({ creeLe: new Date(Date.now() - 25 * 3600 * 1000) })
      .where(eq(paiementsSorties.reference, ancien.reference));
    vi.mocked(statutPaiement).mockResolvedValue({ status: "SUCCESS", amount: 20000, is_terminal: true });

    expect(await relancerPaiementsSortiesEnAttente()).toBe(1);
    expect(statutPaiement).toHaveBeenCalledWith(recent.reference);
    expect(statutPaiement).not.toHaveBeenCalledWith(ancien.reference);
  });

  it("une erreur de la passerelle n'arrête pas la relecture des autres paiements", async () => {
    await paiementEnAttente(nonMembre);
    await paiementEnAttente(nonMembre);
    vi.mocked(statutPaiement)
      .mockRejectedValueOnce(new Error("passerelle injoignable"))
      .mockResolvedValueOnce({ status: "SUCCESS", amount: 20000, is_terminal: true });

    expect(await relancerPaiementsSortiesEnAttente()).toBe(2);
  });
});
