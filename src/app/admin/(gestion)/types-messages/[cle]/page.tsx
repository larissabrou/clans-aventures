import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { exigerAdmin } from "@/lib/admin";
import { typeMessage } from "@/lib/types-messages";
import { actionModifierTypeMessage, actionSupprimerTypeMessage } from "../../actions";
import { BoutonEnvoi, FormulaireAdmin } from "../../formulaire";
import { Carte, EnTete } from "../../ui";
import { ChampsTypeMessage } from "../champs-type-message";

export const metadata: Metadata = { title: "Type de message" };

export default async function TypeMessageAdmin({ params }: PageProps<"/admin/types-messages/[cle]">) {
  await exigerAdmin();
  const { cle } = await params;
  const type = await typeMessage(decodeURIComponent(cle));
  if (!type) notFound();

  return (
    <>
      <Link href="/admin/types-messages" className="mb-4 inline-flex items-center gap-2 text-sm text-sable hover:text-ivoire">
        <ArrowLeft className="size-4" />
        Tous les types de messages
      </Link>
      <EnTete
        titre={type.nom}
        texte={
          type.systeme
            ? "Type utilisé aussi par les messages automatiques du site : il peut être renommé ou recoloré, pas supprimé."
            : "Les messages déjà envoyés prennent aussitôt la nouvelle apparence."
        }
      />

      <Carte>
        <FormulaireAdmin action={actionModifierTypeMessage} className="grid gap-5">
          <input type="hidden" name="cle" value={type.cle} />
          <ChampsTypeMessage type={type} />
          <div>
            <BoutonEnvoi>Enregistrer</BoutonEnvoi>
          </div>
        </FormulaireAdmin>
      </Carte>

      {!type.systeme && (
        <FormulaireAdmin
          action={actionSupprimerTypeMessage}
          confirmation={`Supprimer le type « ${type.nom} » ? Ses messages passeront en « Information ».`}
          className="mt-6"
        >
          <input type="hidden" name="cle" value={type.cle} />
          <BoutonEnvoi style="danger">Supprimer ce type de message</BoutonEnvoi>
        </FormulaireAdmin>
      )}
    </>
  );
}
