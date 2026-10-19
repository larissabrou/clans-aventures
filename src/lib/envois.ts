import "server-only";
import { and, desc, eq, sql } from "drizzle-orm";
import { normaliserCodeParrainage } from "./adhesions";
import { db } from "./db";
import { clans, envois, membres, messages, typesMessages } from "./db/schema";
import { typeMessageActif } from "./types-messages";

// Messages envoyés depuis l'admin vers l'espace membre : à tous, à un clan ou à un membre.

export class ErreurEnvoi extends Error {}

export type Cible = { genre: "tous" } | { genre: "clan"; clanId: number } | { genre: "membre"; numero: string };

export async function envoyerMessage(
  cible: Cible,
  contenu: { titre: string; contenu: string; type: string },
): Promise<number> {
  if (!(await typeMessageActif(contenu.type))) throw new ErreurEnvoi("Ce type de message n’existe plus : choisis-en un autre.");

  return db.transaction(async (tx) => {
    let libelle: string;
    let destinataires: { id: string }[];

    if (cible.genre === "tous") {
      libelle = "Tous les membres";
      destinataires = await tx.select({ id: membres.id }).from(membres).where(eq(membres.statut, "membre"));
    } else if (cible.genre === "clan") {
      const [clan] = await tx.select({ nom: clans.nom }).from(clans).where(eq(clans.id, cible.clanId)).limit(1);
      if (!clan) throw new ErreurEnvoi("Clan introuvable.");
      libelle = `Clan ${clan.nom}`;
      destinataires = await tx
        .select({ id: membres.id })
        .from(membres)
        .where(and(eq(membres.statut, "membre"), eq(membres.clanId, cible.clanId)));
    } else {
      const numero = normaliserCodeParrainage(cible.numero);
      if (!numero) throw new ErreurEnvoi("Indique le numéro du membre.");
      const [membre] = await tx
        .select({ id: membres.id, prenom: membres.prenom, nom: membres.nom })
        .from(membres)
        .where(and(eq(membres.numero, numero), eq(membres.statut, "membre")))
        .limit(1);
      if (!membre) throw new ErreurEnvoi(`Aucun membre avec le numéro ${numero}.`);
      libelle = `${membre.prenom} ${membre.nom} (${numero})`;
      destinataires = [membre];
    }

    if (destinataires.length === 0) throw new ErreurEnvoi("Aucun membre ne correspond à ces destinataires.");

    const [envoi] = await tx
      .insert(envois)
      .values({ ...contenu, cible: libelle, destinataires: destinataires.length })
      .returning({ id: envois.id });
    await tx
      .insert(messages)
      .values(destinataires.map(({ id }) => ({ ...contenu, membreId: id, envoiId: envoi.id })));

    return destinataires.length;
  });
}

/** Historique des envois, avec le nombre de destinataires qui ont lu le message. */
export async function historiqueEnvois() {
  const lignes = await db
    .select({
      envoi: envois,
      typeNom: typesMessages.nom,
      couleur: typesMessages.couleur,
      icone: typesMessages.icone,
      lus: sql<number>`count(${messages.id}) filter (where ${messages.lu})`.mapWith(Number),
    })
    .from(envois)
    .leftJoin(typesMessages, eq(typesMessages.cle, envois.type))
    .leftJoin(messages, eq(messages.envoiId, envois.id))
    .groupBy(envois.id, typesMessages.cle)
    .orderBy(desc(envois.creeLe))
    .limit(100);
  return lignes.map(({ envoi, ...reste }) => ({ ...envoi, ...reste }));
}

/** Retire l'envoi et le message correspondant chez tous ses destinataires. */
export async function supprimerEnvoi(id: number) {
  await db.delete(envois).where(eq(envois.id, id));
}
