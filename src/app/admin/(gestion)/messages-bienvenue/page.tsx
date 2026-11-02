import type { Metadata } from "next";
import Link from "next/link";
import { Pencil, Plus } from "lucide-react";
import { exigerAdmin } from "@/lib/admin";
import { apparenceMessage } from "@/lib/apparence-messages";
import { listeMessagesBienvenue } from "@/lib/messages-bienvenue";
import { actionOrdonnerMessagesBienvenue } from "../actions";
import { OrdreListe } from "../ordre-liste";
import { Carte, EnTete, Pastille, Vide } from "../ui";

export const metadata: Metadata = { title: "Messages de bienvenue" };

export default async function MessagesBienvenueAdmin() {
  await exigerAdmin();
  const lignes = await listeMessagesBienvenue();

  return (
    <>
      <div className="flex flex-wrap items-end justify-between gap-4">
        <EnTete
          titre="Messages de bienvenue"
          texte="Chaque nouveau membre reçoit ces messages dans son espace dès que son adhésion est confirmée, dans l’ordre ci-dessous. Les variables ({prenom}, {clan}, {salutation}…) sont remplacées par ses informations."
        />
        <Link
          href="/admin/messages-bienvenue/nouveau"
          className="mb-8 inline-flex items-center gap-2 rounded-full bg-terre px-5 py-2.5 text-xs font-bold tracking-[1px] text-white uppercase transition hover:bg-sable hover:text-charbon"
        >
          <Plus className="size-4" />
          Nouveau message
        </Link>
      </div>

      {lignes.length === 0 ? (
        <Vide texte="Aucun message de bienvenue : les nouveaux membres ne recevront aucun message à leur adhésion." />
      ) : (
        <>
          {lignes.length > 1 && (
            <Carte titre="Ordre d’envoi" className="mb-8">
              <p className="mb-4 text-sm text-ivoire/70">Fais glisser les messages (ou utilise les flèches) : le n°1 est envoyé en premier.</p>
              <OrdreListe
                key={[...lignes]
                  .sort((a, b) => a.message.id - b.message.id)
                  .map(({ message: m }) => `${m.id}:${m.titre}:${m.actif}`)
                  .join("|")}
                elements={lignes.map(({ message: m }) => ({ id: m.id, nom: m.titre, actif: m.actif }))}
                action={actionOrdonnerMessagesBienvenue}
              />
            </Carte>
          )}

          <ul className="grid gap-3">
            {lignes.map(({ message: m, typeNom, couleur, icone }, index) => {
              const { Icone, fondIcone } = apparenceMessage(couleur, icone);
              return (
                <li key={m.id}>
                  <Link
                    href={`/admin/messages-bienvenue/${m.id}`}
                    className="flex gap-4 rounded-2xl border border-white/80 p-5 transition hover:border-sable"
                  >
                    <span className={`flex size-10 shrink-0 items-center justify-center rounded-xl ${fondIcone}`}>
                      <Icone className="size-5" strokeWidth={1.75} />
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="flex flex-wrap items-center gap-2">
                        <span className="text-sm font-semibold text-sable">{index + 1}.</span>
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
        </>
      )}
    </>
  );
}
