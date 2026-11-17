"use client";

import Link from "next/link";
import { useState } from "react";
import { ArrowLeft, CalendarDays, CircleCheck, MapPin, Star, Ticket, Users, type LucideIcon } from "lucide-react";
import { TexteAvecLiens } from "@/components/texte-avec-liens";
import { PaiementSortie } from "./paiement-sortie";
import type { RetourPaiement, SortieAffichee } from "./types";

function textePlaces(restantes: number | null) {
  if (restantes === null) return "Sans limite";
  if (restantes === 0) return "Complet";
  return `${restantes} restante${restantes > 1 ? "s" : ""}`;
}

/**
 * Sorties en liste + sortie ouverte (côte à côte sur grand écran), comme la boîte de messages.
 * Sur mobile : la liste, puis la sortie choisie avec un bouton retour.
 */
export function ListeSorties({
  sorties,
  mode,
  selectionInitiale,
  retour,
  membreConnecte = false,
}: {
  sorties: SortieAffichee[];
  mode: "membre" | "public";
  selectionInitiale?: number;
  retour?: RetourPaiement;
  /** Page publique visitée par un membre connecté : il paie depuis son espace. */
  membreConnecte?: boolean;
}) {
  // Sortie choisie explicitement (sur mobile, elle remplace la liste) ; sinon la première sur grand écran.
  const [choisieId, setChoisieId] = useState<number | null>(
    sorties.some((s) => s.id === selectionInitiale) ? (selectionInitiale ?? null) : null,
  );
  const ouverte = sorties.find((s) => s.id === choisieId) ?? sorties[0];

  return (
    <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.25fr)]">
      {/* LISTE (cachée sur mobile pendant la lecture) */}
      {/* grid-cols-1 = minmax(0, 1fr) : les titres longs sont tronqués au lieu d'élargir la colonne. */}
      <ul className={`grid grid-cols-1 content-start gap-3 ${choisieId !== null ? "hidden lg:grid" : ""}`}>
        {sorties.map((sortie) => {
          const active = sortie.id === ouverte?.id;
          return (
            <li key={sortie.id}>
              <button
                type="button"
                onClick={() => setChoisieId(sortie.id)}
                aria-current={active ? "true" : undefined}
                className={`flex w-full gap-4 rounded-2xl border p-3 text-left transition ${
                  active ? "border-sable bg-white/10" : "border-white/40 hover:border-white hover:bg-white/5"
                } ${sortie.obligatoire ? "border-l-4 border-l-bordeaux" : ""}`}
              >
                {sortie.image ? (
                  // eslint-disable-next-line @next/next/no-img-element -- image servie par /api (stockée en base)
                  <img src={sortie.image} alt="" loading="lazy" className="aspect-[4/3] w-24 shrink-0 rounded-xl object-cover" />
                ) : (
                  <span className="flex aspect-[4/3] w-24 shrink-0 items-center justify-center rounded-xl bg-white/10">
                    <Ticket className="size-6 text-sable" strokeWidth={1.5} />
                  </span>
                )}
                <span className="min-w-0 flex-1">
                  {sortie.typeAction && (
                    <span className="block text-[0.6rem] font-semibold tracking-[2px] text-sable uppercase">
                      {sortie.typeAction}
                    </span>
                  )}
                  <span className="mt-0.5 block truncate font-semibold text-white">{sortie.titre}</span>
                  <span className="mt-1 block text-xs text-white/60">{sortie.date}</span>
                  <span className="mt-1.5 flex flex-wrap items-center gap-2 text-xs">
                    <span className="font-semibold text-white/85">{sortie.prixTexte}</span>
                    {sortie.inscrit && (
                      <span className="inline-flex items-center gap-1 rounded-full bg-sable/20 px-2 py-0.5 font-semibold text-sable">
                        <CircleCheck className="size-3" /> Inscrit
                      </span>
                    )}
                    {sortie.placesRestantes === 0 && !sortie.inscrit && (
                      <span className="rounded-full bg-white/10 px-2 py-0.5 text-white/70">Complet</span>
                    )}
                  </span>
                </span>
              </button>
            </li>
          );
        })}
      </ul>

      {/* SORTIE OUVERTE */}
      {ouverte && (
        <article
          key={ouverte.id}
          className={`overflow-hidden rounded-2xl border border-sable text-white lg:sticky lg:top-24 lg:self-start ${
            choisieId === null ? "hidden lg:block" : ""
          }`}
        >
          {ouverte.image && (
            // eslint-disable-next-line @next/next/no-img-element -- image servie par /api (stockée en base)
            <img src={ouverte.image} alt={ouverte.titre} className="aspect-[16/9] max-h-72 w-full object-cover" />
          )}
          <header className="bg-sable p-6 text-charbon sm:p-7">
            <button
              type="button"
              onClick={() => setChoisieId(null)}
              className="mb-4 inline-flex items-center gap-2 text-sm font-medium text-charbon/80 hover:text-charbon lg:hidden"
            >
              <ArrowLeft className="size-4" />
              Toutes les sorties
            </button>
            <div className="flex flex-wrap items-center gap-2">
              {ouverte.typeAction && (
                <span className="rounded-full bg-charbon px-3 py-1 text-xs font-semibold text-sable">{ouverte.typeAction}</span>
              )}
              {ouverte.inscrit && (
                <span className="inline-flex items-center gap-1.5 rounded-full bg-foret px-3 py-1 text-xs font-semibold text-ivoire">
                  <CircleCheck className="size-3.5" /> Tu es inscrit
                </span>
              )}
              {ouverte.obligatoire && (
                <span className="rounded-full bg-bordeaux px-3 py-1 text-xs font-semibold text-white">Obligatoire</span>
              )}
              {(ouverte.etoiles ?? 0) > 0 && (
                <span className="inline-flex items-center gap-1 rounded-full bg-charbon/10 px-3 py-1 text-xs font-semibold">
                  +{ouverte.etoiles} <Star className="size-3.5 fill-terre text-terre" />
                </span>
              )}
            </div>
            <h2 className="mt-3 font-titre text-3xl leading-tight font-semibold">{ouverte.titre}</h2>
          </header>

          <div className="p-6 sm:p-7">
            <dl className="grid gap-3 text-sm sm:grid-cols-2">
              <Detail Icone={CalendarDays} label="Date" valeur={ouverte.date} />
              <Detail Icone={MapPin} label="Lieu" valeur={ouverte.lieu ?? "Communiqué bientôt"} />
              <Detail Icone={Ticket} label="Participation" valeur={ouverte.prixTexte} />
              <Detail Icone={Users} label="Places" valeur={textePlaces(ouverte.placesRestantes)} />
            </dl>

            <div className="mt-6">
              {mode === "public" && membreConnecte ? (
                <p className="text-sm text-white/80">
                  Tu es membre :{" "}
                  <Link
                    href={`/espace-membre/bon-plan?sortie=${ouverte.id}`}
                    className="font-semibold text-sable underline underline-offset-4"
                  >
                    paie ta participation depuis ton espace
                  </Link>{" "}
                  pour gagner tes étoiles.
                </p>
              ) : (
                <PaiementSortie key={ouverte.id} sortie={ouverte} mode={mode} retour={retour} />
              )}
            </div>

            {ouverte.description && (
              <p className="mt-6 text-sm leading-7 whitespace-pre-line text-white/85">
                <TexteAvecLiens texte={ouverte.description} />
              </p>
            )}

            {(ouverte.conditions || (ouverte.obligatoire && (ouverte.penalite ?? 0) > 0)) && (
              <div className="mt-6 rounded-r-xl border-l-[3px] border-sable bg-white/5 px-4 py-3 text-sm leading-6">
                <p className="text-[0.65rem] font-semibold tracking-[2px] text-sable uppercase">
                  Conditions de participation
                </p>
                {ouverte.conditions && <p className="mt-1 whitespace-pre-line text-white/80">{ouverte.conditions}</p>}
                {ouverte.obligatoire && (ouverte.penalite ?? 0) > 0 && (
                  <p className="mt-1 text-white/80">
                    Absence non justifiée : −{ouverte.penalite} étoile{(ouverte.penalite ?? 0) > 1 ? "s" : ""}.
                  </p>
                )}
              </div>
            )}
          </div>
        </article>
      )}
    </div>
  );
}

function Detail({ Icone, label, valeur }: { Icone: LucideIcon; label: string; valeur: string }) {
  return (
    <div className="flex gap-2.5">
      <Icone className="mt-0.5 size-4 shrink-0 text-sable" strokeWidth={1.75} />
      <div>
        <dt className="text-[0.65rem] font-semibold tracking-[1.5px] text-white/60 uppercase">{label}</dt>
        <dd className="mt-0.5 font-medium">{valeur}</dd>
      </div>
    </div>
  );
}
