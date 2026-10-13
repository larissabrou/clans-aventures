import Image from "next/image";

// Symbole CLANS. Règle de la charte :
// - "blanc" sur les fonds sombres (vert forêt),
// - "couleur" sur les fonds clairs (ivoire, blanc) ou sur charbon.
export function Logo({
  variant = "blanc",
  className = "h-12 w-auto",
  preload = false,
}: {
  variant?: "blanc" | "couleur";
  className?: string;
  preload?: boolean;
}) {
  return (
    <Image
      src={variant === "blanc" ? "/images/logo-clans-blanc.png" : "/images/logo-clans.png"}
      alt="CLANS aventures"
      width={788}
      height={1333}
      preload={preload}
      className={className}
    />
  );
}
