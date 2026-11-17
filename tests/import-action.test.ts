import { describe, expect, it, vi } from "vitest";

vi.mock("@/lib/admin", () => ({ verifierAdmin: vi.fn(async () => ({ id: "admin" })) }));
vi.mock("next/cache", () => ({ refresh: vi.fn() }));
vi.mock("@/lib/db", () => ({ db: {} }));
vi.mock("@/lib/jobs", () => ({ programmerNotification: vi.fn() }));

const { actionImportMembres } = await import("@/app/admin/(gestion)/membres/import/actions");

describe("actionImportMembres", () => {
  it("un nouveau choix de fichier remet le formulaire à zéro, sans message d'erreur", async () => {
    const donnees = new FormData();
    donnees.set("mode", "reinitialiser");
    expect(await actionImportMembres({ etape: "erreur", message: "x" }, donnees)).toEqual({ etape: "choix" });
  });
});
