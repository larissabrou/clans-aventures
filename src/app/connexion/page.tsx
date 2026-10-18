import type { Metadata } from "next";
import { SiteFooter } from "@/components/site-footer";
import { SiteHeader } from "@/components/site-header";
import { ConnexionForm } from "./connexion-form";

export const metadata: Metadata = {
  title: "Connexion",
  description: "Connecte-toi à ton espace membre CLANS aventures.",
};

export default function ConnexionPage() {
  return (
    <>
      {/* Même en-tête que l'accueil : barre blanche et logo complet. */}
      <SiteHeader variant="retour" fond="barre" />

      {/* Fond : photo du campement derrière le formulaire. */}
      <main
        className="bg-charbon bg-cover bg-center"
        style={{ backgroundImage: "url(/images/fond-campement.jpg)" }}
      >
        {/* Bandeau : motifs CLANS sur fond ivoire, le centre vide accueille le titre. */}
        <section
          className="bg-ivoire bg-cover bg-center px-6 pt-28 pb-32 text-center text-charbon sm:pt-32"
          style={{ backgroundImage: "url(/images/banniere-motifs.png)" }}
        >
          {/* Sur petit écran, voile ivoire derrière le texte : les motifs restent lisibles sans gêner. */}
          <div className="mx-auto max-w-2xl rounded-3xl bg-ivoire/85 px-4 py-6 sm:bg-transparent sm:p-0">
          <p className="mb-4 text-xs tracking-[3px] text-terre uppercase">Espace membre</p>
          <h1 className="font-titre text-[clamp(2.75rem,7vw,4.5rem)] leading-none font-medium text-foret">
            Bon retour <span className="italic">parmi nous.</span>
          </h1>
          </div>
        </section>

        <div className="mx-auto -mt-20 max-w-md px-4 pb-24">
          <ConnexionForm />
        </div>
      </main>

      <SiteFooter />
    </>
  );
}
