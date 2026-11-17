import { evenements, membres } from "@/lib/db/schema";
import type { BaseDeTest } from "./db";

let compteur = 0;

/** Membre actif (adhésion payée), avec un téléphone et un e-mail uniques. */
export async function creerMembre(db: BaseDeTest, valeurs: Partial<typeof membres.$inferInsert> = {}) {
  compteur += 1;
  const [membre] = await db
    .insert(membres)
    .values({
      prenom: "Olly",
      nom: "Angba",
      email: `membre${compteur}@example.com`,
      telephone: `22507000000${String(compteur).padStart(2, "0")}`,
      statut: "membre",
      numero: `CLANS-${String(compteur).padStart(6, "0")}`,
      charteAccepteeLe: new Date(),
      ...valeurs,
    })
    .returning();
  return membre;
}

/** Sortie publique payante à venir (dans 30 jours), 20 000 FCFA et 30 places par défaut. */
export async function creerSortie(db: BaseDeTest, valeurs: Partial<typeof evenements.$inferInsert> = {}) {
  const [sortie] = await db
    .insert(evenements)
    .values({
      titre: "Notre Night Clans",
      date: new Date(Date.now() + 30 * 24 * 3600 * 1000),
      lieu: "Abidjan, Cocody",
      prix: 20000,
      places: 30,
      ...valeurs,
    })
    .returning();
  return sortie;
}
