import "server-only";
import { and, count, eq, sql } from "drizzle-orm";
import { z } from "zod";
import { db } from "./db";
import {
  clans,
  membres,
  messages,
  mouvementsEtoiles,
  numeroMembreSeq,
  paiements,
  typesActions,
} from "./db/schema";
import { programmerNotification } from "./jobs";
import { messagesBienvenuePour } from "./messages-bienvenue";
import { genererMotDePasse, hacherMotDePasse } from "./mot-de-passe";
import { prixAdhesion } from "./parametres";
import { estOperateur, estPays, PAYS } from "./paiement/operateurs";
import { normaliserTelephone, telephoneValide } from "./telephone";
import { UNIVERS } from "./univers";
import { nomUniversPropose } from "./univers-culturels";

// Règles métier de l'adhésion : enregistrement du formulaire, puis confirmation du paiement.

/** Cookie qui relie ce navigateur au paiement en cours (ouvre la session une fois payé). */
export const COOKIE_ADHESION = "clans_adhesion";

/**
 * Montant réellement débité : le prix réglé dans l'admin.
 * Phase de test : MONTANT_DEBITE (ex. 500) le remplace, sans changer le prix affiché.
 * Au lancement, supprimer MONTANT_DEBITE dans Coolify.
 */
export async function montantADebiter(): Promise<number> {
  const configure = Number(process.env.MONTANT_DEBITE);
  return Number.isFinite(configure) && configure > 0 ? configure : prixAdhesion();
}

/** « clans-000012 », « CLANS 12 » ou « 12 » → « CLANS-000012 » ; null si vide. */
export function normaliserCodeParrainage(saisie: string | null | undefined): string | null {
  const code = (saisie ?? "").toUpperCase().replace(/\s+/g, "");
  if (!code) return null;
  const chiffres = code.replace(/^CLANS-?/, "");
  return /^\d{1,6}$/.test(chiffres) ? `CLANS-${chiffres.padStart(6, "0")}` : code;
}

const DELAI_MESSAGE_BIENVENUE_SECONDES = 3 * 3600; // « Quelques heures après l'adhésion »

// Messages d'erreur en français pour tout ce qui n'a pas de message dédié.
z.config(z.locales.fr());

/** Texte obligatoire : le même message que le champ soit absent ou vide. */
const texteRequis = (message: string, max = 80) =>
  z.string({ error: message }).trim().min(1, message).max(max);

const texteOptionnel = z
  .string()
  .trim()
  .max(500)
  .optional()
  .transform((v) => v || null);

/** Corps attendu par POST /api/paiement : le profil du formulaire et le moyen de paiement. */
export const demandeAdhesionSchema = z.object({
  prenom: texteRequis("Indique ton prénom."),
  nom: texteRequis("Indique ton nom."),
  email: z.email({ error: "Ton adresse email ne semble pas valide." }).trim().max(200),
  telephone: texteRequis("Indique ton numéro WhatsApp.", 30),
  ville: texteOptionnel,
  age: texteRequis("Indique ta tranche d’âge.", 20),
  interets: z
    .array(z.enum(UNIVERS.map((u) => u.id) as [string, ...string[]]), {
      error: "Sélectionne au moins un univers.",
    })
    .min(1, "Sélectionne au moins un univers."),
  // Univers culturel choisi parmi ceux de l'admin (facultatif).
  universId: z.number().int().positive().nullable().optional().transform((v) => v ?? null),
  attente: z
    .string()
    .trim()
    .max(2000)
    .optional()
    .transform((v) => v || null),
  // Numéro membre du parrain (facultatif).
  codeParrainage: z.string().trim().max(30).optional().transform(normaliserCodeParrainage),
  // Clan choisi parmi ceux de l'admin ; vide = « À définir ».
  clanId: z.number().int().positive().nullable().optional().transform((v) => v ?? null),
  charteAcceptee: z.literal(true, { error: "Tu dois accepter la charte de CLANS aventures." }),
  pays: z.string({ error: "Choisis ton pays." }).refine(estPays, "Pays non pris en charge."),
  operateur: z
    .string({ error: "Choisis ton opérateur Mobile Money." })
    .refine(estOperateur, "Opérateur non pris en charge."),
  telephonePaiement: texteRequis("Indique le numéro Mobile Money à débiter.", 30),
});

export type DemandeAdhesion = z.infer<typeof demandeAdhesionSchema>;

export class ErreurAdhesion extends Error {}

/**
 * Crée (ou met à jour) la fiche « en attente » et le paiement associé.
 * Une personne déjà membre avec ce numéro WhatsApp ne peut pas payer une seconde fois.
 */
