"use server";

import { refresh } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { verifierAdmin } from "@/lib/admin";
import { creerTypeAction, modifierTypeAction, supprimerTypeAction } from "@/lib/bareme";
import { creerClan, modifierClan, supprimerClan } from "@/lib/clans";
import {
  ErreurEvenement,
  ajouterParticipant,
  creerEvenement,
  marquerPresence,
  modifierEvenement,
  retirerParticipant,
  supprimerEvenement,
} from "@/lib/evenements";
import {
  ErreurGestion,
  ajusterEtoiles,
  attribuerAction,
  changerClan,
  supprimerMouvement,
} from "@/lib/gestion-membres";
import { ErreurEnvoi, envoyerMessage, supprimerEnvoi } from "@/lib/envois";
import {
  ErreurImage,
  enregistrerImageEvenement,
  lireImageEnvoyee,
  supprimerImageEvenement,
} from "@/lib/images";
import { definirPrixAdhesion } from "@/lib/parametres";

// Server Functions de l'administration. Chacune revérifie les droits : elles sont appelables directement.

export type EtatAction = { ok: boolean; message: string } | null;

z.config(z.locales.fr());

const texte = (message: string, max = 120) => z.string({ error: message }).trim().min(1, message).max(max);
const texteOptionnel = (max = 2000) =>
  z
    .string()
    .trim()
    .max(max)
    .optional()
    .transform((v) => v || null);
const entier = (message: string) =>
  z.coerce.number({ error: message }).int(message);
const entierOptionnel = (min: number, message: string) =>
  z
    .string()
    .trim()
    .optional()
    .transform((v) => (v ? Number(v) : null))
    .refine((v) => v === null || (Number.isInteger(v) && v >= min), message);
const caseACocher = z
  .string()
  .optional()
  .transform((v) => v === "on" || v === "1");
const identifiant = z.coerce.number().int().positive();

function lire(formulaire: FormData) {
  return Object.fromEntries(
    [...formulaire.entries()].filter((entree): entree is [string, string] => typeof entree[1] === "string"),
  );
}

/** Vérifie les droits, valide, exécute, puis rafraîchit la page. Les erreurs connues deviennent un message. */
async function executer<T>(
  schema: z.ZodType<T>,
  formulaire: FormData,
  travail: (donnees: T) => Promise<string>,
): Promise<EtatAction> {
  await verifierAdmin();
  const analyse = schema.safeParse(lire(formulaire));
  if (!analyse.success) return { ok: false, message: analyse.error.issues[0]?.message ?? "Formulaire invalide." };
  try {
    const message = await travail(analyse.data);
    refresh();
    return { ok: true, message };
  } catch (erreur) {
    if (
      erreur instanceof ErreurEvenement ||
      erreur instanceof ErreurGestion ||
      erreur instanceof ErreurEnvoi ||
      erreur instanceof ErreurImage
    ) {
      return { ok: false, message: erreur.message };
    }
    if (estDoublon(erreur)) return { ok: false, message: "Ce nom existe déjà." };
    throw erreur;
  }
}

/** Violation d'unicité PostgreSQL (ex. deux clans du même nom). */
function estDoublon(erreur: unknown): boolean {
  const cause = (erreur as { cause?: { code?: string }; code?: string } | null) ?? {};
  return cause.code === "23505" || cause.cause?.code === "23505";
}

// ---------- Clans ----------

const schemaClan = z.object({
  nom: texte("Indique le nom du clan.", 60),
  description: texteOptionnel(300),
  actif: caseACocher,
});

export async function actionCreerClan(_: EtatAction, formulaire: FormData) {
  return executer(schemaClan, formulaire, async (clan) => {
    await creerClan(clan);
    return `Clan « ${clan.nom} » ajouté.`;
  });
}

export async function actionModifierClan(_: EtatAction, formulaire: FormData) {
  return executer(schemaClan.extend({ id: identifiant }), formulaire, async ({ id, ...clan }) => {
    await modifierClan(id, clan);
    return "Clan enregistré.";
  });
}

export async function actionSupprimerClan(_: EtatAction, formulaire: FormData) {
  return executer(z.object({ id: identifiant }), formulaire, async ({ id }) => {
    await supprimerClan(id);
    return "Clan supprimé.";
  });
}

// ---------- Types d'actions (barème des étoiles) ----------

