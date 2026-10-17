import "server-only";
import { randomBytes, randomInt, scryptSync, timingSafeEqual } from "node:crypto";

// Mots de passe des membres : générés à l'adhésion, envoyés par email, stockés hachés (scrypt).

// Sans caractères ambigus (0/O, 1/l/I) : le membre doit pouvoir le recopier depuis son email.
const ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789";

export function genererMotDePasse(longueur = 10): string {
  let resultat = "";
  for (let i = 0; i < longueur; i += 1) {
    resultat += ALPHABET[randomInt(ALPHABET.length)];
  }
  return resultat;
}

/** Règle des mots de passe choisis par les membres. Renvoie un message d'erreur, ou null si conforme. */
export function erreurNouveauMotDePasse(nouveau: string, confirmation: string): string | null {
  if (nouveau.length < 8) return "Ton nouveau mot de passe doit contenir au moins 8 caractères.";
  if (nouveau.length > 128) return "Ton nouveau mot de passe est trop long (128 caractères au maximum).";
  if (nouveau !== confirmation) return "Les deux mots de passe ne sont pas identiques.";
  return null;
}

/** Empreinte « scrypt$sel$hash » : le mot de passe lui-même n'est jamais stocké. */
export function hacherMotDePasse(motDePasse: string): string {
  const sel = randomBytes(16).toString("hex");
  const hash = scryptSync(motDePasse, sel, 64).toString("hex");
  return `scrypt$${sel}$${hash}`;
}

export function motDePasseValide(motDePasse: string, empreinte: string): boolean {
  const [algo, sel, hash] = empreinte.split("$");
  if (algo !== "scrypt" || !sel || !hash) return false;
  const calcule = scryptSync(motDePasse, sel, 64);
  const attendu = Buffer.from(hash, "hex");
  return calcule.length === attendu.length && timingSafeEqual(calcule, attendu);
}