export async function enregistrerDemande(
  demande: DemandeAdhesion,
  paiement: { reference: string; montant: number; devise: string; telephone: string },
) {
  const indicatif = estPays(demande.pays) ? PAYS[demande.pays].indicatif : "225";
  const telephone = normaliserTelephone(demande.telephone, indicatif);
  if (!telephoneValide(telephone)) {
    throw new ErreurAdhesion("Ton numéro WhatsApp ne semble pas valide.");
  }

  const profil = {
    prenom: demande.prenom,
    nom: demande.nom,
    email: demande.email.toLowerCase(),
    telephone,
    ville: demande.ville,
    trancheAge: demande.age,
    interets: demande.interets,
    // Question « univers culturel de rattachement » retirée : colonnes conservées pour les anciennes fiches.
    appartenance: null,
    appartenanceAutre: null,
    // Le nom est enregistré (et non l'identifiant) : il reste lisible même si l'univers est supprimé.
    universADecouvrir: demande.universId ? await nomUniversPropose(demande.universId) : null,
    attente: demande.attente,
    charteAccepteeLe: new Date(),
    modifieLe: new Date(),
  };

  return db.transaction(async (tx) => {
    const [existant] = await tx
      .select({ id: membres.id, statut: membres.statut })
      .from(membres)
      .where(eq(membres.telephone, telephone))
      .for("update")
      .limit(1);

    if (existant && existant.statut !== "en_attente") {
      throw new ErreurAdhesion(
        "Ce numéro WhatsApp est déjà membre de CLANS. Connecte-toi à ton espace membre.",
      );
    }

    // L'email sert à se connecter : il ne peut appartenir qu'à un seul membre.
    const [emailPris] = await tx
      .select({ id: membres.id })
      .from(membres)
      .where(and(eq(membres.email, profil.email), eq(membres.statut, "membre")))
      .limit(1);
    if (emailPris) {
      throw new ErreurAdhesion(
        "Cette adresse email est déjà utilisée par un membre. Connecte-toi à ton espace membre.",
      );
    }

    let parrainId: string | null = null;
    if (demande.codeParrainage) {
      const [parrain] = await tx
        .select({ id: membres.id })
        .from(membres)
        .where(and(eq(membres.numero, demande.codeParrainage), eq(membres.statut, "membre")))
        .limit(1);
      if (!parrain) {
        throw new ErreurAdhesion(
          "Ce code de parrainage n’existe pas. Vérifie-le auprès de ton parrain ou laisse le champ vide.",
        );
      }
      parrainId = parrain.id;
    }

    let clanId: number | null = null;
    if (!demande.clanId) {
      // Obligatoire dès qu'un clan est proposé (sinon l'inscription reste possible, clan « À définir »).
      const [unClan] = await tx.select({ id: clans.id }).from(clans).where(eq(clans.actif, true)).limit(1);
      if (unClan) throw new ErreurAdhesion("Choisis ton clan.");
    } else {
      const [clan] = await tx
        .select({ id: clans.id })
        .from(clans)
        .where(and(eq(clans.id, demande.clanId), eq(clans.actif, true)))
        .limit(1);
      if (!clan) throw new ErreurAdhesion("Ce clan n’est plus proposé. Choisis-en un autre.");
      clanId = clan.id;
    }

    const fiche = { ...profil, parrainId, clanId };
    let membreId: string;
    if (existant) {
      await tx.update(membres).set(fiche).where(eq(membres.id, existant.id));
      membreId = existant.id;
    } else {
      const [cree] = await tx.insert(membres).values(fiche).returning({ id: membres.id });
      membreId = cree.id;
    }

    await tx.insert(paiements).values({
      reference: paiement.reference,
      membreId,
      montant: paiement.montant,
      devise: paiement.devise,
      operateur: demande.operateur,
      pays: demande.pays,
      telephone: paiement.telephone,
    });

    return { membreId, telephone };
  });
}

/** Garde la dernière réponse de la passerelle, utile pour le support. */
export async function noterReponsePasserelle(reference: string, reponse: unknown) {
  await db
    .update(paiements)
    .set({ derniereReponse: reponse as object })
    .where(eq(paiements.reference, reference));
}

/** Paiement refusé ou annulé (sans effet s'il a déjà été confirmé). */
export async function marquerPaiementEchoue(reference: string, statut: "echoue" | "annule") {
  await db
    .update(paiements)
    .set({ statut })
    .where(and(eq(paiements.reference, reference), eq(paiements.statut, "en_attente")));
}

export type Confirmation =
  | { resultat: "confirme" | "deja_confirme"; membreId: string }
  | { resultat: "introuvable" | "montant_incorrect" };

/**
 * Paiement réussi : la personne devient membre (numéro, date d'adhésion, messages de bienvenue).
 * Idempotent : le webhook et la relecture du statut peuvent l'appeler tous les deux.
 * `montantRecu` (si la passerelle l'indique) doit couvrir le montant attendu.
 */
