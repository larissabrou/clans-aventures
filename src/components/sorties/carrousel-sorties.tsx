"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { ArrowLeft, ArrowRight, CalendarDays, MapPin, Tent, Ticket, Users } from "lucide-react";
import type { SortieAffichee } from "./types";

/**
 * Sorties à venir sur une ligne, défilant de gauche à droite (doigt, molette, clavier ou flèches).
 * Chaque carte ouvre la sortie sur /sorties, où l'on réserve.
 */
export function CarrouselSorties({ sorties }: { sorties: SortieAffichee[] }) {
  const piste = useRef<HTMLUListElement>(null);
  const [bords, setBords] = useState({ debut: true, fin: false });

  // Flèches estompées quand on est au début ou à la fin de la liste.
  useEffect(() => {
    const element = piste.current;
    if (!element) return;
    const mettreAJour = () =>
      setBords({
        debut: element.scrollLeft <= 4,
        fin: element.scrollLeft + element.clientWidth >= element.scrollWidth - 4,
      });
    mettreAJour();
    element.addEventListener("scroll", mettreAJour, { passive: true });
    window.addEventListener("resize", mettreAJour);
    return () => {
      element.removeEventListener("scroll", mettreAJour);
      window.removeEventListener("resize", mettreAJour);
    };
  }, []);

  function defiler(sens: -1 | 1) {
    const element = piste.current;
    if (!element) return;
    // Environ une carte et demie par clic.
    element.scrollBy({ left: sens * Math.min(element.clientWidth * 0.8, 480), behavior: "smooth" });
  }

  const fleche =
    "hidden size-11 items-center justify-center rounded-full border border-charbon/20 bg-white text-charbon shadow-sm transition hover:border-terre hover:text-terre disabled:opacity-30 disabled:hover:border-charbon/20 disabled:hover:text-charbon sm:flex";

  return (
    <div>
      <div className="mb-4 flex justify-end gap-2">
        <button type="button" onClick={() => defiler(-1)} disabled={bords.debut} aria-label="Sorties précédentes" className={fleche}>
          <ArrowLeft className="size-5" />
        </button>
        <button type="button" onClick={() => defiler(1)} disabled={bords.fin} aria-label="Sorties suivantes" className={fleche}>
          <ArrowRight className="size-5" />
        </button>
      </div>

      <ul
        ref={piste}
        tabIndex={0}
        aria-label="Prochaines sorties"
        // Défilement horizontal avec accrochage sur chaque carte ; barre de défilement masquée.
        className="-mx-6 flex snap-x snap-mandatory scroll-px-6 gap-5 overflow-x-auto px-6 pb-4 [scrollbar-width:none] focus-visible:outline-2 focus-visible:outline-terre [&::-webkit-scrollbar]:hidden"
      >
        {sorties.map((sortie) => (
          <li key={sortie.id} className="w-72 shrink-0 snap-start sm:w-80">
            <Link
              href={`/sorties?sortie=${sortie.id}`}
              className="group flex h-full flex-col overflow-hidden rounded-2xl bg-white text-left text-charbon shadow-[0_10px_30px_rgba(32,32,29,0.08)] transition duration-300 hover:-translate-y-1.5 hover:shadow-[0_20px_40px_rgba(32,32,29,0.14)]"
            >
              {sortie.image ? (
                // eslint-disable-next-line @next/next/no-img-element -- image servie par /api (stockée en base)
                <img src={sortie.image} alt="" loading="lazy" className="aspect-[4/3] w-full object-cover" />
              ) : (
                <span className="flex aspect-[4/3] w-full items-center justify-center bg-foret text-sable">
                  <Tent className="size-12" strokeWidth={1.25} />
                </span>
              )}
              <span className="flex flex-1 flex-col p-5">
                {sortie.typeAction && (
                  <span className="text-[0.65rem] font-semibold tracking-[2px] text-terre uppercase">{sortie.typeAction}</span>
                )}
                <span className="mt-1 font-titre text-2xl leading-tight font-semibold group-hover:text-terre">
                  {sortie.titre}
                </span>
                <span className="mt-3 grid gap-1.5 text-sm text-charbon/70">
                  <span className="flex items-center gap-2">
                    <CalendarDays className="size-4 shrink-0 text-terre" strokeWidth={1.75} />
                    {sortie.date}
                  </span>
                  {sortie.lieu && (
                    <span className="flex items-center gap-2">
                      <MapPin className="size-4 shrink-0 text-terre" strokeWidth={1.75} />
                      {sortie.lieu}
                    </span>
                  )}
                </span>
                <span className="mt-auto flex items-center justify-between gap-3 border-t border-charbon/10 pt-4 text-sm">
                  <span className="flex items-center gap-2 font-semibold">
                    <Ticket className="size-4 text-terre" strokeWidth={1.75} />
                    {sortie.prixTexte}
                  </span>
                  {sortie.placesRestantes !== null && (
                    <span className={`flex items-center gap-1.5 text-xs ${sortie.placesRestantes === 0 ? "font-semibold text-bordeaux" : "text-charbon/60"}`}>
                      <Users className="size-3.5" strokeWidth={1.75} />
                      {sortie.placesRestantes === 0
                        ? "Complet"
                        : `${sortie.placesRestantes} place${sortie.placesRestantes > 1 ? "s" : ""}`}
                    </span>
                  )}
                </span>
              </span>
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}
