import path from "node:path";
import { migrate } from "drizzle-orm/node-postgres/migrator";
import { db } from "./db";
import { demarrerTravailleurs } from "./jobs";

// Exécuté une fois au démarrage du serveur (voir src/instrumentation.ts) :
// 1. applique les migrations SQL de /drizzle, 2. lance le traitement des tâches pg-boss.
export async function demarrer() {
  if (!process.env.DATABASE_URL) {
    console.warn("DATABASE_URL absente : base de données et tâches désactivées (voir .env.example).");
    return;
  }

  await migrate(db, { migrationsFolder: path.join(process.cwd(), "drizzle") });
  console.info("Base de données : migrations appliquées.");

  await demarrerTravailleurs();
  console.info("Tâches : travailleurs pg-boss démarrés.");
}
