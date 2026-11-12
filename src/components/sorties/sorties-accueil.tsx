import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { sortiesPubliques } from "@/lib/sorties";
import { versAffichage } from "@/lib/sorties-affichage";
import { CarrouselSorties } from "./carrousel-sorties";

/** Section « Nos sorties » de l'accueil : sorties publiques à venir. Rien n'est affiché s'il n'y en a pas. */
export async function SortiesAccueil() {
  const lignes = await sortiesPubliques();
  if (lignes.length === 0) return null;

  return (
    <section aria-labelledby="sorties-accueil-titre" className="overflow-hidden bg-ivoire px-6 py-16 text-charbon lg:py-20">
      <div className="mx-auto max-w-6xl">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <p className="mb-3 text-xs tracking-[3px] uppercase opacity-70">Le programme</p>
            <h2 id="sorties-accueil-titre" className="font-titre text-[clamp(2.25rem,4.5vw,3.5rem)] leading-tight font-semibold">
              Nos prochaines sorties
            </h2>
          </div>
          <Link
            href="/sorties"
            className="inline-flex items-center gap-2 text-sm font-semibold text-terre underline-offset-4 hover:underline"
          >
            Voir toutes les sorties
            <ArrowRight className="size-4" />
          </Link>
        </div>

        <div className="mt-6">
          <CarrouselSorties sorties={lignes.map(versAffichage)} />
        </div>
      </div>
    </section>
  );
}
