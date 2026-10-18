import "server-only";
import { redirect } from "next/navigation";
import { membreConnecte } from "./auth";
import type { Membre } from "./db/schema";
import { variable } from "./env";

// Accès à l'administration : membres dont l'email figure dans ADMIN_EMAILS (séparés par des virgules).
// Ils se connectent comme tout membre, puis accèdent à /admin.

function emailsAdmin(): string[] {
  return (variable("ADMIN_EMAILS") ?? "")
    .split(",")
    .map((email) => email.trim().toLowerCase())
    .filter(Boolean);
}

export function estAdmin(membre: Pick<Membre, "email"> | null): boolean {
  return membre !== null && emailsAdmin().includes(membre.email.toLowerCase());
}

/**
 * Pages de l'admin : renvoie vers la connexion (qui ramène ensuite à /admin),
 * ou vers l'espace membre si ce n'est pas un admin.
 */
export async function exigerAdmin(): Promise<Membre> {
  const membre = await membreConnecte();
  if (!membre) redirect("/connexion?suite=/admin");
  if (!estAdmin(membre)) redirect("/espace-membre");
  return membre;
}

/** Server Functions de l'admin : elles sont appelables directement, la vérification est indispensable. */
export async function verifierAdmin(): Promise<Membre> {
  const membre = await membreConnecte();
  if (!membre || !estAdmin(membre)) throw new Error("Accès réservé à l'administration CLANS.");
  return membre;
}
