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
  const lien = fondClair
    ? "border-charbon/30 text-charbon hover:bg-foret hover:border-foret hover:text-ivoire"
    : "border-white/75 hover:bg-white hover:text-charbon";

  return (
    <header
      className={`absolute inset-x-0 top-0 z-10 flex items-center justify-between px-5 py-4 sm:px-9 sm:py-5 ${
        fond === "barre" ? "bg-white shadow-[0_2px_20px_rgba(32,32,29,0.12)]" : ""
      }`}
    >
      <Link href="/" aria-label="CLANS aventures — accueil">
        {fondClair ? (
          // Logo complet (symbole + nom), assez grand pour que le nom reste lisible.
          <Logo variant="complet" className="h-16 w-auto sm:h-20" preload />
        ) : (
          <Logo variant="blanc" className="h-12 w-auto sm:h-14" preload />
        )}
      </Link>

      <Link
        href={variant === "retour" ? "/" : "/espace-membre"}
        className={`inline-flex items-center rounded-full border px-3.5 py-2.5 text-[0.62rem] font-semibold tracking-[1.5px] uppercase transition duration-300 sm:px-5 sm:text-xs ${lien}`}
      >
        {variant === "retour" ? "← Retour" : "Espace membre"}
      </Link>
    </header>
  );
}
