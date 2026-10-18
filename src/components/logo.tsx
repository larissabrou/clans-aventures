import Image from "next/image";

// Logo CLANS, en trois variantes :
// - "complet" : symbole + nom « clans aventures », pour les fonds clairs (en-tête) ;
// - "complet-blanc" : le même, entièrement blanc, pour les fonds sombres (espace membre, admin) ;
// - "couleur" : symbole seul en couleur, pour les fonds clairs (emails, favicon) ;
// - "blanc"   : symbole seul en blanc, pour les fonds sombres (bandeaux verts).
const VARIANTES = {
  complet: { src: "/images/logo-clans-complet.png", width: 1200, height: 942 },
  "complet-blanc": { src: "/images/logo-clans-complet-blanc.png", width: 1200, height: 942 },
  couleur: { src: "/images/logo-clans.png", width: 788, height: 1333 },
  blanc: { src: "/images/logo-clans-blanc.png", width: 788, height: 1333 },
} as const;

export function Logo({
  variant = "blanc",
  className = "h-12 w-auto",
  preload = false,
}: {
  variant?: keyof typeof VARIANTES;
  className?: string;
  preload?: boolean;
}) {
  const { src, width, height } = VARIANTES[variant];
  return (
    <Image
      src={src}
      alt="CLANS aventures"
      width={width}
      height={height}
      preload={preload}
      className={className}
    />
  );
}
