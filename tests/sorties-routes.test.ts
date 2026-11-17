import { eq } from "drizzle-orm";
import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import { paiementsSorties, participations } from "@/lib/db/schema";
import { creerBaseDeTest, viderBase, type BaseDeTest } from "./setup/db";
import { creerMembre, creerSortie } from "./setup/fabriques";

const base = vi.hoisted(() => ({ db: undefined as unknown, membre: null as unknown }));
vi.mock("@/lib/db", () => ({
  get db() {
    return base.db;
  },
}));
vi.mock("@/lib/jobs", () => ({ programmerNotification: vi.fn() }));
vi.mock("@/lib/auth", () => ({ membreConnecte: vi.fn(async () => base.membre) }));
vi.mock("@/lib/paiement/gateway", async (original) => ({
  ...(await original<typeof import("@/lib/paiement/gateway")>()),
  creerPayin: vi.fn(),
  statutPaiement: vi.fn(),
  signatureValide: vi.fn(() => true),
}));
// connection() n'existe que pendant une vraie requête Next.js.
vi.mock("next/server", async (original) => ({
  ...(await original<typeof import("next/server")>()),
  connection: async () => {},
}));
// Le suivi des adhésions n'est pas concerné ici : il ne doit pas être appelé pour une sortie.
vi.mock("@/lib/paiement/suivi", () => ({ suivrePaiement: vi.fn(async () => ({ etat: "en_attente" })) }));

const { creerPayin, statutPaiement } = await import("@/lib/paiement/gateway");
const { suivrePaiement } = await import("@/lib/paiement/suivi");
const { POST: lancer } = await import("@/app/api/sorties/paiement/route");
const { GET: relire } = await import("@/app/api/sorties/paiement/[reference]/route");
const { POST: webhook } = await import("@/app/webhooks/payment/route");

let db: BaseDeTest;
let fermer: () => Promise<void>;

beforeAll(async () => {
  ({ db, fermer } = await creerBaseDeTest());
  base.db = db;
});
afterAll(() => fermer());
beforeEach(async () => {
  await viderBase(db);
  base.membre = null;
  vi.mocked(creerPayin).mockReset();
  vi.mocked(statutPaiement).mockReset();
  vi.mocked(suivrePaiement).mockClear();
});

const participant = { prenom: "Awa", nom: "Koné", email: "awa@example.com", telephone: "0101010101" };
const moyen = { pays: "CI", operateur: "orange", telephonePaiement: "0101010101" };

const requete = (corps: unknown) =>
  new Request("http://localhost/api/sorties/paiement", { method: "POST", body: JSON.stringify(corps) });

describe("POST /api/sorties/paiement", () => {
  it("refuse une sortie passée avec un message lisible (409)", async () => {
    const sortie = await creerSortie(db, { date: new Date(Date.now() - 3600_000) });
    const reponse = await lancer(requete({ evenementId: sortie.id, ...moyen, participant }));
    expect(reponse.status).toBe(409);
    expect(await reponse.json()).toEqual({ statut: "error", message: "Cette sortie est déjà passée." });
    expect(creerPayin).not.toHaveBeenCalled();
  });

  it("exige les coordonnées d'un non-membre (422)", async () => {
    const sortie = await creerSortie(db);
    const reponse = await lancer(requete({ evenementId: sortie.id, ...moyen }));
    expect(reponse.status).toBe(422);
  });

  it("non-membre : lance le payin au prix de la sortie et attend la validation", async () => {
    const sortie = await creerSortie(db);
    vi.mocked(creerPayin).mockResolvedValue({ success: true, status: "PENDING" });

    const reponse = await lancer(requete({ evenementId: sortie.id, ...moyen, participant }));
    const corps = await reponse.json();

    expect(corps.statut).toBe("pending");
    expect(corps.reference).toMatch(/^CLANS-EVT-/);
    const payin = vi.mocked(creerPayin).mock.calls[0][0];
    expect(payin).toMatchObject({ amount: 20000, operator: "orange", phone_number: "2250101010101" });
    expect(payin.metadata).toMatchObject({ type: "participation", evenement_id: sortie.id, participant: "Awa Koné" });
  });

  it("membre connecté : payé tout de suite, il est inscrit à son nom", async () => {
    const sortie = await creerSortie(db);
    const membre = await creerMembre(db);
    base.membre = membre;
    vi.mocked(creerPayin).mockResolvedValue({ success: true, status: "SUCCESS" });

    const corps = await (await lancer(requete({ evenementId: sortie.id, ...moyen, participant }))).json();

    expect(corps.statut).toBe("paid");
    const lignes = await db.select().from(participations).where(eq(participations.evenementId, sortie.id));
    expect(lignes).toHaveLength(1);
    expect(lignes[0].membreId).toBe(membre.id);
    expect(lignes[0].prenom).toBeNull();
  });

  it("passerelle injoignable : paiement marqué en échec, place libérée", async () => {
    const sortie = await creerSortie(db, { places: 1 });
    vi.mocked(creerPayin).mockRejectedValue(new Error("Paiement indisponible."));

    const reponse = await lancer(requete({ evenementId: sortie.id, ...moyen, participant }));

    expect(reponse.status).toBe(502);
    const [paiement] = await db.select().from(paiementsSorties);
    expect(paiement.statut).toBe("echoue");
  });
});

describe("GET /api/sorties/paiement/[reference]", () => {
  it("refuse une référence d'adhésion (404)", async () => {
    const reponse = await relire(new Request("http://localhost"), {
      params: Promise.resolve({ reference: "CLANS-ADH-123" }),
    });
    expect(reponse.status).toBe(404);
  });
});

describe("webhook /webhooks/payment", () => {
  const appel = (orderId: string) =>
    webhook(new Request("http://localhost/webhooks/payment", { method: "POST", body: JSON.stringify({ order_id: orderId }) }));

  it("une référence de sortie est suivie par le circuit des sorties", async () => {
    const sortie = await creerSortie(db);
    vi.mocked(creerPayin).mockResolvedValue({ success: true, status: "PENDING" });
    const { reference } = await (await lancer(requete({ evenementId: sortie.id, ...moyen, participant }))).json();
    vi.mocked(statutPaiement).mockResolvedValue({ status: "SUCCESS", amount: 20000, is_terminal: true });

    const corps = await (await appel(reference)).json();

    expect(corps).toEqual({ received: true, found: true, etat: "paye" });
    expect(suivrePaiement).not.toHaveBeenCalled();
  });

  it("une référence d'adhésion reste suivie par le circuit des adhésions", async () => {
    await appel("CLANS-ADH-ABC");
    expect(suivrePaiement).toHaveBeenCalledWith("CLANS-ADH-ABC");
  });

  it("une autre référence est ignorée", async () => {
    expect(await (await appel("AUTRE-1")).json()).toEqual({ received: true, found: false });
  });
});
