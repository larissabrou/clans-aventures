import type { Metadata } from "next";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { exigerAdmin } from "@/lib/admin";
import { typesMessagesActifs } from "@/lib/types-messages";
import { actionCreerMessageBienvenue } from "../../actions";
import { BoutonEnvoi, FormulaireAdmin } from "../../formulaire";
import { Carte, EnTete } from "../../ui";
import { ChampsMessageBienvenue } from "../champs-message-bienvenue";

export const metadata: Metadata = { title: "Nouveau message de bienvenue" };

export default async function NouveauMessageBienvenue() {
  await exigerAdmin();
  const types = await typesMessagesActifs();

  return (
    <>
      <Link href="/admin/messages-bienvenue" className="mb-4 inline-flex items-center gap-2 text-sm text-sable hover:text-ivoire">
        <ArrowLeft className="size-4" />
        Tous les messages de bienvenue
      </Link>
      <EnTete titre="Nouveau message de bienvenue" texte="Il sera envoyé en dernier ; change sa place depuis la liste." />

      <Carte>
        <FormulaireAdmin action={actionCreerMessageBienvenue} className="grid gap-5">
          <ChampsMessageBienvenue types={types} />
          <div>
            <BoutonEnvoi>Créer le message</BoutonEnvoi>
          </div>
        </FormulaireAdmin>
      </Carte>
    </>
  );
}
