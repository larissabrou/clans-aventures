import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { exigerAdmin } from "@/lib/admin";
import { typeAction } from "@/lib/bareme";
import { actionModifierTypeAction, actionSupprimerTypeAction } from "../../actions";
import { BoutonEnvoi, FormulaireAdmin } from "../../formulaire";
import { Carte, EnTete } from "../../ui";
import { ChampsTypeAction } from "../champs-type-action";

export const metadata: Metadata = { title: "Type d’action" };

export default async function TypeActionAdmin({ params }: PageProps<"/admin/types-actions/[id]">) {
  await exigerAdmin();
  const id = Number((await params).id);
  if (!Number.isInteger(id) || id <= 0) notFound();
  const type = await typeAction(id);
  if (!type) notFound();

  return (
    <>
      <Link href="/admin/types-actions" className="mb-4 inline-flex items-center gap-2 text-sm text-sable hover:text-ivoire">
        <ArrowLeft className="size-4" />
        Tous les types d’actions
      </Link>
      <EnTete
        titre={type.nom}
        texte={
          type.code === "parrainage"
            ? "Crédité automatiquement au parrain quand l’adhésion d’un filleul est payée."
            : "Le nouveau barème s’applique aux prochaines présences et attributions ; les étoiles déjà gagnées ne changent pas."
        }
      />

      <Carte>
        <FormulaireAdmin action={actionModifierTypeAction} className="grid gap-5">
          <input type="hidden" name="id" value={type.id} />
          <ChampsTypeAction type={type} />
          <div>
            <BoutonEnvoi>Enregistrer</BoutonEnvoi>
          </div>
        </FormulaireAdmin>
      </Carte>

      {type.code === null && (
        <FormulaireAdmin
          action={actionSupprimerTypeAction}
          confirmation={`Supprimer « ${type.nom} » ? Les étoiles déjà gagnées restent acquises ; les événements de ce type n’en rapporteront plus.`}
          className="mt-6"
        >
          <input type="hidden" name="id" value={type.id} />
          <BoutonEnvoi style="danger">Supprimer ce type d’action</BoutonEnvoi>
        </FormulaireAdmin>
      )}
    </>
  );
}
