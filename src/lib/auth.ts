import "server-only";
import { createHash, createHmac, randomBytes, randomInt, timingSafeEqual } from "node:crypto";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { cache } from "react";
import { and, count, desc, eq, gt, sql } from "drizzle-orm";
import { db } from "./db";
import { codesConnexion, membres, sessions, type Membre } from "./db/schema";
import { enProduction, secretAuth } from "./env";
import { envoyerNotification } from "./notifications";

// Connexion sans mot de passe : un code à 6 chiffres est envoyé par email au membre,
// puis une session est ouverte dans un cookie httpOnly.

const COOKIE_SESSION = "clans_session";
const DUREE_SESSION_JOURS = 30;
const DUREE_CODE_MINUTES = 10;
const ESSAIS_MAX_PAR_CODE = 5;
const CODES_MAX_PAR_HEURE = 5;
const DELAI_ENTRE_CODES_SECONDES = 60;

const empreinteJeton = (jeton: string) => createHash("sha256").update(jeton).digest("hex");
const empreinteCode = (identifiant: string, code: string) =>
  createHmac("sha256", secretAuth()).update(`${identifiant}:${code}`).digest("hex");

// ---------- Sessions ----------

/** Ouvre une session pour ce membre et pose le cookie (route handler ou server action uniquement). */
export async function ouvrirSession(membreId: string) {
  const jeton = randomBytes(32).toString("base64url");
  const expireLe = new Date(Date.now() + DUREE_SESSION_JOURS * 24 * 3600 * 1000);

  await db.insert(sessions).values({ id: empreinteJeton(jeton), membreId, expireLe });

  (await cookies()).set(COOKIE_SESSION, jeton, {
    httpOnly: true,
    secure: enProduction,
    sameSite: "lax",
    path: "/",
    expires: expireLe,
  });
}

export async function fermerSession() {
  const magasin = await cookies();
  const jeton = magasin.get(COOKIE_SESSION)?.value;
  if (jeton) await db.delete(sessions).where(eq(sessions.id, empreinteJeton(jeton)));
  magasin.delete(COOKIE_SESSION);
}

/** Membre connecté, ou null. Lu une seule fois par requête grâce à cache(). */
export const membreConnecte = cache(async (): Promise<Membre | null> => {
  const jeton = (await cookies()).get(COOKIE_SESSION)?.value;
  if (!jeton) return null;

  const [ligne] = await db
    .select({ membre: membres })
    .from(sessions)
    .innerJoin(membres, eq(sessions.membreId, membres.id))
    // now() côté PostgreSQL : Next.js interdit new Date() pendant le pré-rendu des pages.
    .where(and(eq(sessions.id, empreinteJeton(jeton)), gt(sessions.expireLe, sql`now()`)))
    .limit(1);

  if (!ligne || ligne.membre.statut !== "membre") return null;
  return ligne.membre;
});

/** Comme membreConnecte, mais renvoie vers /connexion si personne n'est connecté. */
export async function exigerMembre(): Promise<Membre> {
  const membre = await membreConnecte();
  if (!membre) redirect("/connexion");
  return membre;
}

// ---------- Codes de connexion (par email pour l'instant) ----------

export type ResultatDemandeCode = { ok: true } | { ok: false; message: string };

const membreParEmail = async (email: string) => {
  const [membre] = await db
    .select({ id: membres.id })
    .from(membres)
    .where(and(eq(membres.email, email), eq(membres.statut, "membre")))
    .limit(1);
  return membre;
};

export async function envoyerCodeConnexion(email: string): Promise<ResultatDemandeCode> {
  // Même réponse que l'adresse soit membre ou non : on ne révèle pas qui est inscrit.
  if (!(await membreParEmail(email))) return { ok: true };

  const ilYaUneHeure = new Date(Date.now() - 3600 * 1000);
  const [{ total }] = await db
    .select({ total: count() })
    .from(codesConnexion)
    .where(and(eq(codesConnexion.email, email), gt(codesConnexion.creeLe, ilYaUneHeure)));
  if (total >= CODES_MAX_PAR_HEURE) {
    return { ok: false, message: "Trop de demandes. Réessaie dans une heure." };
  }

  const [dernier] = await db
    .select({ creeLe: codesConnexion.creeLe })
    .from(codesConnexion)
    .where(eq(codesConnexion.email, email))
    .orderBy(desc(codesConnexion.creeLe))
    .limit(1);
  if (dernier && Date.now() - dernier.creeLe.getTime() < DELAI_ENTRE_CODES_SECONDES * 1000) {
    return { ok: false, message: "Un code vient d’être envoyé. Patiente une minute avant d’en redemander un." };
  }

  const code = randomInt(0, 1_000_000).toString().padStart(6, "0");
  await db.insert(codesConnexion).values({
    email,
    empreinte: empreinteCode(email, code),
    expireLe: new Date(Date.now() + DUREE_CODE_MINUTES * 60 * 1000),
  });

  // Envoi immédiat (pas de file d'attente) : la personne attend le code devant l'écran.
  await envoyerNotification({ modele: "code", email, code });
  return { ok: true };
}

/** Vérifie le code et ouvre la session. */
export async function verifierCodeConnexion(email: string, code: string): Promise<boolean> {
  const [dernier] = await db
    .select()
    .from(codesConnexion)
    .where(and(eq(codesConnexion.email, email), gt(codesConnexion.expireLe, new Date())))
    .orderBy(desc(codesConnexion.creeLe))
    .limit(1);

  if (!dernier || dernier.tentatives >= ESSAIS_MAX_PAR_CODE) return false;

  const attendue = Buffer.from(dernier.empreinte);
  const recue = Buffer.from(empreinteCode(email, code));
  if (!timingSafeEqual(attendue, recue)) {
    await db
      .update(codesConnexion)
      .set({ tentatives: dernier.tentatives + 1 })
      .where(eq(codesConnexion.id, dernier.id));
    return false;
  }

  const membre = await membreParEmail(email);
  if (!membre) return false;

  await db.delete(codesConnexion).where(eq(codesConnexion.email, email));
  await ouvrirSession(membre.id);
  return true;
}
