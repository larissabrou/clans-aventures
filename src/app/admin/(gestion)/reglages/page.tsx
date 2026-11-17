import type { Metadata } from "next";
import { Suspense } from "react";
import { exigerAdmin } from "@/lib/admin";
import { formatFcfa } from "@/lib/adhesion";
import { montantADebiter } from "@/lib/adhesions";
import { prixAdhesion } from "@/lib/parametres";
import { actionPrixAdhesion } from "../actions";
import { BoutonEnvoi, FormulaireAdmin } from "../formulaire";
import { Carte, Champ, ChargementPage, EnTete, champClasses } from "../ui";

export const metadata: Metadata = { title: "Réglages" };

// La vérification du rôle lit la session : elle se fait dans <Suspense>, sinon la page bloque
// le rendu et ne s'hydrate pas lors d'un chargement direct.
export default function ReglagesAdmin() {
  return (
    <Suspense fallback={<ChargementPage />}>
      <Contenu />
    </Suspense>
  );
}

async function Contenu() {
  await exigerAdmin("super_admin");
  const [prix, debite] = await Promise.all([prixAdhesion(), montantADebiter()]);

  return (
    <>
      <EnTete titre="Réglages" />

      <Carte titre="Prix de l’adhésion">
        <FormulaireAdmin action={actionPrixAdhesion} className="flex flex-wrap items-end gap-4">
          <Champ label="Prix affiché (FCFA)" id="prix" className="w-48">
            <input id="prix" name="prix" type="number" min={100} max={1000000} step={1} required defaultValue={prix} className={champClasses} />
          </Champ>
          <BoutonEnvoi>Enregistrer</BoutonEnvoi>
        </FormulaireAdmin>
        <p className="mt-4 text-sm leading-6 text-ivoire/70">
          Montant réellement débité aujourd’hui : <strong className="text-sable">{formatFcfa(debite)} FCFA</strong>.
          {debite !== prix && (
            <>
              {" "}
              Il diffère du prix affiché car la variable <code className="text-sable">MONTANT_DEBITE</code> est
              définie sur le serveur (phase de test). Supprime-la dans Coolify pour débiter le prix affiché.
            </>
          )}
        </p>
      </Carte>
    </>
  );
}
