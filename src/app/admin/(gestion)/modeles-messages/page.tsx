import type { Metadata } from "next";
import Link from "next/link";
import { Pencil, Plus } from "lucide-react";
import { exigerAdmin } from "@/lib/admin";
import { apparenceMessage } from "@/lib/apparence-messages";
import { listeModelesMessages } from "@/lib/modeles-messages";
import { EnTete, Pastille, Vide } from "../ui";

export const metadata: Metadata = { title: "Modèles de messages" };

export default async function ModelesMessagesAdmin() {
  await exigerAdmin();
  const lignes = await listeModelesMessages();

  return (
    <>
      <div className="flex flex-wrap items-end justify-between gap-4">
        <EnTete
          titre="Modèles de messages"
          texte="Messages préparés à l’avance, choisis lors de l’attribution d’étoiles à un membre (fiche du membre). Les variables ({prenom}, {action}, {etoiles}, {solde}…) sont remplacées à l’envoi."
        />
        <Link
          href="/admin/modeles-messages/nouveau"
          className="mb-8 inline-flex items-center gap-2 rounded-full bg-terre px-5 py-2.5 text-xs font-bold tracking-[1px] text-white uppercase transition hover:bg-sable hover:text-charbon"
        >
          <Plus className="size-4" />
          Nouveau modèle
        </Link>
      </div>

      {lignes.length === 0 ? (
        <Vide texte="Aucun modèle : crée-en un pour pouvoir attribuer des étoiles depuis la fiche d’un membre." />
      ) : (
        <ul className="grid gap-3">
          {lignes.map(({ modele: m, typeNom, couleur, icone }) => {
            const { Icone, fondIcone } = apparenceMessage(couleur, icone);
            return (
              <li key={m.id}>
                <Link
                  href={`/admin/modeles-messages/${m.id}`}
                  className="flex gap-4 rounded-2xl border border-white/80 p-5 transition hover:border-sable"
                >
                  <span className={`flex size-10 shrink-0 items-center justify-center rounded-xl ${fondIcone}`}>
                    <Icone className="size-5" strokeWidth={1.75} />
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="flex flex-wrap items-center gap-2">
                      <span className="font-semibold">{m.titre}</span>
                      <span className="text-xs text-ivoire/55">{typeNom ?? "Information"}</span>
                      <Pastille actif={m.actif} />
                    </span>
                    <span className="mt-1 line-clamp-2 block text-sm leading-6 text-ivoire/65">{m.contenu}</span>
                  </span>
                  <Pencil className="mt-1 size-4 shrink-0 text-sable" aria-label="Modifier" />
                </Link>
              </li>
            );
          })}
        </ul>
      )}
    </>
  );
}
