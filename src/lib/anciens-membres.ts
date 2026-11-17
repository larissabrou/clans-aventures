import "server-only";
import { and, asc, desc, eq, ilike, isNull, ne, or, sql, type SQL } from "drizzle-orm";
import type { z } from "zod";
import {
  ErreurAdhesion,
  activerMembre,
  demandeAncienSchema,
  enregistrerFiche,
  programmerEmailsAdhesion,
} from "./adhesions";
import { avancerSequence } from "./import-membres/import";
import { db } from "./db";
import { ancienMembres, membres } from "./db/schema";
import {
  LigneInvalide,
  verifierDateAdhesion,
  verifierEmail,
  verifierNumero,
  verifierTelephone,
  type LigneRefusee,
} from "./import-membres/analyse";
import type { LigneBrute } from "./import-membres/lecture";
import { genererMotDePasse } from "./mot-de-passe";
import { normaliserTelephone } from "./telephone";

// Liste des anciens membres chargée par l'admin : à l'inscription, un ancien reconnu par son
// e-mail ou son téléphone devient membre sans payer (voir inscrireAncienMembre).

export class ErreurAnciens extends Error {}

export type AncienAAjouter = {
  ligne: number;
  prenom: string;
  nom: string;
  email: string | null;
  telephone: string | null;
  numero: string | null;
  adhereLe: Date | null;
};

/** Vérifie les lignes du fichier pour la liste (rien n'est écrit). Prénom, Nom et e-mail ou téléphone suffisent. */
export async function analyserListeAnciens(
  lignes: LigneBrute[],
): Promise<{ aAjouter: AncienAAjouter[]; refusees: LigneRefusee[] }> {
  const [existants, liste] = await Promise.all([
    db.select({ email: membres.email, telephone: membres.telephone, numero: membres.numero, statut: membres.statut }).from(membres),
    db
      .select({ email: ancienMembres.email, telephone: ancienMembres.telephone, numero: ancienMembres.numero })
      .from(ancienMembres)
      .where(isNull(ancienMembres.utiliseLe)),
  ]);
  const actifs = existants.filter((m) => m.statut !== "en_attente");
  const emailsSite = new Set(actifs.map((m) => m.email.toLowerCase()));
  const telephonesSite = new Set(actifs.map((m) => m.telephone));
  const numerosSite = new Set(actifs.flatMap((m) => (m.numero ? [m.numero] : [])));
  const emailsListe = new Set(liste.flatMap((l) => (l.email ? [l.email] : [])));
  const telephonesListe = new Set(liste.flatMap((l) => (l.telephone ? [l.telephone] : [])));
  const numerosListe = new Set(liste.flatMap((l) => (l.numero ? [l.numero] : [])));

  const vusEmail = new Map<string, number>();
  const vusTelephone = new Map<string, number>();
  const vusNumero = new Map<string, number>();
  const aAjouter: AncienAAjouter[] = [];
  const refusees: LigneRefusee[] = [];

  for (const { ligne, valeurs, dateAdhesion } of lignes) {
    try {
      const champ = (cle: keyof typeof valeurs) => valeurs[cle]?.trim() || null;
      const prenom = champ("prenom");
      const nom = champ("nom");
      if (!prenom) throw new LigneInvalide("champ obligatoire vide : Prénom");
      if (!nom) throw new LigneInvalide("champ obligatoire vide : Nom");
      const emailSaisi = champ("email");
      const telephoneSaisi = champ("telephone");
      if (!emailSaisi && !telephoneSaisi) throw new LigneInvalide("e-mail ou téléphone obligatoire");

      const email = emailSaisi ? verifierEmail(emailSaisi) : null;
      const telephone = telephoneSaisi ? verifierTelephone(telephoneSaisi) : null;
      const numero = verifierNumero(champ("numero"));
      const adhereLe = verifierDateAdhesion(champ("dateAdhesion"), dateAdhesion);

      if (email && emailsSite.has(email)) throw new LigneInvalide("déjà membre du site (même e-mail)");
      if (telephone && telephonesSite.has(telephone)) throw new LigneInvalide("déjà membre du site (même téléphone)");
      if (numero && numerosSite.has(numero)) throw new LigneInvalide(`numéro déjà attribué : ${numero}`);
      if (email && emailsListe.has(email)) throw new LigneInvalide("déjà dans la liste des anciens membres (même e-mail)");
      if (telephone && telephonesListe.has(telephone)) {
        throw new LigneInvalide("déjà dans la liste des anciens membres (même téléphone)");
      }
      if (numero && numerosListe.has(numero)) throw new LigneInvalide("déjà dans la liste des anciens membres (même numéro)");

      const doublon =
        (email && vusEmail.has(email) && `doublon de la ligne ${vusEmail.get(email)} (même e-mail)`) ||
        (telephone && vusTelephone.has(telephone) && `doublon de la ligne ${vusTelephone.get(telephone)} (même téléphone)`) ||
        (numero && vusNumero.has(numero) && `doublon de la ligne ${vusNumero.get(numero)} (même numéro)`);
      if (doublon) throw new LigneInvalide(doublon);

      if (email) vusEmail.set(email, ligne);
      if (telephone) vusTelephone.set(telephone, ligne);
      if (numero) vusNumero.set(numero, ligne);
      aAjouter.push({ ligne, prenom, nom, email, telephone, numero, adhereLe });
    } catch (erreur) {
      if (!(erreur instanceof LigneInvalide)) throw erreur;
      refusees.push({ ligne, raison: erreur.message });
    }
  }
  return { aAjouter, refusees };
}

