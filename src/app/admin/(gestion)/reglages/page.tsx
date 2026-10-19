import type { Metadata } from "next";
import { exigerAdmin } from "@/lib/admin";
import { formatFcfa } from "@/lib/adhesion";
import { montantADebiter } from "@/lib/adhesions";
import { prixAdhesion } from "@/lib/parametres";
import { actionPrixAdhesion } from "../actions";
import { BoutonEnvoi, FormulaireAdmin } from "../formulaire";
import { Carte, Champ, EnTete, champClasses } from "../ui";

export const metadata: Metadata = { title: "Réglages" };

export default async function ReglagesAdmin() {
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
