import path from "node:path";
import { PGlite } from "@electric-sql/pglite";
import { sql } from "drizzle-orm";
import { drizzle, type PgliteDatabase } from "drizzle-orm/pglite";
import { migrate } from "drizzle-orm/pglite/migrator";
import * as schema from "@/lib/db/schema";

export type BaseDeTest = PgliteDatabase<typeof schema>;

/** Base PostgreSQL en mémoire, avec toutes les migrations du projet appliquées. */
export async function creerBaseDeTest(): Promise<{ db: BaseDeTest; fermer(): Promise<void> }> {
  const client = new PGlite();
  const db = drizzle(client, { schema });
  await migrate(db, { migrationsFolder: path.resolve(__dirname, "../../drizzle") });
  return { db, fermer: () => client.close() };
}

// Tables remplies par les migrations (données de référence) : conservées entre deux tests.
const TABLES_DE_REFERENCE = [
  "messages_bienvenue",
  "modeles_messages",
  "parametres",
  "types_actions",
  "types_messages",
  "univers_culturels",
];

/** Vide les tables de données du schéma public (entre deux tests), sans toucher aux données de référence. */
export async function viderBase(db: BaseDeTest) {
  const { rows } = await db.execute<{ tablename: string }>(
    sql`select tablename from pg_tables where schemaname = 'public' and tablename not like '\_\_%'`,
  );
  rows.splice(0, rows.length, ...rows.filter((r) => !TABLES_DE_REFERENCE.includes(r.tablename)));
  if (rows.length === 0) return;
  const noms = rows.map((r) => `"${r.tablename}"`).join(", ");
  await db.execute(sql.raw(`truncate ${noms} restart identity cascade`));
}
