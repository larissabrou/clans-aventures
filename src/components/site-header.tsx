import Link from "next/link";
import { Logo } from "@/components/logo";

// variant "retour" : remplace le lien Espace membre par un retour à l'accueil (parcours d'adhésion).
export function SiteHeader({
  variant = "accueil",
}: {
  variant?: "accueil" | "retour";
}) {
  return (
    <header className="absolute inset-x-0 top-0 z-10 flex items-center justify-between px-5 py-4 sm:px-9 sm:py-5">
      <Link href="/" aria-label="CLANS aventures — accueil">
        <Logo className="h-12 w-auto sm:h-14" preload />
      </Link>

      <Link
        href={variant === "retour" ? "/" : "/espace-membre"}
        className="inline-flex items-center rounded-full border border-white/75 px-3.5 py-2.5 text-[0.62rem] font-semibold tracking-[1.5px] uppercase transition duration-300 hover:bg-white hover:text-charbon sm:px-5 sm:text-xs"
      >
        {variant === "retour" ? "← Retour" : "Espace membre"}
      </Link>
    </header>
  );
}