export async function confirmerPaiement(
  reference: string,
  montantRecu?: number,
): Promise<Confirmation> {
  // Mot de passe envoyé par email ; seule son empreinte est conservée en base.
  const motDePasse = genererMotDePasse();

  const confirmation = await db.transaction(async (tx) => {
    const [paiement] = await tx
      .select()
      .from(paiements)
      .where(eq(paiements.reference, reference))
      .for("update")
      .limit(1);

    if (!paiement) return { resultat: "introuvable" } as const;
    if (paiement.statut === "reussi") {
      return { resultat: "deja_confirme", membreId: paiement.membreId } as const;
    }
    if (montantRecu !== undefined && montantRecu < paiement.montant) {
      console.error("Adhésion : montant insuffisant", { reference, montantRecu, attendu: paiement.montant });
      return { resultat: "montant_incorrect" } as const;
    }

    await tx
      .update(paiements)
      .set({ statut: "reussi", confirmeLe: new Date() })
      .where(eq(paiements.reference, reference));

    const [membre] = await tx
      .update(membres)
      .set({
        statut: "membre",
        numero: sql`coalesce(${membres.numero}, 'CLANS-' || lpad(nextval(${numeroMembreSeq.seqName})::text, 6, '0'))`,
        adhereLe: sql`coalesce(${membres.adhereLe}, now())`,
        motDePasseHash: hacherMotDePasse(motDePasse),
        modifieLe: new Date(),
      })
      .where(eq(membres.id, paiement.membreId))
      .returning();

    // Messages de bienvenue réglés dans l'admin, dans l'ordre, variables remplacées pour ce membre.
    const bienvenue = await messagesBienvenuePour(tx, membre);
    if (bienvenue.length > 0) {
      await tx.insert(messages).values(bienvenue.map((message) => ({ ...message, membreId: membre.id })));
    }

    if (membre.parrainId) await recompenserParrain(tx, membre);

    return { resultat: "confirme", membreId: membre.id, membre } as const;
  });

  if (confirmation.resultat !== "confirme") return confirmation;

  // Après la transaction : les emails passent par la file (réessais automatiques).
  const { membre } = confirmation;
  try {
    await programmerNotification({
      modele: "acces",
      email: membre.email,
      prenom: membre.prenom,
      numero: membre.numero ?? "",
      motDePasse,
    });
    await programmerNotification(
      { modele: "bienvenue", email: membre.email, prenom: membre.prenom },
      DELAI_MESSAGE_BIENVENUE_SECONDES,
    );
  } catch (erreur) {
    // L'adhésion est enregistrée : un échec d'envoi ne doit pas la faire échouer.
    console.error("Adhésion : emails non programmés", { reference, erreur });
  }

  return { resultat: "confirme", membreId: membre.id };
}

type Transaction = Parameters<Parameters<typeof db.transaction>[0]>[0];

/**
 * Parrainage : une étoile (barème « Parrainage membre ») toutes les deux adhésions confirmées.
 * Après la première, l'étoile est « chargée à moitié » ; à la deuxième, elle est gagnée.
 */
async function recompenserParrain(
  tx: Transaction,
  filleul: { id: string; prenom: string; nom: string; parrainId: string | null },
) {
  if (!filleul.parrainId) return;
  const parrainId = filleul.parrainId;
  const [action] = await tx
    .select()
    .from(typesActions)
    .where(and(eq(typesActions.code, "parrainage"), eq(typesActions.actif, true)))
    .limit(1);
  if (!action || action.etoiles === 0) return;

  // Verrou sur le parrain : deux adhésions confirmées en même temps ne forment pas deux fois la même paire.
  await tx.select({ id: membres.id }).from(membres).where(eq(membres.id, parrainId)).for("update");
  const [{ total }] = await tx
    .select({ total: count() })
    .from(membres)
    .where(and(eq(membres.parrainId, parrainId), eq(membres.statut, "membre")));

  const nomFilleul = `${filleul.prenom} ${filleul.nom[0] ?? ""}.`.trim();
  const pluriel = Math.abs(action.etoiles) > 1 ? "s" : "";

  if (total % 2 === 1) {
    await tx.insert(messages).values({
      membreId: parrainId,
      titre: "Ton filleul a rejoint CLANS !",
      contenu: `${nomFilleul} vient de confirmer son adhésion avec ton code de parrainage. Ton étoile est chargée à moitié : encore une adhésion et elle est à toi. Merci de faire grandir l’aventure !`,
      type: "star",
    });
    return;
  }

  // Deuxième adhésion de la paire : l'étoile est gagnée (une seule fois par filleul, même si l'appel est rejoué).
  const ajoute = await tx
    .insert(mouvementsEtoiles)
    .values({
      membreId: parrainId,
      libelle: `Parrainage — 2 adhésions confirmées (dont ${nomFilleul})`,
      variation: action.etoiles,
      typeActionId: action.id,
      filleulId: filleul.id,
    })
    .onConflictDoNothing()
    .returning({ id: mouvementsEtoiles.id });

  if (ajoute.length > 0) {
    await tx.insert(messages).values({
      membreId: parrainId,
      titre: `+${action.etoiles} étoile${pluriel} grâce au parrainage !`,
      contenu: `${nomFilleul} vient de confirmer son adhésion avec ton code de parrainage : c’est ta deuxième adhésion, ton étoile est complète. Tu gagnes ${action.etoiles} étoile${pluriel}. Merci de faire grandir l’aventure !`,
      type: "star",
    });
  }
}
