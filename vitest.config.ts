import path from "node:path";
import { defineConfig } from "vitest/config";

// Tests du domaine (paiements de sorties…) sur une vraie base PostgreSQL en mémoire (PGlite),
// avec toutes les migrations de /drizzle. Aucun serveur ni Docker nécessaire.
export default defineConfig({
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "src"),
      // « server-only » refuse d'être importé hors de Next.js : module vide pour les tests.
      "server-only": path.resolve(__dirname, "tests/setup/server-only.ts"),
    },
  },
  test: {
    include: ["tests/**/*.test.ts"],
    environment: "node",
    testTimeout: 30_000,
    hookTimeout: 60_000,
  },
});
