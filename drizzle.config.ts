import { defineConfig } from "drizzle-kit";

// drizzle-kit ne lit pas .env.local tout seul (Next.js le fait, pas lui).
try {
  process.loadEnvFile(".env.local");
} catch {
  // pas de .env.local : on utilise les variables déjà présentes (ex. sur Coolify)
}

// Utilisé par drizzle-kit : `npm run db:generate` (crée les migrations), `npm run db:studio` (interface web).
export default defineConfig({
  dialect: "postgresql",
  schema: "./src/lib/db/schema.ts",
  out: "./drizzle",
  dbCredentials: { url: process.env.DATABASE_URL ?? "" },
});
