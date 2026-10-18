import Link from "next/link";
import { Logo } from "@/components/logo";

// variant "retour" : remplace le lien Espace membre par un retour à l'accueil (parcours d'adhésion).
// fond "clair" : logo coloré et textes foncés, en-tête transparent (hero blanc) ;
// "barre" : pareil, sur une barre blanche pleine ; "sombre" : logo blanc (bandeaux verts, vidéos).
export function SiteHeader({
  variant = "accueil",
  fond = "sombre",
}: {
  variant?: "accueil" | "retour";
  fond?: "clair" | "barre" | "sombre";
}) {
  const fondClair = fond !== "sombre";

  // Bouton secondaire (contour) et principal (plein), selon le fond.
  const contour = fondClair
    ? "border-charbon/25 text-charbon hover:bg-ivoire hover:border-charbon/40"
    : "border-white/70 text-white hover:bg-white/15";
  const plein = fondClair
    ? "border-foret bg-foret text-ivoire hover:bg-terre hover:border-terre"
    : "border-white bg-white text-charbon hover:bg-sable hover:border-sable";

  const bouton =
    "inline-flex min-h-[38px] items-center justify-center gap-1.5 whitespace-nowrap rounded-full border px-2.5 text-[0.62rem] font-semibold tracking-[1px] uppercase transition duration-300 sm:min-h-[42px] sm:gap-2 sm:px-4 sm:text-xs sm:tracking-[1.5px]";

  return (
    <header
      className={`absolute inset-x-0 top-0 z-10 flex items-center justify-between gap-3 px-4 py-2 sm:px-9 sm:py-2.5 ${
        fond === "barre" ? "bg-white shadow-[0_2px_20px_rgba(32,32,29,0.12)]" : ""
      }`}
    >
      <Link href="/" aria-label="CLANS aventures — accueil" className="shrink-0">
        {fondClair ? (
          // Logo complet (symbole + nom), assez grand pour que le nom reste lisible.
          <Logo variant="complet" className="h-12 w-auto sm:h-14" preload />
        ) : (
          <Logo variant="blanc" className="h-12 w-auto sm:h-14" preload />
        )}
      </Link>

      <nav aria-label="Navigation principale" className="flex items-center gap-1.5 sm:gap-3">
        <Link href="/grenier" className={`${bouton} ${contour}`}>
          <IconeGrenier />
          {/* Sur très petit écran (< 380 px), icône seule : le libellé reste lu par les lecteurs d'écran. */}
          <span className="max-[379px]:sr-only">Le Grenier</span>
        </Link>

        {variant === "retour" ? (
          <Link href="/" className={`${bouton} ${plein}`}>
            ← Retour
          </Link>
        ) : (
          <Link href="/espace-membre" className={`${bouton} ${plein}`}>
            <IconeMembre />
            Espace membre
          </Link>
        )}
      </nav>
    </header>
  );
}

const traitIcone = {
  viewBox: "0 0 24 24",
  fill: "none",
  stroke: "currentColor",
  strokeWidth: 1.7,
  strokeLinecap: "round",
  strokeLinejoin: "round",
  className: "size-4 shrink-0 sm:size-[19px]",
  "aria-hidden": true,
} as const;

function IconeGrenier() {
  return (
    <svg {...traitIcone}>
      <path d="M3 9h18l-1.5 12h-15L3 9Z" />
      <path d="M8 9V6a4 4 0 0 1 8 0v3" />
      <path d="M9 13v1M15 13v1" />
    </svg>
  );
}

function IconeMembre() {
  return (
    <svg {...traitIcone}>
      <circle cx="12" cy="8" r="4" />
      <path d="M4 21a8 8 0 0 1 16 0" />
    </svg>
  );
}
