import "server-only";
import { randomBytes } from "node:crypto";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { cache } from "react";
import { and, eq, gt, sql } from "drizzle-orm";
import { emettreCode, empreinteJeton, validerCode } from "./auth";
import { db } from "./db";
import { administrateurs, sessionsAdmin, type Administrateur } from "./db/schema";
import { enProduction, variable } from "./env";
import { hacherMotDePasse, motDePasseValide } from "./mot-de-passe";
import { envoyerNotification } from "./notifications";

// Connexion à l'administration : comptes « administrateurs », indépendants des membres,
// sur /admin/connexion. Les emails de ADMIN_EMAILS (séparés par des virgules) sont toujours
// super admins ; à leur première connexion, ils choisissent leur mot de passe avec un code reçu par email.

const COOKIE_ADMIN = "clans_admin";
const DUREE_SESSION_JOURS = 7;

export type Role = Administrateur["role"];
export type AdminConnecte = Administrateur & { defini: "base" | "variable" };

function emailsSuperAdmin(): string[] {
  return (variable("ADMIN_EMAILS") ?? "")
    .split(",")
    .map((email) => email.trim().toLowerCase())
    .filter(Boolean);
}

export const estSuperAdminParVariable = (email: string) => emailsSuperAdmin().includes(email.toLowerCase());

/** Rôle réel : ADMIN_EMAILS l'emporte sur la base (un super admin ne peut pas être rétrogradé par erreur). */
const roleEffectif = (admin: Pick<Administrateur, "email" | "role">): Role =>
  estSuperAdminParVariable(admin.email) ? "super_admin" : admin.role;

// ---------- Sessions ----------

async function ouvrirSessionAdmin(adminId: string) {
  const jeton = randomBytes(32).toString("base64url");
  const expireLe = new Date(Date.now() + DUREE_SESSION_JOURS * 24 * 3600 * 1000);
  await db.insert(sessionsAdmin).values({ id: empreinteJeton(jeton), adminId, expireLe });
  await db.update(administrateurs).set({ derniereConnexion: sql`now()` }).where(eq(administrateurs.id, adminId));

  (await cookies()).set(COOKIE_ADMIN, jeton, {
    httpOnly: true,
    secure: enProduction,
    sameSite: "lax",
    // Le cookie n'est envoyé qu'aux pages (et Server Functions) de l'administration.
    path: "/admin",
    expires: expireLe,
  });
}

export async function fermerSessionAdmin() {
  const magasin = await cookies();
  const jeton = magasin.get(COOKIE_ADMIN)?.value;
  if (jeton) await db.delete(sessionsAdmin).where(eq(sessionsAdmin.id, empreinteJeton(jeton)));
  magasin.delete({ name: COOKIE_ADMIN, path: "/admin" });
}

/** Administrateur connecté (compte actif), ou null. Lu une seule fois par requête. */
export const adminConnecte = cache(async (): Promise<AdminConnecte | null> => {
  const jeton = (await cookies()).get(COOKIE_ADMIN)?.value;
  if (!jeton) return null;

  const [ligne] = await db
    .select({ admin: administrateurs })
    .from(sessionsAdmin)
    .innerJoin(administrateurs, eq(sessionsAdmin.adminId, administrateurs.id))
    .where(
      and(
        eq(sessionsAdmin.id, empreinteJeton(jeton)),
        gt(sessionsAdmin.expireLe, sql`now()`),
        eq(administrateurs.actif, true),
      ),
    )
    .limit(1);
  if (!ligne) return null;

  const { admin } = ligne;
  return {
    ...admin,
    role: roleEffectif(admin),
    defini: estSuperAdminParVariable(admin.email) ? "variable" : "base",
  };
});

/**
 * Pages de l'admin : renvoie vers /admin/connexion si personne n'est connecté,
 * vers le tableau de bord si la page est réservée au super admin.
 */
export async function exigerAdmin(role?: "super_admin"): Promise<AdminConnecte> {
  const admin = await adminConnecte();
  if (!admin) redirect("/admin/connexion");
  if (role && admin.role !== role) redirect("/admin");
  return admin;
}

/** Server Functions de l'admin : appelables directement, la vérification est indispensable. */
export async function verifierAdmin(role?: "super_admin"): Promise<AdminConnecte> {
  const admin = await adminConnecte();
  if (!admin || (role && admin.role !== role)) throw new Error("Accès réservé à l'administration CLANS.");
  return admin;
}

/** Lien « Administration » dans l'espace membre : un compte admin actif existe pour cet email. */
export async function aUnCompteAdmin(email: string): Promise<boolean> {
  if (estSuperAdminParVariable(email)) return true;
  const [admin] = await db
    .select({ id: administrateurs.id })
    .from(administrateurs)
    .where(and(eq(administrateurs.email, email.toLowerCase()), eq(administrateurs.actif, true)))
    .limit(1);
  return Boolean(admin);
}

// ---------- Connexion ----------

const adminParEmail = async (email: string) => {
  const [admin] = await db.select().from(administrateurs).where(eq(administrateurs.email, email)).limit(1);
  return admin ?? null;
};

/** Email + mot de passe. scrypt rend chaque essai volontairement lent. */
export async function connexionAdmin(email: string, motDePasse: string): Promise<boolean> {
  const admin = await adminParEmail(email);
  if (!admin?.actif || !admin.motDePasseHash || !motDePasseValide(motDePasse, admin.motDePasseHash)) return false;
  await ouvrirSessionAdmin(admin.id);
  return true;
}

const identifiantCode = (email: string) => `admin:${email}`;

/** Première connexion ou mot de passe oublié : code à 6 chiffres par email. */
export async function envoyerCodeAdmin(email: string): Promise<{ ok: true } | { ok: false; message: string }> {
  const admin = await adminParEmail(email);
  // Même réponse pour une adresse inconnue : on ne révèle pas qui est administrateur.
  if (!(admin?.actif || (!admin && estSuperAdminParVariable(email)))) return { ok: true };

  const emission = await emettreCode(identifiantCode(email));
  if (!emission.ok) return emission;
  await envoyerNotification({ modele: "code-admin", email, code: emission.code });
  return { ok: true };
}

/**
 * Code bon : enregistre le nouveau mot de passe, ferme les autres sessions et connecte.
 * Un email de ADMIN_EMAILS sans compte obtient ici son compte super admin.
 */
export async function reinitialiserAdmin(email: string, code: string, nouveau: string): Promise<boolean> {
  let admin = await adminParEmail(email);
  if (admin && !admin.actif) return false;
  if (!admin && !estSuperAdminParVariable(email)) return false;
  if (!(await validerCode(identifiantCode(email), code))) return false;

  if (!admin) {
    [admin] = await db
      .insert(administrateurs)
      .values({ email, prenom: email.split("@")[0], role: "super_admin" })
      .returning();
  }
  await db
    .update(administrateurs)
    .set({ motDePasseHash: hacherMotDePasse(nouveau) })
    .where(eq(administrateurs.id, admin.id));
  await db.delete(sessionsAdmin).where(eq(sessionsAdmin.adminId, admin.id));
  await ouvrirSessionAdmin(admin.id);
  return true;
}
