import "server-only";
import { eq, sql } from "drizzle-orm";
import { z } from "zod";
import { TRANCHES_AGE } from "../adhesion";
import { normaliserCodeParrainage } from "../adhesions";
import { db } from "../db";
import { clans, membres, universCulturels } from "../db/schema";
import { normaliserTelephone, telephoneValide } from "../telephone";
import { UNIVERS } from "../univers";
import { COLONNES, EMAIL_EXEMPLE, normaliserEntete } from "./colonnes";
import type { LigneBrute } from "./lecture";

// Vérifie les lignes du fichier d'import, sans rien écrire : valeurs reconnues, doublons avec les
// membres du site et à l'intérieur du fichier, parrain. Une ligne refusée ne bloque pas les autres.

export type MembreAImporter = {
  ligne: number;
  prenom: string;
  nom: string;
  email: string;
  telephone: string;
  trancheAge: string;
  interets: string[];
  ville: string | null;
  universADecouvrir: string | null;
  attente: string | null;
  clanId: number | null;
  /** Parrain membre du site, ou ligne acceptée plus haut dans le fichier. */
  parrain: { id: string } | { ligne: number } | null;
  numero: string | null;
  adhereLe: Date | null;
};

export type LigneRefusee = { ligne: number; raison: string };

/** Ligne refusée : son message est affiché dans l'aperçu. */
export class LigneInvalide extends Error {}

/** Au-delà, un ancien numéro est presque sûrement une faute de frappe (6 chiffres au maximum). */
export const NUMERO_MAX_IMPORT = 900000;

/** Date d'adhésion la plus ancienne acceptée (au-delà : faute de saisie probable). */
const DATE_ADHESION_MIN = Date.UTC(1950, 0, 1);

const emailValide = (email: string) => z.email().safeParse(email).success;

/** « 15/03/2022 » ou « 2022-03-15 » → date UTC ; null si la date n'existe pas. */
function lireDate(texte: string): Date | null {
  const fr = texte.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
  const iso = texte.match(/^(\d{4})-(\d{2})-(\d{2})/);
  const [annee, mois, jour] = fr ? [+fr[3], +fr[2], +fr[1]] : iso ? [+iso[1], +iso[2], +iso[3]] : [0, 0, 0];
  if (!annee) return null;
  const date = new Date(Date.UTC(annee, mois - 1, jour));
  return date.getUTCFullYear() === annee && date.getUTCMonth() === mois - 1 && date.getUTCDate() === jour ? date : null;
}

// Vérifications de format communes à l'import des comptes et à la liste des anciens membres.

/** E-mail en minuscules ; lève LigneInvalide s'il est invalide ou s'il s'agit de la ligne d'exemple. */
export function verifierEmail(saisie: string): string {
  const email = saisie.trim().toLowerCase();
  if (!emailValide(email)) throw new LigneInvalide("e-mail invalide");
  if (email === EMAIL_EXEMPLE) throw new LigneInvalide("ligne d’exemple du modèle : supprime-la avant l’import");
  return email;
}

/** Téléphone normalisé (2250707070707) ; lève LigneInvalide s'il est invalide. */
export function verifierTelephone(saisie: string): string {
  const telephone = normaliserTelephone(saisie);
  if (!telephoneValide(telephone)) throw new LigneInvalide("téléphone invalide");
  return telephone;
}

/** Ancien numéro normalisé (CLANS-000012) ou null ; lève LigneInvalide s'il est invalide ou trop grand. */
export function verifierNumero(saisie: string | null): string | null {
  if (!saisie) return null;
  const numero = normaliserCodeParrainage(saisie);
  if (!numero || !/^CLANS-\d{6}$/.test(numero)) throw new LigneInvalide(`numéro membre invalide : ${saisie}`);
  // Un numéro géant (faute de frappe) déplacerait pour toujours la numérotation des inscriptions.
  if (Number(numero.slice(6)) > NUMERO_MAX_IMPORT) throw new LigneInvalide(`numéro membre trop grand : ${numero}`);
  return numero;
}

