import { LoaderCircle } from "lucide-react";
import { Copyright } from "@/components/site-footer";

// Éléments communs aux pages de l'espace membre (tableau de bord, profil).

export function Chargement() {
  return (
    <div className="flex min-h-svh items-center justify-center bg-charbon text-ivoire/60">
      <LoaderCircle className="size-6 animate-spin" aria-label="Chargement de ton espace" />
    </div>
  );
}

export function Section({
  id,
  titre,
  children,
}: {
  id?: string;
  titre: string;
  children: React.ReactNode;
}) {
  return (
    <section id={id} className="mt-12 scroll-mt-24">
      <h2 className="mb-4 font-titre text-3xl font-semibold">{titre}</h2>
      {children}
    </section>
  );
}

export function PiedEspaceMembre() {
  return (
    <footer className="mt-16 border-t border-ivoire/10 pt-6 text-center text-xs leading-6 text-ivoire/50">
      <p>Nos cultures nous distinguent. Nos aventures nous rapprochent.</p>
      <Copyright />
    </footer>
  );
}

/** Nom et initiales affichés dans l'en-tête de l'espace membre. */
export function identite(prenom: string, nom: string) {
  return {
    nomComplet: `${prenom} ${nom}`,
    initiales: `${prenom[0] ?? ""}${nom[0] ?? ""}`.toUpperCase(),
  };
}
