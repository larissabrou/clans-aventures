import type { Metadata } from "next";
import Link from "next/link";
import { Pencil, Plus } from "lucide-react";
import { exigerAdmin } from "@/lib/admin";
import { apparenceMessage } from "@/lib/apparence-messages";
import { listeTypesMessages } from "@/lib/types-messages";
import { EnTete, Pastille } from "../ui";

export const metadata: Metadata = { title: "Types de messages" };

export default async function TypesMessagesAdmin() {
  await exigerAdmin();
  const types = await listeTypesMessages();

  return (
    <>
      <div className="flex flex-wrap items-end justify-between gap-4">
        <EnTete
          titre="Types de messages"
          texte="Le type donne au message sa couleur, son icône et son filtre dans la boîte de réception des membres."
        />
        <Link
          href="/admin/types-messages/nouveau"
          className="mb-8 inline-flex items-center gap-2 rounded-full bg-terre px-5 py-2.5 text-xs font-bold tracking-[1px] text-white uppercase transition hover:bg-sable hover:text-charbon"
        >
          <Plus className="size-4" />
          Nouveau type de message
        </Link>
      </div>

      <div className="overflow-x-auto rounded-2xl border border-white/80">
        <table className="w-full min-w-160 text-sm">
          <thead>
            <tr className="border-b border-white/20 text-left text-[0.65rem] tracking-[1px] text-sable uppercase">
              <th className="px-4 py-3 font-semibold">Type</th>
              <th className="px-4 py-3 font-semibold">Statut</th>
              <th className="px-4 py-3 text-right font-semibold">Envois</th>
              <th className="px-4 py-3 text-right font-semibold">Messages reçus</th>
              <th className="px-4 py-3">
                <span className="sr-only">Modifier</span>
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-white/10">
            {types.map((type) => {
              const { Icone, fondIcone, pastille } = apparenceMessage(type.couleur, type.icone);
              return (
                <tr key={type.cle} className="transition hover:bg-white/5">
                  <td className="px-4 py-3">
                    <Link href={`/admin/types-messages/${type.cle}`} className="flex items-center gap-3">
                      <span className={`flex size-9 shrink-0 items-center justify-center rounded-xl ${fondIcone}`}>
                        <Icone className="size-[18px]" strokeWidth={1.75} />
                      </span>
                      <span>
                        <span className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-semibold ${pastille}`}>{type.nom}</span>
                        {type.systeme && <span className="mt-0.5 block text-xs text-ivoire/50">Utilisé aussi par le site</span>}
                      </span>
                    </Link>
                  </td>
                  <td className="px-4 py-3">
                    <Pastille actif={type.actif} />
                  </td>
                  <td className="px-4 py-3 text-right text-ivoire/80">{type.envois}</td>
                  <td className="px-4 py-3 text-right text-ivoire/80">{type.messages}</td>
                  <td className="px-4 py-3 text-right">
                    <Link
                      href={`/admin/types-messages/${type.cle}`}
                      aria-label={`Modifier ${type.nom}`}
                      className="inline-flex items-center gap-1.5 text-xs font-semibold text-sable hover:text-ivoire"
                    >
                      <Pencil className="size-3.5" />
                      Modifier
                    </Link>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </>
  );
}
