import "server-only";
import { and, asc, eq, ne } from "drizzle-orm";
import { estSuperAdminParVariable, type AdminConnecte, type Role } from "./admin";
import { db } from "./db";
import { administrateurs, sessionsAdmin } from "./db/schema";
import { programmerNotification } from "./jobs";
import { genererMotDePasse, hacherMotDePasse } from "./mot-de-passe";

// Gestion des comptes d'administration, réservée aux super admins.

export class ErreurAdministrateur extends Error {}

export async function listeAdministrateurs() {
  const comptes = await db.select().from(administrateurs).orderBy(asc(administrateurs.creeLe));
  return comptes.map((admin) => ({
    ...admin,
    variable: estSuperAdminParVariable(admin.email),
    role: estSuperAdminParVariable(admin.email) ? ("super_admin" as const) : admin.role,
  }));
}

/** Création : mot de passe généré, envoyé par email (seule son empreinte est conservée). */
export async function creerAdministrateur(donnees: { prenom: string; nom: string; email: string; role: Role }) {
  const email = donnees.email.toLowerCase();
  const [existant] = await db.select({ id: administrateurs.id }).from(administrateurs).where(eq(administrateurs.email, email)).limit(1);
  if (existant) throw new ErreurAdministrateur("Un administrateur utilise déjà cet email.");

  const motDePasse = genererMotDePasse();
  await db.insert(administrateurs).values({ ...donnees, email, motDePasseHash: hacherMotDePasse(motDePasse) });
  await programmerNotification({
    modele: "acces-admin",
    email,
    prenom: donnees.prenom,
    motDePasse,
    superAdmin: donnees.role === "super_admin",
  });
}

/** Il reste au moins un autre super admin actif (en base ou dans ADMIN_EMAILS). */
async function autreSuperAdmin(sauf: string): Promise<boolean> {
  const autres = await db
    .select({ email: administrateurs.email, role: administrateurs.role })
    .from(administrateurs)
    .where(and(eq(administrateurs.actif, true), ne(administrateurs.id, sauf)));
  return autres.some((a) => a.role === "super_admin" || estSuperAdminParVariable(a.email));
}

async function compte(id: string) {
  const [admin] = await db.select().from(administrateurs).where(eq(administrateurs.id, id)).limit(1);
  if (!admin) throw new ErreurAdministrateur("Administrateur introuvable.");
  return admin;
}

/** Rôle et statut. On ne peut pas se retirer ses propres droits, ni toucher un compte de ADMIN_EMAILS. */
export async function modifierAdministrateur(
  id: string,
  changements: { prenom: string; nom: string; role: Role; actif: boolean },
  auteur: AdminConnecte,
) {
  const admin = await compte(id);
  const retireDesDroits = changements.role !== "super_admin" || !changements.actif;

  if (estSuperAdminParVariable(admin.email) && retireDesDroits) {
    throw new ErreurAdministrateur("Ce compte est défini par la variable ADMIN_EMAILS : il reste super admin et actif.");
  }
  if (admin.id === auteur.id && (changements.role !== auteur.role || !changements.actif)) {
    throw new ErreurAdministrateur("Tu ne peux pas modifier ton propre rôle ni désactiver ton compte.");
  }
  if (admin.role === "super_admin" && retireDesDroits && !(await autreSuperAdmin(admin.id))) {
    throw new ErreurAdministrateur("Il doit rester au moins un super admin actif.");
  }

  await db.update(administrateurs).set(changements).where(eq(administrateurs.id, id));
  // Compte désactivé : ses sessions sont fermées tout de suite.
  if (!changements.actif) await db.delete(sessionsAdmin).where(eq(sessionsAdmin.adminId, id));
}

/** Nouveau mot de passe envoyé par email ; les sessions ouvertes sont fermées. */
export async function renvoyerMotDePasse(id: string) {
  const admin = await compte(id);
  const motDePasse = genererMotDePasse();
  await db.update(administrateurs).set({ motDePasseHash: hacherMotDePasse(motDePasse) }).where(eq(administrateurs.id, id));
  await db.delete(sessionsAdmin).where(eq(sessionsAdmin.adminId, id));
  await programmerNotification({
    modele: "acces-admin",
    email: admin.email,
    prenom: admin.prenom,
    motDePasse,
    superAdmin: admin.role === "super_admin" || estSuperAdminParVariable(admin.email),
  });
}

export async function supprimerAdministrateur(id: string, auteur: AdminConnecte) {
  const admin = await compte(id);
  if (admin.id === auteur.id) throw new ErreurAdministrateur("Tu ne peux pas supprimer ton propre compte.");
  if (estSuperAdminParVariable(admin.email)) {
    throw new ErreurAdministrateur("Ce compte est défini par la variable ADMIN_EMAILS : retire-le d’abord de Coolify.");
  }
  if (admin.role === "super_admin" && !(await autreSuperAdmin(admin.id))) {
    throw new ErreurAdministrateur("Il doit rester au moins un super admin actif.");
  }
  await db.delete(administrateurs).where(eq(administrateurs.id, id));
}
