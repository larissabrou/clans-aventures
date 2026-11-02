/**
 * Étoile qui se remplit d'or de gauche à droite : 0 (vide), 0.5 (à moitié), 1 (pleine).
 * `id` doit être unique dans la page (dégradé SVG).
 */
export function EtoileProgression({
  id,
  remplissage,
  className = "size-8",
  libelle,
}: {
  id: string;
  remplissage: number;
  className?: string;
  libelle?: string;
}) {
  const part = `${Math.min(Math.max(remplissage, 0), 1) * 100}%`;
  return (
    <svg viewBox="0 0 24 24" className={className} role={libelle ? "img" : undefined} aria-label={libelle} aria-hidden={!libelle}>
      <defs>
        {/* Arrêt net : or jusqu'à `part`, transparent ensuite. */}
        <linearGradient id={id} x1="0" x2="1" y1="0" y2="0">
          <stop offset={part} style={{ stopColor: "var(--color-sable)" }} />
          <stop offset={part} style={{ stopColor: "transparent" }} />
        </linearGradient>
      </defs>
      <polygon
        points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"
        // Couleurs en style : var(--…) n'est pas lu de façon fiable dans les attributs SVG.
        style={{ fill: `url(#${id})`, stroke: "var(--color-sable)" }}
        strokeWidth={1.4}
        strokeLinejoin="round"
      />
    </svg>
  );
}
