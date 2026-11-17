import "server-only";
import { and, eq, or, sql } from "drizzle-orm";
import { activerMembre, programmerEmailsAdhesion, type Transaction } from "../adhesions";
import { db } from "../db";
import { membres, type Membre } from "../db/schema";
import { genererMotDePasse } from "../mot-de-passe";
import type { MembreAImporter } from "./analyse";

// Crée les anciens membres validés par analyserImport, comme après une adhésion payée
// (numéro, mot de passe, messages et e-mails de bienvenue), sans récompense de parrainage.

/**
 * Place la séquence des numéros après le plus grand numéro CLANS-NNNNNN (en base ou à importer) :
 * ni l'import ni les inscriptions suivantes ne reprennent un numéro déjà attribué.
 */
async function avancerSequence(tx: Transaction, numerosImportes: string[]) {
  const maxImporte = Math.max(0, ...numerosImportes.map((n) => Number(n.slice(6))));
  await tx.execute(sql`
    select setval('numero_membre_seq', plus_grand)
    from (
      select greatest(
        ${maxImporte}::int,
        coalesce((select max(substring(numero from 7)::int) from membres where numero ~ '^CLANS-[0-9]{6}$'), 0)
      ) as plus_grand
    ) m, numero_membre_seq s
    where m.plus_grand >= (case when s.is_called then s.last_value + 1 else s.last_value end)
  `);
}

export async function importerMembres(aImporter: MembreAImporter[]): Promise<{ importes: number }> {
  if (aImporter.length === 0) return { importes: 0 };

  const crees = await db.transaction(async (tx) => {
    await avancerSequence(
      tx,
      aImporter.flatMap((m) => (m.numero ? [m.numero] : [])),
    );

    const idsParLigne = new Map<number, string>();
    const resultat: { membre: Membre; motDePasse: string }[] = [];

    for (const m of aImporter) {
      const parrainId = m.parrain === null ? null : "id" in m.parrain ? m.parrain.id : idsParLigne.get(m.parrain.ligne);
      const fiche = {
        prenom: m.prenom,
        nom: m.nom,
        email: m.email,
        telephone: m.telephone,
        ville: m.ville,
        trancheAge: m.trancheAge,
        interets: m.interets,
        universADecouvrir: m.universADecouvrir,
        attente: m.attente,
        clanId: m.clanId,
        parrainId: parrainId ?? null,
        // Anciens membres : la charte est considérée acceptée à la date de l'import.
        charteAccepteeLe: new Date(),
        modifieLe: new Date(),
      };

      // Une inscription commencée sur le site mais jamais payée est remplacée par la ligne importée.
      const [enAttente] = await tx
        .select({ id: membres.id })
        .from(membres)
        .where(and(eq(membres.statut, "en_attente"), or(eq(membres.email, m.email), eq(membres.telephone, m.telephone))))
        .limit(1);
      const id = enAttente
        ? (await tx.update(membres).set(fiche).where(eq(membres.id, enAttente.id)).returning({ id: membres.id }))[0].id
        : (await tx.insert(membres).values(fiche).returning({ id: membres.id }))[0].id;
      idsParLigne.set(m.ligne, id);

      const motDePasse = genererMotDePasse();
      const membre = await activerMembre(tx, id, motDePasse, {
        numero: m.numero,
        adhereLe: m.adhereLe,
        recompenserParrain: false, // parrainages antérieurs au site : pas d'étoiles
      });
      resultat.push({ membre, motDePasse });
    }

    // Les numéros attribués pendant l'import comptent aussi pour les inscriptions suivantes.
    await avancerSequence(tx, []);
    return resultat;
  });

  // Après la transaction : e-mails par la file (réessais automatiques), comme pour l'adhésion en ligne.
  for (const { membre, motDePasse } of crees) {
    await programmerEmailsAdhesion(membre, motDePasse);
  }
  return { importes: crees.length };
}
