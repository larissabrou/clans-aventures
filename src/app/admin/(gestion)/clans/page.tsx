import type { Metadata } from "next";
import { exigerAdmin } from "@/lib/admin";
import { listeClans } from "@/lib/clans";
import { actionCreerClan, actionModifierClan, actionSupprimerClan } from "../actions";
import { BoutonEnvoi, FormulaireAdmin } from "../formulaire";
import { CaseACocher, Carte, Champ, EnTete, Pastille, Vide, champClasses } from "../ui";

export const metadata: Metadata = { title: "Clans" };

export default async function ClansAdmin() {
  await exigerAdmin();
  const clans = await listeClans();

  return (
    <>
      <EnTete
        titre="Clans"
        texte="Les clans actifs sont proposés à l’inscription. Un membre sans clan voit « À définir » sur sa carte : attribue-le depuis sa fiche."
      />

      <Carte titre="Ajouter un clan">
        <FormulaireAdmin action={actionCreerClan} className="grid gap-4 sm:grid-cols-[1fr_2fr_auto] sm:items-end">
          <Champ label="Nom" id="nouveau-clan-nom">
            <input id="nouveau-clan-nom" name="nom" required maxLength={60} className={champClasses} />
          </Champ>
          <Champ label="Description (facultative)" id="nouveau-clan-description">
            <input id="nouveau-clan-description" name="description" maxLength={300} className={champClasses} />
          </Champ>
          <input type="hidden" name="actif" value="1" />
          <BoutonEnvoi>Ajouter</BoutonEnvoi>
        </FormulaireAdmin>
      </Carte>

      <h2 className="mt-10 mb-4 font-titre text-3xl font-semibold">Liste des clans</h2>
      {clans.length === 0 ? (
        <Vide texte="Aucun clan enregistré : le champ « Ton clan » n’apparaît pas à l’inscription tant qu’il n’y en a pas." />
      ) : (
        <ul className="grid gap-4">
          {clans.map((clan) => (
            <li key={clan.id} className="rounded-2xl border border-white/80 p-5">
              <div className="mb-4 flex flex-wrap items-center gap-3">
                <p className="font-titre text-2xl font-semibold">{clan.nom}</p>
                <Pastille actif={clan.actif} />
                <span className="text-xs text-ivoire/60">
                  {clan.membres} membre{clan.membres > 1 ? "s" : ""}
                </span>
              </div>
              <FormulaireAdmin
                action={actionModifierClan}
                className="grid gap-4 sm:grid-cols-[1fr_2fr] lg:grid-cols-[1fr_2fr_auto_auto] lg:items-end"
              >
                <input type="hidden" name="id" value={clan.id} />
                <Champ label="Nom" id={`clan-${clan.id}-nom`}>
                  <input id={`clan-${clan.id}-nom`} name="nom" required maxLength={60} defaultValue={clan.nom} className={champClasses} />
                </Champ>
                <Champ label="Description" id={`clan-${clan.id}-description`}>
                  <input
                    id={`clan-${clan.id}-description`}
                    name="description"
                    maxLength={300}
                    defaultValue={clan.description ?? ""}
                    className={champClasses}
                  />
                </Champ>
                <div className="pb-2.5">
                  <CaseACocher name="actif" label="Proposé à l’inscription" defaultChecked={clan.actif} />
                </div>
                <BoutonEnvoi style="secondaire">Enregistrer</BoutonEnvoi>
              </FormulaireAdmin>
              <FormulaireAdmin
                action={actionSupprimerClan}
                confirmation={`Supprimer le clan « ${clan.nom} » ? Ses ${clan.membres} membre(s) repasseront à « À définir ».`}
                className="mt-3 flex flex-wrap items-center gap-3"
              >
                <input type="hidden" name="id" value={clan.id} />
                <BoutonEnvoi style="danger">Supprimer</BoutonEnvoi>
              </FormulaireAdmin>
            </li>
          ))}
        </ul>
      )}
    </>
  );
}
