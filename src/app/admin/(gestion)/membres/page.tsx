import type { Metadata } from "next";
import Link from "next/link";
import { Search, X } from "lucide-react";
import { exigerAdmin } from "@/lib/admin";
import { listeMembres } from "@/lib/gestion-membres";
import { formaterDate } from "@/lib/membres";
import { Champ, EnTete, Vide, champClasses } from "../ui";

/** « AAAA-MM-JJ » valide, sinon null. */
const jour = (valeur: unknown) =>
  typeof valeur === "string" && /^\d{4}-\d{2}-\d{2}$/.test(valeur) && !Number.isNaN(Date.parse(valeur)) ? valeur : null;

export const metadata: Metadata = { title: "Membres" };

export default async function MembresAdmin({ searchParams }: PageProps<"/admin/membres">) {
  await exigerAdmin();
  const params = await searchParams;
  const recherche = typeof params.q === "string" ? params.q.slice(0, 100) : "";
  const periode = { du: jour(params.du), au: jour(params.au) };
  const membres = await listeMembres(recherche, periode);
  const filtre = Boolean(recherche || periode.du || periode.au);

  return (
    <>
      <EnTete titre="Membres" texte="Ouvre la fiche d’un membre pour lui attribuer un clan ou des étoiles." />

      {/* Recherche et période d'adhésion : formulaire GET, les filtres restent dans l'adresse. */}
      <form role="search" className="mb-6 flex flex-wrap items-end gap-3">
        <Champ label="Rechercher" id="q" className="w-full sm:w-72">
          <div className="relative">
            <Search className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-ivoire/50" />
            <input
              id="q"
              name="q"
              type="search"
              defaultValue={recherche}
              placeholder="Nom, email, téléphone, numéro…"
              className={`${champClasses} pl-9`}
            />
          </div>
        </Champ>
        <Champ label="Adhésion du" id="du">
          <input id="du" name="du" type="date" defaultValue={periode.du ?? ""} className={`${champClasses} [color-scheme:dark]`} />
        </Champ>
        <Champ label="au" id="au">
          <input id="au" name="au" type="date" defaultValue={periode.au ?? ""} className={`${champClasses} [color-scheme:dark]`} />
        </Champ>
        <button
          type="submit"
          className="rounded-full bg-terre px-5 py-2.5 text-xs font-bold tracking-[1px] text-white uppercase transition hover:bg-sable hover:text-charbon"
        >
          Filtrer
        </button>
        {filtre && (
          <Link href="/admin/membres" className="inline-flex items-center gap-1.5 py-2.5 text-sm text-sable hover:text-ivoire">
            <X className="size-4" />
            Effacer les filtres
          </Link>
        )}
      </form>

      <p className="mb-3 text-sm text-ivoire/60">
        {membres.length} membre{membres.length > 1 ? "s" : ""}
        {filtre ? " correspondant aux filtres" : ""}
      </p>

      {membres.length === 0 ? (
        <Vide texte={filtre ? "Aucun membre ne correspond à ces filtres." : "Aucun membre pour l’instant."} />
      ) : (
        <div className="overflow-x-auto rounded-2xl border border-white/80">
          <table className="w-full min-w-180 text-sm">
            <thead>
              <tr className="border-b border-white/20 text-left text-[0.65rem] tracking-[1px] text-sable uppercase">
                <th className="px-4 py-3 font-semibold">Membre</th>
                <th className="px-4 py-3 font-semibold">Contact</th>
                <th className="px-4 py-3 font-semibold">Clan</th>
                <th className="px-4 py-3 text-right font-semibold">Étoiles</th>
                <th className="px-4 py-3 font-semibold">Adhésion</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/10">
              {membres.map((m) => (
                <tr key={m.id} className="transition hover:bg-white/5">
                  <td className="px-4 py-3">
                    <Link href={`/admin/membres/${m.id}`} className="font-semibold hover:text-sable">
                      {m.prenom} {m.nom}
                    </Link>
                    <span className="block text-xs text-ivoire/60">{m.numero ?? "—"}</span>
                  </td>
                  <td className="px-4 py-3 text-ivoire/80">
                    {m.email}
                    <span className="block text-xs text-ivoire/60">+{m.telephone}</span>
                  </td>
                  <td className="px-4 py-3">{m.clan ?? <span className="text-terre">À définir</span>}</td>
                  <td className="px-4 py-3 text-right font-semibold text-sable">{m.etoiles} ★</td>
                  <td className="px-4 py-3 text-ivoire/70">
                    {formaterDate(m.adhereLe ?? m.creeLe)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      {membres.length === 200 && (
        <p className="mt-3 text-xs text-ivoire/50">Seuls les 200 premiers résultats sont affichés : affine ta recherche.</p>
      )}
    </>
  );
}