const schemaTypeAction = z.object({
  nom: texte("Indique le nom de l’action.", 80),
  etoiles: entier("Indique un nombre d’étoiles entier.").min(-1000).max(1000),
  actif: caseACocher,
});

export async function actionCreerTypeAction(_: EtatAction, formulaire: FormData): Promise<EtatAction> {
  await verifierAdmin();
  const analyse = schemaTypeAction.safeParse(lire(formulaire));
  if (!analyse.success) return { ok: false, message: analyse.error.issues[0]?.message ?? "Formulaire invalide." };
  await creerTypeAction(analyse.data);
  // Retour à la liste, où le nouveau type apparaît.
  redirect("/admin/types-actions");
}

export async function actionModifierTypeAction(_: EtatAction, formulaire: FormData) {
  return executer(schemaTypeAction.extend({ id: identifiant }), formulaire, async ({ id, ...action }) => {
    await modifierTypeAction(id, action);
    return "Type d’action enregistré.";
  });
}

export async function actionSupprimerTypeAction(_: EtatAction, formulaire: FormData): Promise<EtatAction> {
  await verifierAdmin();
  const analyse = z.object({ id: identifiant }).safeParse(lire(formulaire));
  if (!analyse.success) return { ok: false, message: "Type d’action invalide." };
  await supprimerTypeAction(analyse.data.id);
  redirect("/admin/types-actions");
}

// ---------- Réglages ----------

export async function actionPrixAdhesion(_: EtatAction, formulaire: FormData) {
  const schema = z.object({
    prix: entier("Indique un prix entier en FCFA.").min(100, "Le prix doit être d’au moins 100 FCFA.").max(1_000_000),
  });
  return executer(schema, formulaire, async ({ prix }) => {
    await definirPrixAdhesion(prix);
    return "Prix de l’adhésion enregistré.";
  });
}

// ---------- Événements ----------

const schemaEvenement = z.object({
  titre: texte("Indique le titre de l’événement."),
  description: texteOptionnel(),
  conditions: texteOptionnel(),
  typeActionId: entierOptionnel(1, "Type d’action invalide."),
  // <input type="datetime-local"> : heure d'Abidjan, qui est l'heure UTC.
  date: z
    .string({ error: "Indique la date et l’heure." })
    .regex(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/, "Indique la date et l’heure.")
    .transform((v) => new Date(`${v}:00Z`)),
  lieu: texteOptionnel(200),
  prix: entierOptionnel(0, "Le prix doit être un nombre entier positif."),
  places: entierOptionnel(1, "Le nombre de places doit être d’au moins 1."),
  obligatoire: caseACocher,
  penalite: entierOptionnel(0, "La pénalité doit être un nombre entier positif.").transform((v) => v ?? 0),
});

export async function actionCreerEvenement(_: EtatAction, formulaire: FormData): Promise<EtatAction> {
  await verifierAdmin();
  const analyse = schemaEvenement.safeParse(lire(formulaire));
  if (!analyse.success) return { ok: false, message: analyse.error.issues[0]?.message ?? "Formulaire invalide." };
  // Image vérifiée avant de créer l'événement : une image refusée n'en crée pas un à moitié.
  let image: Awaited<ReturnType<typeof lireImageEnvoyee>>;
  try {
    image = await lireImageEnvoyee(formulaire.get("image"));
  } catch (erreur) {
    if (erreur instanceof ErreurImage) return { ok: false, message: erreur.message };
    throw erreur;
  }
  const id = await creerEvenement(analyse.data);
  if (image) await enregistrerImageEvenement(id, image);
  // Page de l'événement : on peut y ajouter les participants.
  redirect(`/admin/evenements/${id}`);
}

export async function actionModifierEvenement(_: EtatAction, formulaire: FormData) {
  const schema = schemaEvenement.extend({ id: identifiant, retirerImage: caseACocher });
  return executer(schema, formulaire, async ({ id, retirerImage, ...evenement }) => {
    const image = await lireImageEnvoyee(formulaire.get("image"));
    await modifierEvenement(id, evenement);
    if (image) await enregistrerImageEvenement(id, image);
    else if (retirerImage) await supprimerImageEvenement(id);
    return "Événement enregistré.";
  });
}

