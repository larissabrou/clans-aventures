import "server-only";
import { eq, sql } from "drizzle-orm";
import { db } from "./db";
import { parametres } from "./db/schema";

// Réglages modifiables depuis l'administration.

const PRIX_ADHESION_PAR_DEFAUT = 2500;

/** Prix de l'adhésion affiché aux visiteurs, en FCFA (réglé dans l'admin). */
export async function prixAdhesion(): Promise<number> {
  const [ligne] = await db
    .select({ valeur: parametres.valeur })
    .from(parametres)
    .where(eq(parametres.cle, "prix_adhesion"))
    .limit(1);
  const prix = Number(ligne?.valeur);
  return Number.isInteger(prix) && prix > 0 ? prix : PRIX_ADHESION_PAR_DEFAUT;
}

export async function definirPrixAdhesion(prix: number) {
  await db
    .insert(parametres)
    .values({ cle: "prix_adhesion", valeur: String(prix) })
    .onConflictDoUpdate({
      target: parametres.cle,
      set: { valeur: String(prix), modifieLe: sql`now()` },
    });
}
