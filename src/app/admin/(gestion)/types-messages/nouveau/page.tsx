import type { Metadata } from "next";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { exigerAdmin } from "@/lib/admin";
import { actionCreerTypeMessage } from "../../actions";
import { BoutonEnvoi, FormulaireAdmin } from "../../formulaire";
import { Carte, EnTete } from "../../ui";
import { ChampsTypeMessage } from "../champs-type-message";

export const metadata: Metadata = { title: "Nouveau type de message" };

export default async function NouveauTypeMessage() {
  await exigerAdmin();

  return (
    <>
      <Link href="/admin/types-messages" className="mb-4 inline-flex items-center gap-2 text-sm text-sable hover:text-ivoire">
        <ArrowLeft className="size-4" />
        Tous les types de messages
      </Link>
      <EnTete titre="Nouveau type de message" texte="Il sera proposé dans le formulaire « Nouveau message »." />

      <Carte>
        <FormulaireAdmin action={actionCreerTypeMessage} className="grid gap-5">
          <ChampsTypeMessage />
          <div>
            <BoutonEnvoi>Créer le type de message</BoutonEnvoi>
          </div>
        </FormulaireAdmin>
      </Carte>
    </>
  );
}
