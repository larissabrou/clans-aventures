"use server";

import { and, eq } from "drizzle-orm";
import { normaliserCodeParrainage } from "@/lib/adhesions";
import { db } from "@/lib/db";
import { membres } from "@/lib/db/schema";

export type ResultatCodeParrainage =
  | { ok: true; code: string; parrain: string }
  | { ok: false; message: string };

/** Vérifie le code de parrainage dès l'étape 1, pour ne pas découvrir l'erreur au paiement. */
export async function verifierCodeParrainage(saisie: string): Promise<ResultatCodeParrainage> {
  const code = normaliserCodeParrainage(saisie);
  if (!code) return { ok: false, message: "Indique un code de parrainage." };

  const [parrain] = await db
    .select({ prenom: membres.prenom, nom: membres.nom })
    .from(membres)
    .where(and(eq(membres.numero, code), eq(membres.statut, "membre")))
    .limit(1);

  if (!parrain) {
    return {
      ok: false,
      message: "Ce code de parrainage n’existe pas. Vérifie-le auprès de ton parrain ou laisse le champ vide.",
    };
  }
  // Prénom + initiale seulement : le code ne doit pas révéler l'identité complète d'un membre.
  return { ok: true, code, parrain: `${parrain.prenom} ${parrain.nom[0] ?? ""}.`.trim() };
}
