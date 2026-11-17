import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import { ancienMembres } from "@/lib/db/schema";
import { creerBaseDeTest, viderBase, type BaseDeTest } from "./setup/db";
import { creerMembre } from "./setup/fabriques";

const base = vi.hoisted(() => ({ db: undefined as unknown }));
vi.mock("@/lib/db", () => ({
  get db() {
    return base.db;
  },
}));
vi.mock("@/lib/jobs", () => ({ programmerNotification: vi.fn() }));
vi.mock("@/lib/auth", () => ({ ouvrirSession: vi.fn() }));

const { ouvrirSession } = await import("@/lib/auth");
const { POST } = await import("@/app/api/inscription/ancien/route");

let db: BaseDeTest;
let fermer: () => Promise<void>;

beforeAll(async () => {
  ({ db, fermer } = await creerBaseDeTest());
  base.db = db;
});
afterAll(() => fermer());
beforeEach(async () => {
  await viderBase(db);
  vi.mocked(ouvrirSession).mockReset();
});

const corps = (valeurs: Record<string, unknown> = {}) => ({
  prenom: "Awa",
  nom: "Koné",
  email: "awa@example.com",
  telephone: "0707070707",
  age: "25-34",
  interets: ["aventure"],
  charteAcceptee: true,
  ...valeurs,
});
const envoyer = (donnees: unknown) =>
  POST(new Request("http://localhost/api/inscription/ancien", { method: "POST", body: JSON.stringify(donnees) }));

describe("POST /api/inscription/ancien", () => {
  it("active l'ancien membre et ouvre sa session", async () => {
    await db.insert(ancienMembres).values({ prenom: "Awa", nom: "Koné", email: "awa@example.com" });
    const reponse = await envoyer(corps());
    expect(await reponse.json()).toEqual({ statut: "active" });
    expect(ouvrirSession).toHaveBeenCalledTimes(1);
  });

  it("répond active même si l'ouverture de session échoue (compte déjà activé)", async () => {
    await db.insert(ancienMembres).values({ prenom: "Awa", nom: "Koné", email: "awa@example.com" });
    vi.mocked(ouvrirSession).mockRejectedValueOnce(new Error("cookies indisponibles"));
    const erreurs = vi.spyOn(console, "error").mockImplementation(() => {});
    expect(await (await envoyer(corps())).json()).toEqual({ statut: "active" });
    erreurs.mockRestore();
  });

  it("répond inconnu sans ouvrir de session", async () => {
    const reponse = await envoyer(corps());
    expect(await reponse.json()).toEqual({ statut: "inconnu" });
    expect(ouvrirSession).not.toHaveBeenCalled();
  });

  it("422 si la charte n'est pas acceptée", async () => {
    const reponse = await envoyer(corps({ charteAcceptee: false }));
    expect(reponse.status).toBe(422);
    expect((await reponse.json()).statut).toBe("error");
  });

  it("409 si la personne est déjà membre", async () => {
    await creerMembre(db, { email: "awa@example.com", telephone: "2250101010101" });
    await db.insert(ancienMembres).values({ prenom: "Awa", nom: "Koné", email: "awa@example.com" });
    const reponse = await envoyer(corps());
    expect(reponse.status).toBe(409);
    expect(await reponse.json()).toEqual({
      statut: "error",
      message: "Cette adresse email est déjà utilisée par un membre. Connecte-toi à ton espace membre.",
    });
  });
});
