// Normalisation des numéros (WhatsApp et connexion). Partagé navigateur / serveur : aucune donnée secrète.

/**
 * Numéro international en chiffres uniquement, sans « + » (ex. 2250700000000).
 * Un numéro saisi sans indicatif reçoit celui du pays par défaut (Côte d'Ivoire).
 */
export function normaliserTelephone(saisie: string, indicatifParDefaut = "225"): string {
  const brut = saisie.trim();
  const chiffres = brut.replace(/\D/g, "");

  if (brut.startsWith("+")) return chiffres;
  if (chiffres.startsWith("00")) return chiffres.slice(2);
  if (chiffres.startsWith(indicatifParDefaut) && chiffres.length > 10) return chiffres;

  // En Côte d'Ivoire, le 0 initial fait partie du numéro à 10 chiffres : on le garde.
  return indicatifParDefaut + chiffres;
}

export function telephoneValide(chiffres: string): boolean {
  return /^\d{10,15}$/.test(chiffres);
}

/** Affichage masqué : +225 07 •• •• •• 12 */
export function masquerTelephone(chiffres: string): string {
  return `+${chiffres.slice(0, -6)} •• •• ${chiffres.slice(-2)}`;
}
