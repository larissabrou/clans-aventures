// Vérification de santé pour Coolify (Healthcheck path : /api/sante).
import { connection } from "next/server";
import { sql } from "drizzle-orm";
import { db } from "@/lib/db";

export async function GET() {
  await connection(); // toujours à la demande : jamais prérendu
  try {
    await db.execute(sql`select 1`);
    return Response.json({ statut: "ok" });
  } catch {
    return Response.json({ statut: "base de données injoignable" }, { status: 503 });
  }
}
