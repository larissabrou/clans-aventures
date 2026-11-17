import type { Metadata } from "next";
import { Suspense } from "react";
import Link from "next/link";
import { ArrowLeft, FileSpreadsheet, Search } from "lucide-react";
import { listeAnciensMembres } from "@/lib/anciens-membres";
import { formaterDate } from "@/lib/membres";
import { BoutonEnvoi, FormulaireAdmin } from "../../formulaire";
import { Champ, ChargementPage, EnTete, Vide, champClasses } from "../../ui";
import { actionSupprimerAncien } from "./actions";

export const metadata: Metadata = { title: "Anciens membres" };

// La mise en page vérifie déjà la session ; les lectures dynamiques restent dans <Suspense>.
export default function AnciensMembresAdmin({ searchParams }: PageProps<"/admin/membres/anciens">) {
  return (
    <Suspense fallback={<ChargementPage />}>
      <Contenu searchParams={searchParams} />
    </Suspense>
  );
}

async function Contenu({ searchParams }: Pick<PageProps<"/admin/membres/anciens">, "searchParams">) {
  const params = await searchParams;
  const recherche = typeof params.q === "string" ? params.q.slice(0, 100) : "";
  const lignes = await listeAnciensMembres(recherche);
  const enAttente = lignes.filter((l) => !l.utiliseLe).length;

  return (
    <>
      <Link href="/admin/membres" className="mb-4 inline-flex items-center gap-2 text-sm text-sable hover:text-ivoire">
        <ArrowLeft className="size-4" />
        Tous les membres
      </Link>
      <EnTete
        titre="Anciens membres"
        texte="Liste chargée par l’équipe : un ancien membre reconnu par son e-mail ou son téléphone s’inscrit sans payer. Chaque ligne ne sert qu’une fois."
      />

      <div className="mb-6 flex flex-wrap items-end gap-3">
        <form role="search" className="flex flex-wrap items-end gap-3">
          <Champ label="Rechercher" id="q" className="w-full sm:w-72">
            <div className="relative">
              <Search className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-ivoire/50" />
              <input
                id="q"
                name="q"
                type="search"
                defaultValue={recherche}
                placeholder="Nom, e-mail, téléphone, numéro…"
                className={`${champClasses} pl-9`}
              />
            </div>
          </Champ>
        </form>
        <Link
          href="/admin/membres/import"
          className="inline-flex items-center gap-2 rounded-full border border-white/30 px-5 py-2.5 text-xs font-semibold tracking-[1.5px] text-ivoire uppercase hover:border-sable hover:text-sable"
        >
          <FileSpreadsheet className="size-4" />
          Charger une liste (Excel)
        </Link>
      </div>

      <p className="mb-4 text-sm text-ivoire/70">
        {lignes.length} ligne{lignes.length > 1 ? "s" : ""}
        {recherche ? " trouvée" + (lignes.length > 1 ? "s" : "") : ""} · {enAttente} en attente d’inscription
      </p>

      {lignes.length === 0 ? (
        <Vide texte={recherche ? "Aucune ligne ne correspond." : "La liste est vide : charge un fichier Excel depuis la page d’import."} />
      ) : (
        <ul className="divide-y divide-white/15">
          {lignes.map((l) => (
            <li key={l.id} className="flex flex-wrap items-center justify-between gap-3 py-3 text-sm">
              <div>
                <span className="block font-semibold">
                  {l.prenom} {l.nom}
                  {l.numero && <span className="ml-2 font-normal text-ivoire/60">{l.numero}</span>}
                </span>
                <span className="text-xs text-ivoire/60">
                  {[l.email, l.telephone && `+${l.telephone}`].filter(Boolean).join(" · ")}
                </span>
              </div>
              {l.utiliseLe ? (
                <span className="text-xs text-ivoire/75">
                  Inscrit le {formaterDate(l.utiliseLe)} — reconnu par {l.reconnuPar === "telephone" ? "téléphone" : "e-mail"}
                  {l.emailSaisi && l.emailSaisi !== l.email ? ` (e-mail saisi : ${l.emailSaisi})` : ""}
                  {l.membreId && (
                    <>
                      {" · "}
                      <Link href={`/admin/membres/${l.membreId}`} className="text-sable hover:text-ivoire">
                        {l.membreNumero ?? "fiche"}
                      </Link>
                    </>
                  )}
                </span>
              ) : (
                <FormulaireAdmin
                  action={actionSupprimerAncien}
                  discret
                  confirmation={`Retirer ${l.prenom} ${l.nom} de la liste des anciens membres ?`}
                  className="flex items-center gap-3"
                >
                  <span className="text-xs text-sable">En attente</span>
                  <input type="hidden" name="id" value={l.id} />
                  <BoutonEnvoi style="danger">Supprimer</BoutonEnvoi>
                </FormulaireAdmin>
              )}
            </li>
          ))}
        </ul>
      )}
    </>
  );
}
