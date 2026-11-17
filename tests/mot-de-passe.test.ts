import { describe, expect, it } from "vitest";
import { hacherMotDePasseAsync, motDePasseValide } from "@/lib/mot-de-passe";

describe("hacherMotDePasseAsync", () => {
  it("produit une empreinte scrypt reconnue par motDePasseValide, sans bloquer le serveur", async () => {
    const empreinte = await hacherMotDePasseAsync("XzYmWn8HwY");
    expect(empreinte).toMatch(/^scrypt\$[0-9a-f]{32}\$[0-9a-f]{128}$/);
    expect(motDePasseValide("XzYmWn8HwY", empreinte)).toBe(true);
    expect(motDePasseValide("autre", empreinte)).toBe(false);
  });
});
