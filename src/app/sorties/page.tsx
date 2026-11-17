import type { Metadata } from "next";
import { Suspense } from "react";
import { LoaderCircle } from "lucide-react";
import { SiteFooter } from "@/components/site-footer";
import { SiteHeader } from "@/components/site-header";
import { ListeSorties } from "@/components/sorties/liste-sorties";
import { membreConnecte } from "@/lib/auth";
import { sortiesPubliques } from "@/lib/sorties";
import { lireParametresSorties, versAffichage } from "@/lib/sorties-affichage";

export const metadata: Metadata = {
  title: "Nos sorties",
  description:
    "Campings, excursions, soirées et activités culturelles CLANS aventures : choisis ta sortie et réserve ta place en ligne.",
};

// Programme public des sorties : lu en base à chaque requête, derrière <Suspense>.
export default function SortiesPage({ searchParams }: PageProps<"/sorties">) {
  return (
    <>
      <SiteHeader fond="barre" />
      <main className="flex-1 bg-charbon px-4 pt-32 pb-20 text-ivoire sm:px-9">
        <div className="mx-auto w-full max-w-6xl">
          <div className="mb-8">
            <p className="text-[0.65rem] font-semibold tracking-[3px] text-sable uppercase">Le programme</p>
            <h1 className="mt-2 font-titre text-4xl font-semibold sm:text-5xl">Nos sorties</h1>
            <p className="mt-2 max-w-2xl text-ivoire/70">
              Campings, excursions, soirées et activités culturelles : choisis ta sortie et réserve ta place en ligne,
              que tu sois membre ou non.
            </p>
          </div>
          <Suspense
            fallback={
              <div className="flex justify-center py-20 text-ivoire/60">
                <LoaderCircle className="size-6 animate-spin" aria-label="Chargement des sorties" />
              </div>
            }
          >
            <Programme searchParams={searchParams} />
          </Suspense>
        </div>
      </main>
      <SiteFooter />
    </>
  );
}

async function Programme({ searchParams }: Pick<PageProps<"/sorties">, "searchParams">) {
  const [lignes, membre, parametres] = await Promise.all([sortiesPubliques(), membreConnecte(), searchParams]);
  const { selection, retour } = lireParametresSorties(parametres);

  if (lignes.length === 0) {
    return (
      <p className="rounded-2xl border border-white p-6 text-sm text-white/70">
        Aucune sortie programmée pour le moment. Les prochaines aventures arrivent bientôt !
      </p>
    );
  }

  return (
    <ListeSorties
      sorties={lignes.map(versAffichage)}
      mode="public"
      selectionInitiale={selection}
      retour={retour}
      membreConnecte={membre !== null}
    />
  );
}
