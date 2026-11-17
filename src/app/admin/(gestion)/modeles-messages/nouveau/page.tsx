import type { Metadata } from "next";
import { Suspense } from "react";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { typesMessagesActifs } from "@/lib/types-messages";
import { actionCreerModeleMessage } from "../../actions";
import { BoutonEnvoi, FormulaireAdmin } from "../../formulaire";
import { ChampsMessageBienvenue } from "../../messages-bienvenue/champs-message-bienvenue";
import { Carte, ChargementPage, EnTete } from "../../ui";

export const metadata: Metadata = { title: "Nouveau modèle de message" };

// La mise en page vérifie déjà la session ; les lectures dynamiques restent dans <Suspense>,
// sinon la page bloque le rendu et ne s'hydrate pas lors d'un chargement direct.
export default function NouveauModeleMessage() {
  return (
    <Suspense fallback={<ChargementPage />}>
      <Contenu />
    </Suspense>
  );
}

async function Contenu() {
  const types = await typesMessagesActifs();

  return (
    <>
      <Link href="/admin/modeles-messages" className="mb-4 inline-flex items-center gap-2 text-sm text-sable hover:text-ivoire">
        <ArrowLeft className="size-4" />
        Tous les modèles
      </Link>
      <EnTete titre="Nouveau modèle de message" texte="Il sera proposé dans « Attribuer une action » sur la fiche des membres." />

      <Carte>
        <FormulaireAdmin action={actionCreerModeleMessage} className="grid gap-5">
          <ChampsMessageBienvenue
            types={types}
            prefixe="modele"
            avecEtoiles
            typeParDefaut="star"
            libelleActif="Actif (proposé lors de l’attribution d’étoiles)"
          />
          <div>
            <BoutonEnvoi>Créer le modèle</BoutonEnvoi>
          </div>
        </FormulaireAdmin>
      </Carte>
    </>
  );
}
