import type { Metadata } from "next";
import Link from "next/link";
import { Search } from "lucide-react";
import { exigerAdmin } from "@/lib/admin";
import { listeMembres } from "@/lib/gestion-membres";
import { formaterDate } from "@/lib/membres";
import { EnTete, Vide, champClasses } from "../ui";

export const metadata: Metadata = { title: "Membres" };

export default async function MembresAdmin({ searchParams }: PageProps<"/admin/membres">) {
  await exigerAdmin();
  const params = await searchParams;
  const recherche = typeof params.q === "string" ? params.q.slice(0, 100) : "";
  const statut = params.statut === "en_attente" ? "en_attente" : "membre";
  const membres = await listeMembres(recherche, statut);

  const onglet = (valeur: "membre" | "en_attente", label: string) => (
    <Link
      href={valeur === "membre" ? "/admin/membres" : "/admin/membres?statut=en_attente"}
      aria-current={statut === valeur ? "page" : undefined}
      className={`rounded-full px-4 py-2 text-sm transition ${
        statut === valeur ? "bg-terre/40 font-semibold text-ivoire" : "text-sable hover:text-ivoire"
      }`}
    >
      {label}
    </Link>
  );

  return (
    <>
      <EnTete titre="Membres" texte="Ouvre la fiche d’un membre pour lui attribuer un clan ou des étoiles." />

      <div className="mb-6 flex flex-wrap items-center justify-between gap-4">
        <nav className="flex gap-2" aria-label="Statut">
          {onglet("membre", "Membres")}
          {onglet("en_attente", "Adhésions non payées")}
        </nav>
        <form className="relative w-full sm:w-80" role="search">
          {statut === "en_attente" && <input type="hidden" name="statut" value="en_attente" />}
          <Search className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-ivoire/50" />
          <input
            name="q"
            type="search"
            defaultValue={recherche}
            placeholder="Nom, email, téléphone, numéro…"
            aria-label="Rechercher un membre"
            className={`${champClasses} pl-9`}
          />
        </form>
      </div>

      {membres.length === 0 ? (
        <Vide texte={recherche ? "Aucun résultat pour cette recherche." : "Aucun membre pour l’instant."} />
      ) : (
        <div className="overflow-x-auto rounded-2xl border border-white/80">
          <table className="w-full min-w-180 text-sm">
            <thead>
              <tr className="border-b border-white/20 text-left text-[0.65rem] tracking-[1px] text-sable uppercase">
                <th className="px-4 py-3 font-semibold">Membre</th>
                <th className="px-4 py-3 font-semibold">Contact</th>
                <th className="px-4 py-3 font-semibold">Clan</th>
                <th className="px-4 py-3 text-right font-semibold">Étoiles</th>
                <th className="px-4 py-3 font-semibold">{statut === "membre" ? "Adhésion" : "Inscription"}</th>
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
                    {formaterDate(statut === "membre" && m.adhereLe ? m.adhereLe : m.creeLe)}
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