/** Ajoute les lignes vérifiées à la liste. Aucun compte n'est créé, aucun e-mail n'est envoyé. */
export async function ajouterALaListe(aAjouter: AncienAAjouter[]): Promise<{ ajoutes: number }> {
  if (aAjouter.length === 0) return { ajoutes: 0 };
  await db.transaction(async (tx) => {
    await tx.insert(ancienMembres).values(
      aAjouter.map(({ prenom, nom, email, telephone, numero, adhereLe }) => ({ prenom, nom, email, telephone, numero, adhereLe })),
    );
    // Les nouvelles inscriptions reçoivent des numéros après ceux de la liste (réservés aux anciens).
    await avancerSequence(
      tx,
      aAjouter.flatMap((a) => (a.numero ? [a.numero] : [])),
    );
  });
  return { ajoutes: aAjouter.length };
}

export type LigneListe = typeof ancienMembres.$inferSelect & { membreNumero: string | null };

/** Liste pour l'admin : lignes en attente d'abord, puis les plus récemment utilisées (500 au plus). */
export async function listeAnciensMembres(recherche: string): Promise<LigneListe[]> {
  const motif = `%${recherche.trim()}%`;
  return db
    .select({ ligne: ancienMembres, membreNumero: membres.numero })
    .from(ancienMembres)
    .leftJoin(membres, eq(membres.id, ancienMembres.membreId))
    .where(
      recherche.trim()
        ? or(
            ilike(ancienMembres.prenom, motif),
            ilike(ancienMembres.nom, motif),
            ilike(ancienMembres.email, motif),
            ilike(ancienMembres.telephone, motif),
            ilike(ancienMembres.numero, motif),
            ilike(sql`${ancienMembres.prenom} || ' ' || ${ancienMembres.nom}`, motif),
          )
        : undefined,
    )
    .orderBy(sql`${ancienMembres.utiliseLe} is not null`, desc(ancienMembres.utiliseLe), asc(ancienMembres.nom))
    .limit(500)
    .then((lignes) => lignes.map((l) => ({ ...l.ligne, membreNumero: l.membreNumero })));
}

