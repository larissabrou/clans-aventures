import "server-only";
import { and, eq, inArray, isNull, or, sql } from "drizzle-orm";
import { z } from "zod";
import { db } from "./db";
import { groupesWhatsapp, membres, messages, numeroMembreSeq, paiements } from "./db/schema";
import { programmerNotification } from "./jobs";
import { genererMotDePasse, hacherMotDePasse } from "./mot-de-passe";
import { estOperateur, estPays, PAYS } from "./paiement/operateurs";
import { normaliserTelephone, telephoneValide } from "./telephone";
import { UNIVERS } from "./univers";

// Règles métier de l'adhésion : enregistrement du formulaire, puis confirmation du paiement.

/** Cookie qui relie ce navigateur au paiement en cours (ouvre la session une fois payé). */
export const COOKIE_ADHESION = "clans_adhesion";

/**
 * Montant réellement débité, invisible pour le visiteur (qui voit 2 500 FCFA).
 * 500 FCFA par défaut pendant la phase de test ; au lancement, MONTANT_DEBITE=2500.
 */
export function montantADebiter(): number {
  const configure = Number(process.env.MONTANT_DEBITE);
  return Number.isFinite(configure) && configure > 0 ? configure : 500;
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
  appartenance: texteRequis("Indique ton univers culturel.", 80),
  appartenanceAutre: texteOptionnel,
  universADecouvrir: texteOptionnel,
  attente: texteRequis("Dis-nous ce que tu aimerais vivre avec CLANS.", 2000),
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
    appartenance: demande.appartenance,
    appartenanceAutre: demande.appartenance === "autre" ? demande.appartenanceAutre : null,
    universADecouvrir: demande.universADecouvrir,
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

    let membreId: string;
    if (existant) {
      await tx.update(membres).set(profil).where(eq(membres.id, existant.id));
      membreId = existant.id;
    } else {
      const [cree] = await tx.insert(membres).values(profil).returning({ id: membres.id });
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

    const groupes = await tx
      .select({ nom: groupesWhatsapp.nom, lien: groupesWhatsapp.lien })
      .from(groupesWhatsapp)
      .where(
        and(
          eq(groupesWhatsapp.actif, true),
          or(isNull(groupesWhatsapp.univers), inArray(groupesWhatsapp.univers, membre.interets)),
        ),
      );

    await tx
      .insert(messages)
      .values(
        messagesDeBienvenue(membre.prenom, membre.numero ?? "", groupes).map((message) => ({
          ...message,
          membreId: membre.id,
        })),
      );

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

function messagesDeBienvenue(
  prenom: string,
  numero: string,
  groupes: { nom: string; lien: string }[],
) {
  const liste = groupes.length
    ? groupes.map((g) => `• ${g.nom} : ${g.lien}`).join("\n")
    : "Les liens de tes groupes te seront envoyés très bientôt par l’équipe CLANS.";

  return [
    {
      titre: `Bienvenue dans CLANS aventures, ${prenom} !`,
      contenu: `Tu viens officiellement de rejoindre une communauté où les cultures se rencontrent, où les aventures se vivent ensemble et où chaque rencontre peut devenir une histoire.

Ton numéro membre : ${numero}.
Ton pin officiel CLANS te sera remis lors de ta première participation physique.

Ton aventure vient de commencer.`,
      type: "info" as const,
    },
    {
      titre: "Rejoins tes groupes WhatsApp",
      contenu: `Voici les groupes qui correspondent à ton profil :\n\n${liste}`,
      type: "info" as const,
    },
    {
      titre: "Ta première mission CLANS",
      contenu: `Mission 01 — Présente-toi dans CAFÉ CLANS.

« Je m’appelle…, je viens de…, ce que j’aimerais découvrir avec CLANS est… »

C’est le premier pas pour passer de spectateur à participant.`,
      type: "star" as const,
    },
  ];
}
