import type { Metadata } from "next";
import { Suspense } from "react";
import { SiteFooter } from "@/components/site-footer";
import { SiteHeader } from "@/components/site-header";
import { AdhesionForm, type RetourWave } from "./adhesion-form";

export const metadata: Metadata = {
  title: "Adhésion",
  description: "Rejoins CLANS aventures et commence ton aventure.",
};

// La page reste un composant serveur ; seul le formulaire est interactif.
export default function InscriptionPage({ searchParams }: PageProps<"/inscription">) {
  return (
    <>
      <SiteHeader variant="retour" />

      <main className="bg-ivoire">
        <section className="bg-foret px-6 pt-36 pb-32 text-center">
          <p className="mb-4 text-xs tracking-[3px] text-sable uppercase">
            Rejoins CLANS aventures
          </p>
          <h1 className="font-titre text-[clamp(2.75rem,7vw,5rem)] leading-none font-medium">
            Commence ton <span className="italic">aventure.</span>
          </h1>
          <p className="mx-auto mt-5 max-w-xl leading-7 text-ivoire/85">
            Quelques questions pour mieux te connaître, comprendre ce que tu
            recherches et préparer ton expérience au sein de CLANS.
          </p>
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
// directement à la vérification du paiement.
async function FormulaireAvecRetour({
  searchParams,
}: Pick<PageProps<"/inscription">, "searchParams">) {
  const params = await searchParams;
  const reference = typeof params.ref === "string" ? params.ref : undefined;
  const retourWave: RetourWave | undefined =
    params.paiement === "retour" && reference
      ? { reference, annule: params.annule === "1" }
      : undefined;

  return <AdhesionForm retourWave={retourWave} />;
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
