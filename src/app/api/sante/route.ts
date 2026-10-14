// Vérification de santé pour Coolify (Healthcheck path : /api/sante).
// Renvoie aussi l'état de l'envoi d'emails et de la file de tâches, pour diagnostiquer à distance
// (aucune donnée personnelle ni secret : seulement des états et des compteurs).
import { connection } from "next/server";
import { sql } from "drizzle-orm";
import { db } from "@/lib/db";
import { verifierSmtp } from "@/lib/email";

type LigneTache = { state: string; total: number; derniere_erreur: string | null };

export async function GET() {
  await connection(); // toujours à la demande : jamais prérendu

  try {
    await db.execute(sql`select 1`);
  } catch {
    return Response.json({ statut: "base de données injoignable" }, { status: 503 });
  }

  // Tâches « notifications » (emails) par état : created / active / retry / completed / failed…
  let taches: Record<string, number> = {};
  let derniereErreur: string | null = null;
  try {
    const lignes = (await db.execute(sql`
      select state, count(*)::int as total,
             max(case when state in ('retry','failed') then left(output->>'message', 200) end) as derniere_erreur
      from pgboss.job where name = 'notifications'
      group by state
    `)) as unknown as { rows?: LigneTache[] } | LigneTache[];
    const rows = Array.isArray(lignes) ? lignes : (lignes.rows ?? []);
    taches = Object.fromEntries(rows.map((l) => [l.state, l.total]));
    derniereErreur = rows.map((l) => l.derniere_erreur).find(Boolean) ?? null;
  } catch {
    taches = { indisponible: 1 };
  }

  const smtp = await verifierSmtp();

  return Response.json({
    statut: "ok",
    smtp: smtp.ok ? "ok" : `erreur : ${smtp.detail}`,
    taches_emails: taches,
    derniere_erreur_email: derniereErreur,
  });
}
