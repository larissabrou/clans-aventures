import Link from "next/link";
import { Logo } from "@/components/logo";

// variant "retour" : remplace le lien Espace membre par un retour à l'accueil (parcours d'adhésion).
// fond "clair" : logo coloré et textes foncés (hero blanc de l'accueil) ; "sombre" : logo blanc (bandeaux verts).
export function SiteHeader({
  variant = "accueil",
  fond = "sombre",
}: {
  variant?: "accueil" | "retour";
  fond?: "clair" | "sombre";
}) {
  const lien =
    fond === "clair"
      ? "border-charbon/30 text-charbon hover:bg-foret hover:border-foret hover:text-ivoire"
      : "border-white/75 hover:bg-white hover:text-charbon";

  return (
    <header className="absolute inset-x-0 top-0 z-10 flex items-center justify-between px-5 py-4 sm:px-9 sm:py-5">
      <Link href="/" aria-label="CLANS aventures — accueil">
        <Logo
          variant={fond === "clair" ? "couleur" : "blanc"}
          className="h-12 w-auto sm:h-14"
          preload
        />
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
