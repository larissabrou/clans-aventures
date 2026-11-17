import type { Metadata } from "next";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { actionCreerTypeAction } from "../../actions";
import { BoutonEnvoi, FormulaireAdmin } from "../../formulaire";
import { Carte, EnTete } from "../../ui";
import { ChampsTypeAction } from "../champs-type-action";

export const metadata: Metadata = { title: "Nouveau type d’action" };

export default function NouveauTypeAction() {

  return (
    <>
      <Link href="/admin/types-actions" className="mb-4 inline-flex items-center gap-2 text-sm text-sable hover:text-ivoire">
        <ArrowLeft className="size-4" />
        Tous les types d’actions
      </Link>
      <EnTete
        titre="Nouveau type d’action"
        texte="Il sera proposé dans le formulaire des événements et dans « Attribuer une action » sur la fiche des membres."
      />

      <Carte>
        <FormulaireAdmin action={actionCreerTypeAction} className="grid gap-5">
          <ChampsTypeAction />
          <div>
            <BoutonEnvoi>Créer le type d’action</BoutonEnvoi>
          </div>
        </FormulaireAdmin>
      </Carte>
    </>
  );
}
