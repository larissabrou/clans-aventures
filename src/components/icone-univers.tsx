import type { Univers } from "@/lib/univers";

// Icônes des 4 univers CLANS, dessinées en SVG (nettes à toute taille).
// Même grammaire pour les 4 : pastille vert forêt, trait blanc de 1,75 aux extrémités arrondies,
// le masque Culture reprend les couleurs terre et sable de la charte.

const TRAIT = {
  fill: "none",
  stroke: "#FFFFFF",
  strokeWidth: 1.75,
  strokeLinecap: "round",
  strokeLinejoin: "round",
} as const;

const DESSINS: Record<Univers["id"], React.ReactNode> = {
  // Tente posée sur le sol, porte ouverte.
  aventure: (
    <g {...TRAIT}>
      <path d="M12 33.5h24" />
      <path d="M14.5 33.5 24 15l9.5 18.5" />
      <path d="M24 15v3" />
      <path d="M20.5 33.5 24 26.5l3.5 7" />
    </g>
  ),
  // Cœur plein.
  rencontres: (
    <path
      fill="#FFFFFF"
      d="M24 33.6s-10.6-6.3-10.6-13.1c0-3.2 2.5-5.6 5.4-5.6 2.2 0 4 1.2 5.2 3.1 1.2-1.9 3-3.1 5.2-3.1 2.9 0 5.4 2.4 5.4 5.6 0 6.8-10.6 13.1-10.6 13.1Z"
    />
  ),
  // Masque africain stylisé : visage terre, motifs sable.
  culture: (
    <g>
      <path
        fill="#B45A2A"
        stroke="#D9C29A"
        strokeWidth={1.25}
        d="M24 11.5c5.6 0 9 4.6 9 10.6 0 7.3-4.4 14.4-9 14.4s-9-7.1-9-14.4c0-6 3.4-10.6 9-10.6Z"
      />
      <path {...TRAIT} stroke="#D9C29A" strokeWidth={1.25} d="M20 16.2 22 14.5l2 1.7 2-1.7 2 1.7" />
      <path fill="#F6F0E4" d="M18.4 21.6c1-1.3 3.4-1.3 4.4 0-1 1.3-3.4 1.3-4.4 0Zm6.8 0c1-1.3 3.4-1.3 4.4 0-1 1.3-3.4 1.3-4.4 0Z" />
      <path {...TRAIT} stroke="#D9C29A" strokeWidth={1.25} d="M24 22.8v5.4m-2.6 3.3h5.2" />
    </g>
  ),
  // Mallette.
  reseau: (
    <g {...TRAIT}>
      <rect x="12.5" y="18.5" width="23" height="15" rx="2.5" />
      <path d="M19.5 18.5v-2a2 2 0 0 1 2-2h5a2 2 0 0 1 2 2v2" />
      <path d="M12.5 24.5h23" />
      <rect x="21.5" y="22.5" width="5" height="4" rx="1" fill="#123B2A" />
    </g>
  ),
};

export function IconeUnivers({ id, className = "size-12" }: { id: Univers["id"]; className?: string }) {
  return (
    <svg viewBox="0 0 48 48" className={className} aria-hidden="true">
      <circle cx="24" cy="24" r="24" fill="#123B2A" />
      {DESSINS[id]}
    </svg>
  );
}
