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

  it("un fichier de plus de 5 Mo reçoit un message clair", async () => {
    const donnees = new FormData();
    donnees.set("mode", "analyser");
    donnees.set("fichier", new File([new Uint8Array(5 * 1024 * 1024 + 1)], "gros.xlsx"));
    expect(await actionImportMembres({ etape: "choix" }, donnees)).toEqual({
      etape: "erreur",
      message: "Le fichier dépasse 5 Mo : découpe-le en plusieurs fichiers.",
    });
  });
});
