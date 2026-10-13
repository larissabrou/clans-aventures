import "server-only";

// Variables d'environnement du serveur, lues à la demande (jamais au build).
// Une variable manquante en production lève une erreur claire au lieu d'un comportement silencieux.

const enProduction = process.env.NODE_ENV === "production";

export function variable(nom: string): string | undefined {
  const valeur = process.env[nom]?.trim();
  return valeur ? valeur : undefined;
}

export function variableObligatoire(nom: string): string {
  const valeur = variable(nom);
  if (!valeur) {
    throw new Error(`Variable d'environnement manquante : ${nom} (voir .env.example)`);
  }
  return valeur;
}

/** Secret servant à signer les codes de connexion. Obligatoire en production. */
export function secretAuth(): string {
  const secret = variable("AUTH_SECRET");
  if (secret) return secret;
  if (enProduction) variableObligatoire("AUTH_SECRET");
  return "secret-de-developpement-a-ne-pas-utiliser-en-production";
}

/** Adresse publique du site, sans « / » final (liens envoyés par email). */
export function urlSite(): string {
  return (variable("NEXT_PUBLIC_SITE_URL") ?? "http://localhost:3000").replace(/\/+$/, "");
}

export { enProduction };