/** Date d'adhésion (cellule date ou texte) ou null ; lève LigneInvalide si invalide ou hors limites. */
export function verifierDateAdhesion(saisie: string | null, cellule?: Date): Date | null {
  const date = cellule ?? (saisie ? lireDate(saisie) : null);
  if (saisie && !date) throw new LigneInvalide(`date d’adhésion invalide : ${saisie}`);
  if (date && (date.getTime() > Date.now() || date.getTime() < DATE_ADHESION_MIN)) {
    throw new LigneInvalide(`date d’adhésion hors limites : ${saisie ?? date.toLocaleDateString("fr-FR")}`);
  }
  return date;
}

export async function analyserImport(
  lignes: LigneBrute[],
): Promise<{ aImporter: MembreAImporter[]; refusees: LigneRefusee[]; prochainNumero: string }> {
  // Membres du site (les inscriptions en attente de paiement seront remplacées, pas comptées en doublon).
  const [existants, listeClans, listeUnivers, [sequence]] = await Promise.all([
    db
      .select({ id: membres.id, email: membres.email, telephone: membres.telephone, numero: membres.numero, statut: membres.statut })
      .from(membres),
    db.select({ id: clans.id, nom: clans.nom }).from(clans).where(eq(clans.actif, true)),
    db.select({ nom: universCulturels.nom }).from(universCulturels).where(eq(universCulturels.actif, true)),
    db
      .execute<{ prochain: string }>(
        sql`select case when is_called then last_value + 1 else last_value end as prochain from numero_membre_seq`,
      )
      .then((r) => r.rows),
  ]);
  const prochainDeLaSequence = Number(sequence?.prochain ?? 1);
  const actifs = existants.filter((m) => m.statut !== "en_attente");
  const enAttente = existants.filter((m) => m.statut === "en_attente");
  const emailsSite = new Set(actifs.map((m) => m.email.toLowerCase()));
  const telephonesSite = new Set(actifs.map((m) => m.telephone));
  const numerosSite = new Map(existants.filter((m) => m.numero).map((m) => [m.numero as string, m]));
  const clansParNom = new Map(listeClans.map((c) => [normaliserEntete(c.nom), c.id]));
  const universParNom = new Map(listeUnivers.map((u) => [normaliserEntete(u.nom), u.nom]));
  const tranches = new Map(
    TRANCHES_AGE.flatMap((t) => [
      [normaliserEntete(t.value), t.value],
      [normaliserEntete(t.label), t.value],
    ]),
  );
  const univers = new Map(
    UNIVERS.flatMap((u) => [
      [normaliserEntete(u.id), u.id],
      [normaliserEntete(u.titre), u.id],
    ]),
  );

  // Lignes déjà acceptées, pour les doublons dans le fichier et les parrains plus haut.
  const vusEmail = new Map<string, number>();
  const vusTelephone = new Map<string, number>();
  const vusNumero = new Map<string, number>();

  const aImporter: MembreAImporter[] = [];
  const refusees: LigneRefusee[] = [];

  for (const { ligne, valeurs, dateAdhesion } of lignes) {
    try {
      const champ = (cle: keyof typeof valeurs) => valeurs[cle]?.trim() || null;
      for (const colonne of COLONNES) {
        if (colonne.obligatoire && !champ(colonne.cle)) {
          throw new LigneInvalide(`champ obligatoire vide : ${colonne.entete}`);
        }
      }

      const email = verifierEmail(champ("email") as string);
      const telephone = verifierTelephone(champ("telephone") as string);

      const trancheSaisie = champ("trancheAge") as string;
      const trancheAge = tranches.get(normaliserEntete(trancheSaisie));
      if (!trancheAge) throw new LigneInvalide(`tranche d’âge inconnue : ${trancheSaisie}`);

      const interets: string[] = [];
      for (const morceau of (champ("univers") as string).split(/[,;]/).map((m) => m.trim()).filter(Boolean)) {
        const id = univers.get(normaliserEntete(morceau));
        if (!id) throw new LigneInvalide(`univers inconnu : ${morceau}`);
        if (!interets.includes(id)) interets.push(id);
      }

      const clanSaisi = champ("clan");
      const clanId = clanSaisi ? clansParNom.get(normaliserEntete(clanSaisi)) : null;
      if (clanSaisi && !clanId) throw new LigneInvalide(`clan inconnu : ${clanSaisi}`);

      const universSaisi = champ("universCulturel");
      const universADecouvrir = universSaisi ? universParNom.get(normaliserEntete(universSaisi)) : null;
      if (universSaisi && !universADecouvrir) throw new LigneInvalide(`univers culturel inconnu : ${universSaisi}`);

      const numero = verifierNumero(champ("numero"));
      const adhereLe = verifierDateAdhesion(champ("dateAdhesion"), dateAdhesion);

      if (emailsSite.has(email)) throw new LigneInvalide("déjà membre du site (même e-mail)");
      if (telephonesSite.has(telephone)) throw new LigneInvalide("déjà membre du site (même téléphone)");
      // L'import remplacerait une seule fiche en attente : deux fiches différentes ne peuvent pas être fusionnées.
      const attenteEmail = enAttente.find((m) => m.email.toLowerCase() === email);
      const attenteTelephone = enAttente.find((m) => m.telephone === telephone);
      if (attenteEmail && attenteTelephone && attenteEmail.id !== attenteTelephone.id) {
        throw new LigneInvalide(
          "deux inscriptions en attente différentes (même e-mail pour l’une, même téléphone pour l’autre)",
        );
      }
      // Un numéro tenu par une inscription en attente est libre (cette fiche n'a pas encore payé).
      const titulaire = numero ? numerosSite.get(numero) : undefined;
      if (numero && titulaire && titulaire.statut !== "en_attente") {
        throw new LigneInvalide(`numéro déjà attribué : ${numero}`);
      }

      const doublon =
        (vusEmail.has(email) && `doublon de la ligne ${vusEmail.get(email)} (même e-mail)`) ||
        (vusTelephone.has(telephone) && `doublon de la ligne ${vusTelephone.get(telephone)} (même téléphone)`) ||
        (numero && vusNumero.has(numero) && `doublon de la ligne ${vusNumero.get(numero)} (même numéro)`);
      if (doublon) throw new LigneInvalide(doublon);

      const codeSaisi = champ("codeParrainage");
      let parrain: MembreAImporter["parrain"] = null;
      if (codeSaisi) {
        const code = normaliserCodeParrainage(codeSaisi);
        const duSite = code ? numerosSite.get(code) : undefined;
        const duFichier = code ? vusNumero.get(code) : undefined;
        if (duSite && duSite.statut === "membre") parrain = { id: duSite.id };
        else if (duFichier !== undefined) parrain = { ligne: duFichier };
        else throw new LigneInvalide(`code de parrainage inconnu : ${codeSaisi}`);
      }

      vusEmail.set(email, ligne);
      vusTelephone.set(telephone, ligne);
      if (numero) vusNumero.set(numero, ligne);
      aImporter.push({
        ligne,
        prenom: champ("prenom") as string,
        nom: champ("nom") as string,
        email,
        telephone,
        trancheAge,
        interets,
        ville: champ("ville"),
        universADecouvrir: universADecouvrir ?? null,
        attente: champ("attentes"),
        clanId: clanId ?? null,
        parrain,
        numero,
        adhereLe,
      });
    } catch (erreur) {
      if (!(erreur instanceof LigneInvalide)) throw erreur;
      refusees.push({ ligne, raison: erreur.message });
    }
  }

  // Prochain numéro des inscriptions en ligne après cet import : affiché dans l'aperçu.
  const plusGrand = Math.max(
    0,
    ...[...existants.map((m) => m.numero), ...aImporter.map((m) => m.numero)]
      .filter((n): n is string => !!n && /^CLANS-\d{6}$/.test(n))
      .map((n) => Number(n.slice(6))),
  );
  const prochain = Math.max(plusGrand + 1, prochainDeLaSequence);
  return { aImporter, refusees, prochainNumero: `CLANS-${String(prochain).padStart(6, "0")}` };
}
