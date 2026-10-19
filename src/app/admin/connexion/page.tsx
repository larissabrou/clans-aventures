import type { Metadata } from "next";
import Link from "next/link";
import { Logo } from "@/components/logo";
import { FormulaireConnexionAdmin } from "./formulaire-connexion";

export const metadata: Metadata = { title: "Connexion" };

export default function ConnexionAdmin() {
  return (
    <main className="flex flex-1 flex-col items-center justify-center bg-charbon px-4 py-16 text-ivoire">
      <div className="w-full max-w-md">
        <Link href="/" className="mx-auto mb-8 block w-fit" aria-label="CLANS aventures — accueil du site">
          <Logo variant="complet-blanc" className="h-20 w-auto" preload />
        </Link>
        <p className="text-center text-[0.65rem] font-semibold tracking-[3px] text-sable uppercase">Administration</p>
        <h1 className="mt-2 mb-8 text-center font-titre text-4xl font-semibold">Connexion</h1>
        <FormulaireConnexionAdmin />
        <p className="mt-6 text-center text-xs text-ivoire/50">
          Espace réservé à l’équipe CLANS. Membre ?{" "}
          <Link href="/connexion" className="text-sable underline-offset-4 hover:underline">
            Connexion à l’espace membre
          </Link>
        </p>
      </div>
    </main>
  );
}