/**
 * Inscription d'un ancien membre : cherche une ligne non utilisée de la liste par l'e-mail (en
 * priorité) ou le téléphone du formulaire. Trouvée : la fiche est enregistrée comme pour une
 * inscription, la ligne est marquée utilisée et la personne devient membre sans paiement (ancien
 * numéro et date d'adhésion de la liste, pas d'étoiles de parrainage). Pas trouvée : rien n'est écrit.
 * Lève ErreurAdhesion (message affichable) si la personne est déjà membre ou si le formulaire est refusé.
 */
export async function inscrireAncienMembre(
  demande: z.infer<typeof demandeAncienSchema>,
): Promise<{ resultat: "active"; membreId: string } | { resultat: "inconnu" }> {
  const email = demande.email.trim().toLowerCase();
  const telephone = normaliserTelephone(demande.telephone);
  const motDePasse = genererMotDePasse();

  const active = await db.transaction(async (tx) => {
    // Verrou sur la ligne : deux inscriptions simultanées ne peuvent pas utiliser la même.
    const chercher = (condition: SQL) =>
      tx
        .select()
        .from(ancienMembres)
        .where(and(condition, isNull(ancienMembres.utiliseLe)))
        .orderBy(asc(ancienMembres.id))
        .for("update")
        .limit(1);
    const [parEmail] = await chercher(eq(ancienMembres.email, email));
    const [parTelephone] = parEmail ? [] : await chercher(eq(ancienMembres.telephone, telephone));
    const ligne = parEmail ?? parTelephone;
    if (!ligne) {
      // Pas de ligne libre : une personne déjà membre (ou une seconde validation) reçoit le message
      // de l'inscription, pas « introuvable » qui l'enverrait vers le paiement.
      const [parTel] = await tx
        .select({ id: membres.id })
        .from(membres)
        .where(and(eq(membres.telephone, telephone), ne(membres.statut, "en_attente")))
        .limit(1);
      if (parTel) throw new ErreurAdhesion("Ce numéro WhatsApp est déjà membre de CLANS. Connecte-toi à ton espace membre.");
      const [parMail] = await tx
        .select({ id: membres.id })
        .from(membres)
        .where(and(eq(membres.email, email), eq(membres.statut, "membre")))
        .limit(1);
      if (parMail) {
        throw new ErreurAdhesion("Cette adresse email est déjà utilisée par un membre. Connecte-toi à ton espace membre.");
      }
      return null;
    }

    const { membreId } = await enregistrerFiche(tx, demande);

    // L'ancien numéro peut avoir été attribué entre-temps (import des comptes) : un nouveau est alors donné.
    let numero = ligne.numero;
    if (numero) {
      const [pris] = await tx
        .select({ id: membres.id })
        .from(membres)
        .where(and(eq(membres.numero, numero), ne(membres.id, membreId)))
        .limit(1);
      if (pris) {
        console.warn("Anciens membres : ancien numéro déjà attribué, nouveau numéro donné", { numero, ligne: ligne.id });
        numero = null;
      }
    }

    await tx
      .update(ancienMembres)
      .set({ utiliseLe: new Date(), membreId, reconnuPar: parEmail ? "email" : "telephone", emailSaisi: email })
      .where(eq(ancienMembres.id, ligne.id));

    return activerMembre(tx, membreId, motDePasse, {
      numero,
      adhereLe: ligne.adhereLe,
      recompenserParrain: false, // adhésion antérieure au site, comme pour l'import
    });
  });

  if (!active) return { resultat: "inconnu" };
  await programmerEmailsAdhesion(active, motDePasse);
  return { resultat: "active", membreId: active.id };
}

/** Supprime une ligne qui n'a pas encore servi. */
export async function supprimerAncienMembre(id: number): Promise<void> {
  const supprimees = await db
    .delete(ancienMembres)
    .where(and(eq(ancienMembres.id, id), isNull(ancienMembres.utiliseLe)))
    .returning({ id: ancienMembres.id });
  if (supprimees.length === 0) {
    const [existe] = await db.select({ id: ancienMembres.id }).from(ancienMembres).where(eq(ancienMembres.id, id));
    if (existe) throw new ErreurAnciens("Cette ligne a déjà servi à une inscription.");
  }
}
