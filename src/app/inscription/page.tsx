import type { Metadata } from "next";
import { Suspense } from "react";
import { SiteFooter } from "@/components/site-footer";
import { SiteHeader } from "@/components/site-header";
import { clansProposes } from "@/lib/clans";
import { prixAdhesion } from "@/lib/parametres";
import { AdhesionForm, type RetourWave } from "./adhesion-form";

export const metadata: Metadata = {
  title: "Adhésion",
  description: "Rejoins CLANS aventures et commence ton aventure.",
};

// La page reste un composant serveur ; seul le formulaire est interactif.
export default function InscriptionPage({ searchParams }: PageProps<"/inscription">) {
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
          <p className="mb-4 text-xs tracking-[3px] text-terre uppercase">
            Rejoins CLANS aventures
          </p>
          <h1 className="font-titre text-[clamp(2.75rem,7vw,5rem)] leading-none font-medium text-foret">
            Commence ton <span className="italic">aventure.</span>
          </h1>
          <p className="mx-auto mt-5 max-w-xl leading-7 text-charbon/75">
            Quelques questions pour mieux te connaître, comprendre ce que tu
            recherches et préparer ton expérience au sein de CLANS.
          </p>
          </div>
        </section>

        <div className="mx-auto -mt-20 max-w-3xl px-4 pb-24">
          {/* Lire l'URL rend cette partie dynamique : elle arrive en streaming après la coquille statique. */}
          <Suspense fallback={<FormulaireEnChargement />}>
            <FormulaireAvecRetour searchParams={searchParams} />
          </Suspense>
        </div>
      </main>

      <SiteFooter />
    </>
  );
}

// Au retour de la page Wave (/inscription?paiement=retour&ref=…), le formulaire reprend
// directement à la vérification du paiement. ?parrain=CLANS-000012 pré-remplit le code de parrainage.
async function FormulaireAvecRetour({
  searchParams,
}: Pick<PageProps<"/inscription">, "searchParams">) {
  const [params, prix, clans] = await Promise.all([searchParams, prixAdhesion(), clansProposes()]);
  const reference = typeof params.ref === "string" ? params.ref : undefined;
  const retourWave: RetourWave | undefined =
    params.paiement === "retour" && reference
      ? { reference, annule: params.annule === "1" }
      : undefined;

  const codeParrainage = typeof params.parrain === "string" ? params.parrain.slice(0, 30) : "";

  return (
    <AdhesionForm
      retourWave={retourWave}
      prix={prix}
      clans={clans}
      codeParrainage={codeParrainage}
    />
  );
}

function FormulaireEnChargement() {
  return (
    <div
      aria-busy="true"
      aria-label="Chargement du formulaire"
      className="min-h-[560px] rounded-3xl bg-white shadow-[0_30px_80px_rgba(32,32,29,0.18)]"
    />
  );
}
