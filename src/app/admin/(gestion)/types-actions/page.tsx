import type { Metadata } from "next";
import Link from "next/link";
import { Pencil, Plus } from "lucide-react";
import { exigerAdmin } from "@/lib/admin";
import { typesActionsAvecUsage } from "@/lib/bareme";
import { EnTete, Pastille, Vide } from "../ui";

export const metadata: Metadata = { title: "Types d’actions" };

export default async function TypesActionsAdmin() {
  await exigerAdmin();
  const types = await typesActionsAvecUsage();

  return (
    <>
      <div className="flex flex-wrap items-end justify-between gap-4">
        <EnTete
          titre="Types d’actions"
          texte="Chaque type d’action rapporte des étoiles : à la présence validée lors d’un événement de ce type, ou par attribution depuis la fiche d’un membre. Le parrainage est crédité automatiquement."
        />
        <Link
          href="/admin/types-actions/nouveau"
          className="mb-8 inline-flex items-center gap-2 rounded-full bg-terre px-5 py-2.5 text-xs font-bold tracking-[1px] text-white uppercase transition hover:bg-sable hover:text-charbon"
        >
          <Plus className="size-4" />
          Nouveau type d’action
        </Link>
      </div>

      {types.length === 0 ? (
        <Vide texte="Aucun type d’action : crée le premier." />
      ) : (
        <div className="overflow-x-auto rounded-2xl border border-white/80">
          <table className="w-full min-w-160 text-sm">
            <thead>
              <tr className="border-b border-white/20 text-left text-[0.65rem] tracking-[1px] text-sable uppercase">
                <th className="px-4 py-3 font-semibold">Action</th>
                <th className="px-4 py-3 text-right font-semibold">Nombre d’étoiles</th>
                <th className="px-4 py-3 font-semibold">Statut</th>
                <th className="px-4 py-3 text-right font-semibold">Événements</th>
                <th className="px-4 py-3 text-right font-semibold">Attributions</th>
                <th className="px-4 py-3">
                  <span className="sr-only">Modifier</span>
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/10">
              {types.map((type) => (
                <tr key={type.id} className="transition hover:bg-white/5">
                  <td className="px-4 py-3">
                    <Link href={`/admin/types-actions/${type.id}`} className="font-semibold hover:text-sable">
                      {type.nom}
                    </Link>
                    {type.code === "parrainage" && (
                      <span className="block text-xs text-ivoire/50">Attribué automatiquement</span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-right font-semibold whitespace-nowrap">
                    <span className={type.etoiles === 0 ? "text-terre" : "text-sable"}>
                      {type.etoiles > 0 ? "+" : ""}
                      {type.etoiles} ★
                    </span>
                    {type.etoiles === 0 && <span className="block text-xs font-normal text-terre">à définir</span>}
                  </td>
                  <td className="px-4 py-3">
                    <Pastille actif={type.actif} oui="Active" non="Inactive" />
                  </td>
                  <td className="px-4 py-3 text-right text-ivoire/80">{type.evenements}</td>
                  <td className="px-4 py-3 text-right text-ivoire/80">{type.attributions}</td>
                  <td className="px-4 py-3 text-right">
                    <Link
                      href={`/admin/types-actions/${type.id}`}
                      aria-label={`Modifier ${type.nom}`}
                      className="inline-flex items-center gap-1.5 text-xs font-semibold text-sable hover:text-ivoire"
                    >
                      <Pencil className="size-3.5" />
                      Modifier
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </>
  );
}
