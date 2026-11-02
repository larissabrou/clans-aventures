import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, TriangleAlert } from "lucide-react";
import { exigerAdmin } from "@/lib/admin";
import { messageBienvenue } from "@/lib/messages-bienvenue";
import { typesMessagesActifs } from "@/lib/types-messages";
import { VALEURS_EXEMPLE, remplirVariables, variablesInconnues } from "@/lib/variables-messages";
import { actionModifierMessageBienvenue, actionSupprimerMessageBienvenue } from "../../actions";
import { BoutonEnvoi, FormulaireAdmin } from "../../formulaire";
import { Carte, EnTete } from "../../ui";
import { ChampsMessageBienvenue } from "../champs-message-bienvenue";

export const metadata: Metadata = { title: "Message de bienvenue" };

export default async function MessageBienvenueAdmin({ params }: PageProps<"/admin/messages-bienvenue/[id]">) {
  await exigerAdmin();
  const id = Number((await params).id);
  if (!Number.isInteger(id) || id <= 0) notFound();
  const [message, types] = await Promise.all([messageBienvenue(id), typesMessagesActifs()]);
  if (!message) notFound();

  const inconnues = variablesInconnues(`${message.titre} ${message.contenu}`);

  return (
    <>
      <Link href="/admin/messages-bienvenue" className="mb-4 inline-flex items-center gap-2 text-sm text-sable hover:text-ivoire">
        <ArrowLeft className="size-4" />
        Tous les messages de bienvenue
      </Link>
      <EnTete titre={message.titre} texte="Les modifications s’appliquent aux prochaines adhésions (les messages déjà reçus ne changent pas)." />

      <Carte>
        <FormulaireAdmin action={actionModifierMessageBienvenue} className="grid gap-5">
          <input type="hidden" name="id" value={message.id} />
          <ChampsMessageBienvenue message={message} types={types} />
          <div>
            <BoutonEnvoi>Enregistrer</BoutonEnvoi>
          </div>
        </FormulaireAdmin>
      </Carte>

      {/* Aperçu avec un membre fictif : vérifie le rendu des variables. */}
      <Carte titre="Aperçu" className="mt-8">
        {inconnues.length > 0 && (
          <p className="mb-4 flex gap-2 rounded-xl bg-bordeaux/40 px-4 py-3 text-sm">
            <TriangleAlert className="mt-0.5 size-4 shrink-0" />
            Variables inconnues, affichées telles quelles aux membres : {inconnues.map((v) => `{${v}}`).join(", ")}
          </p>
        )}
        <p className="mb-1 text-xs text-ivoire/50">
          Exemple pour {VALEURS_EXEMPLE.prenom} {VALEURS_EXEMPLE.nom}, clan {VALEURS_EXEMPLE.clan} ({VALEURS_EXEMPLE.salutation}) :
        </p>
        <div className="overflow-hidden rounded-2xl border border-sable">
          <p className="bg-sable px-5 py-4 font-titre text-2xl font-semibold text-charbon">
            {remplirVariables(message.titre, VALEURS_EXEMPLE)}
          </p>
          <p className="px-5 py-4 text-sm leading-7 whitespace-pre-line text-ivoire/85">
            {remplirVariables(message.contenu, VALEURS_EXEMPLE)}
          </p>
        </div>
      </Carte>

      <FormulaireAdmin
        action={actionSupprimerMessageBienvenue}
        confirmation="Supprimer ce message de bienvenue ? Les membres qui l’ont déjà reçu le gardent."
        className="mt-6"
      >
        <input type="hidden" name="id" value={message.id} />
        <BoutonEnvoi style="danger">Supprimer ce message</BoutonEnvoi>
      </FormulaireAdmin>
    </>
  );
}
