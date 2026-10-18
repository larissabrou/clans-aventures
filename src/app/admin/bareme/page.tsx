import type { Metadata } from "next";
import { exigerAdmin } from "@/lib/admin";
import { listeTypesActions } from "@/lib/bareme";
import { actionCreerTypeAction, actionModifierTypeAction, actionSupprimerTypeAction } from "../actions";
import { BoutonEnvoi, FormulaireAdmin } from "../formulaire";
import { CaseACocher, Carte, Champ, EnTete, Pastille, champClasses } from "../ui";

export const metadata: Metadata = { title: "Barème des étoiles" };

export default async function BaremeAdmin() {
  await exigerAdmin();
  const types = await listeTypesActions();

  return (
    <>
      <EnTete
        titre="Barème des étoiles"
        texte="Chaque action rapporte des étoiles. Les participations sont créditées quand tu valides la présence d’un membre à un événement de ce type ; le parrainage est crédité automatiquement quand l’adhésion du filleul est payée."
      />

      <ul className="grid gap-4">
        {types.map((type) => (
          <li key={type.id} className="rounded-2xl border border-white/80 p-5">
            <div className="mb-4 flex flex-wrap items-center gap-3">
              <p className="font-titre text-2xl font-semibold">{type.nom}</p>
              <Pastille actif={type.actif} />
              {type.code === "parrainage" && (
                <span className="text-xs text-ivoire/60">Attribué automatiquement</span>
              )}
              {type.etoiles === 0 && <span className="text-xs font-semibold text-terre">Barème à définir</span>}
            </div>
            <FormulaireAdmin
              action={actionModifierTypeAction}
              className="grid gap-4 sm:grid-cols-[2fr_1fr] lg:grid-cols-[2fr_1fr_auto_auto] lg:items-end"
            >
              <input type="hidden" name="id" value={type.id} />
              <Champ label="Action" id={`action-${type.id}-nom`}>
                <input id={`action-${type.id}-nom`} name="nom" required maxLength={80} defaultValue={type.nom} className={champClasses} />
              </Champ>
              <Champ label="Étoiles" id={`action-${type.id}-etoiles`}>
                <input
                  id={`action-${type.id}-etoiles`}
                  name="etoiles"
                  type="number"
                  step={1}
                  min={-1000}
                  max={1000}
                  required
                  defaultValue={type.etoiles}
                  className={champClasses}
                />
              </Champ>
              <div className="pb-2.5">
                <CaseACocher name="actif" label="Active" defaultChecked={type.actif} />
              </div>
              <BoutonEnvoi style="secondaire">Enregistrer</BoutonEnvoi>
            </FormulaireAdmin>
            {type.code === null && (
              <FormulaireAdmin
                action={actionSupprimerTypeAction}
                confirmation={`Supprimer l’action « ${type.nom} » ? Les étoiles déjà gagnées restent acquises.`}
                className="mt-3"
              >
                <input type="hidden" name="id" value={type.id} />
                <BoutonEnvoi style="danger">Supprimer</BoutonEnvoi>
              </FormulaireAdmin>
            )}
          </li>
        ))}
      </ul>

      <Carte titre="Ajouter une action" className="mt-8">
        <FormulaireAdmin action={actionCreerTypeAction} className="grid gap-4 sm:grid-cols-[2fr_1fr_auto] sm:items-end">
          <Champ label="Action" id="nouvelle-action-nom">
            <input id="nouvelle-action-nom" name="nom" required maxLength={80} placeholder="Ex. Participation à un atelier" className={champClasses} />
          </Champ>
          <Champ label="Étoiles" id="nouvelle-action-etoiles">
            <input id="nouvelle-action-etoiles" name="etoiles" type="number" step={1} min={-1000} max={1000} required className={champClasses} />
          </Champ>
          <input type="hidden" name="actif" value="1" />
          <BoutonEnvoi>Ajouter</BoutonEnvoi>
        </FormulaireAdmin>
      </Carte>
    </>
  );
}
