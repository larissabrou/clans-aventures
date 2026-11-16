// Outils de mesure d'audience (pixel Meta, Google Tag Manager) : l'espace d'administration n'est pas suivi.
export function estPageSuivie(pathname: string) {
  return !pathname.startsWith("/admin");
}
