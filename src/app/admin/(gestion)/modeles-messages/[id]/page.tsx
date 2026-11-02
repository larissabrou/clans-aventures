import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, TriangleAlert } from "lucide-react";
import { TexteAvecLiens } from "@/components/texte-avec-liens";
import { exigerAdmin } from "@/lib/admin";
import { modeleMessage } from "@/lib/modeles-messages";
import { typesMessagesActifs } from "@/lib/types-messages";
import { VALEURS_EXEMPLE_ETOILES, remplirVariables, variablesInconnues } from "@/lib/variables-messages";
import { actionModifierModeleMessage, actionSupprimerModeleMessage } from "../../actions";
import { BoutonEnvoi, FormulaireAdmin } from "../../formulaire";
import { ChampsMessageBienvenue } from "../../messages-bienvenue/champs-message-bienvenue";
import { Carte, EnTete } from "../../ui";

export const metadata: Metadata = { title: "Modèle de message" };

export default async function ModeleMessageAdmin({ params }: PageProps<"/admin/modeles-messages/[id]">) {
  await exigerAdmin();
  const id = Number((await params).id);
  if (!Number.isInteger(id) || id <= 0) notFound();
  const [modele, types] = await Promise.all([modeleMessage(id), typesMessagesActifs()]);
  if (!modele) notFound();

  const inconnues = variablesInconnues(`${modele.titre} ${modele.contenu}`, true);

  return (
    <>
      <Link href="/admin/modeles-messages" className="mb-4 inline-flex items-center gap-2 text-sm text-sable hover:text-ivoire">
        <ArrowLeft className="size-4" />
        Tous les modèles
      </Link>
      <EnTete titre={modele.titre} texte="Les modifications s’appliquent aux prochaines attributions (les messages déjà reçus ne changent pas)." />

      <Carte>
        <FormulaireAdmin action={actionModifierModeleMessage} className="grid gap-5">
          <input type="hidden" name="id" value={modele.id} />
          <ChampsMessageBienvenue
            message={modele}
            types={types}
            prefixe="modele"
            avecEtoiles
            typeParDefaut="star"
            libelleActif="Actif (proposé lors de l’attribution d’étoiles)"
          />
          <div>
            <BoutonEnvoi>Enregistrer</BoutonEnvoi>
          </div>
        </FormulaireAdmin>
      </Carte>

      <Carte titre="Aperçu" className="mt-8">
        {inconnues.length > 0 && (
          <p className="mb-4 flex gap-2 rounded-xl bg-bordeaux/40 px-4 py-3 text-sm">
            <TriangleAlert className="mt-0.5 size-4 shrink-0" />
            Variables inconnues, affichées telles quelles aux membres : {inconnues.map((v) => `{${v}}`).join(", ")}
          </p>
        )}
        <p className="mb-1 text-xs text-ivoire/50">
          Exemple : {VALEURS_EXEMPLE_ETOILES.etoiles} étoiles pour « {VALEURS_EXEMPLE_ETOILES.action} » à {VALEURS_EXEMPLE_ETOILES.prenom} :
        </p>
        <div className="overflow-hidden rounded-2xl border border-sable">
          <p className="bg-sable px-5 py-4 font-titre text-2xl font-semibold text-charbon">
            {remplirVariables(modele.titre, VALEURS_EXEMPLE_ETOILES)}
          </p>
          <p className="px-5 py-4 text-sm leading-7 whitespace-pre-line text-ivoire/85">
            <TexteAvecLiens texte={remplirVariables(modele.contenu, VALEURS_EXEMPLE_ETOILES)} />
          </p>
        </div>
      </Carte>

      <FormulaireAdmin
        action={actionSupprimerModeleMessage}
        confirmation="Supprimer ce modèle ? Les messages déjà envoyés restent chez les membres."
        className="mt-6"
      >
        <input type="hidden" name="id" value={modele.id} />
        <BoutonEnvoi style="danger">Supprimer ce modèle</BoutonEnvoi>
      </FormulaireAdmin>
    </>
  );
}