export async function actionSupprimerEvenement(_: EtatAction, formulaire: FormData): Promise<EtatAction> {
  await verifierAdmin();
  const analyse = z.object({ id: identifiant }).safeParse(lire(formulaire));
  if (!analyse.success) return { ok: false, message: "Événement invalide." };
  await supprimerEvenement(analyse.data.id);
  redirect("/admin/evenements");
}

export async function actionAjouterParticipant(_: EtatAction, formulaire: FormData) {
  const schema = z.object({ evenementId: identifiant, numero: texte("Indique le numéro du membre.", 30) });
  return executer(schema, formulaire, async ({ evenementId, numero }) => {
    await ajouterParticipant(evenementId, numero);
    return "Participant ajouté.";
  });
}

export async function actionRetirerParticipant(_: EtatAction, formulaire: FormData) {
  return executer(z.object({ participationId: identifiant }), formulaire, async ({ participationId }) => {
    await retirerParticipant(participationId);
    return "Participant retiré.";
  });
}

export async function actionMarquerPresence(_: EtatAction, formulaire: FormData) {
  const schema = z.object({ participationId: identifiant, present: caseACocher });
  return executer(schema, formulaire, async ({ participationId, present }) => {
    await marquerPresence(participationId, present);
    return present ? "Présence validée." : "Présence annulée.";
  });
}

// ---------- Messages ----------

const schemaEnvoi = z
  .object({
    genre: z.enum(["tous", "clan", "membre"], { error: "Choisis les destinataires." }),
    clanId: entierOptionnel(1, "Clan invalide."),
    numero: z.string().trim().max(30).optional(),
    titre: texte("Indique le titre du message.", 120),
    contenu: texte("Écris le message.", 5000),
    type: z.enum(["info", "event", "warning", "star"], { error: "Choisis le type de message." }),
  })
  .refine((v) => v.genre !== "clan" || v.clanId !== null, { message: "Choisis le clan." })
  .refine((v) => v.genre !== "membre" || Boolean(v.numero), { message: "Indique le numéro du membre." });

export async function actionEnvoyerMessage(_: EtatAction, formulaire: FormData) {
  return executer(schemaEnvoi, formulaire, async ({ genre, clanId, numero, titre, contenu, type }) => {
    const cible =
      genre === "clan"
        ? { genre, clanId: clanId! }
        : genre === "membre"
          ? { genre, numero: numero ?? "" }
          : { genre };
    const nombre = await envoyerMessage(cible, { titre, contenu, type });
    return `Message envoyé à ${nombre} membre${nombre > 1 ? "s" : ""}.`;
  });
}

export async function actionSupprimerEnvoi(_: EtatAction, formulaire: FormData) {
  return executer(z.object({ id: identifiant }), formulaire, async ({ id }) => {
    await supprimerEnvoi(id);
    return "Message retiré des espaces membres.";
  });
}

// ---------- Membres ----------

const membreId = z.uuid();

export async function actionChangerClan(_: EtatAction, formulaire: FormData) {
  const schema = z.object({ membreId, clanId: entierOptionnel(1, "Clan invalide.") });
  return executer(schema, formulaire, async ({ membreId, clanId }) => {
    await changerClan(membreId, clanId);
    return "Clan enregistré.";
  });
}

export async function actionAttribuerAction(_: EtatAction, formulaire: FormData) {
  const schema = z.object({
    membreId,
    typeActionId: z.coerce.number({ error: "Choisis une action." }).int().positive("Choisis une action."),
    precision: texteOptionnel(120),
  });
  return executer(schema, formulaire, async ({ membreId, typeActionId, precision }) => {
    await attribuerAction(membreId, typeActionId, precision);
    return "Étoiles attribuées.";
  });
}

export async function actionAjusterEtoiles(_: EtatAction, formulaire: FormData) {
  const schema = z.object({
    membreId,
    variation: entier("Indique un nombre d’étoiles entier.")
      .min(-1000)
      .max(1000)
      .refine((v) => v !== 0, "Indique un nombre d’étoiles différent de 0."),
    libelle: texte("Indique le motif.", 120),
  });
  return executer(schema, formulaire, async ({ membreId, variation, libelle }) => {
    await ajusterEtoiles(membreId, variation, libelle);
    return "Solde d’étoiles mis à jour.";
  });
}

export async function actionSupprimerMouvement(_: EtatAction, formulaire: FormData) {
  return executer(z.object({ id: identifiant }), formulaire, async ({ id }) => {
    await supprimerMouvement(id);
    return "Mouvement annulé.";
  });
}
