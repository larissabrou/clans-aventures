import type { Metadata } from "next";
import { CtaLink } from "@/components/cta-link";
import { SiteFooter } from "@/components/site-footer";
import { SiteHeader } from "@/components/site-header";

export const metadata: Metadata = {
  title: "Le Grenier",
  description: "Le Grenier de CLANS aventures arrive bientôt.",
};

// Page d'attente : le contenu du Grenier reste à définir.
export default function GrenierPage() {
  return (
    <>
      <SiteHeader fond="barre" />

      <main
        className="flex min-h-svh items-center justify-center bg-ivoire bg-cover bg-center px-6 pt-32 pb-20 text-center text-charbon"
        style={{ backgroundImage: "url(/images/banniere-motifs.png)" }}
      >
        <div className="max-w-xl rounded-3xl bg-ivoire/90 px-6 py-10 sm:px-12">
          <p className="mb-4 text-xs tracking-[3px] text-terre uppercase">Bientôt disponible</p>
          <h1 className="font-titre text-[clamp(2.75rem,7vw,4.5rem)] leading-none font-medium text-foret">
            Le <span className="italic">Grenier</span>
          </h1>
          <p className="mx-auto mt-5 mb-8 max-w-md leading-7 text-charbon/75">
            Cet espace est en préparation. Reviens très vite !
          </p>
          <CtaLink href="/" fond="clair">
            Retour à l’accueil
          </CtaLink>
        </div>
      </main>

      <SiteFooter />
    </>
  );
}
