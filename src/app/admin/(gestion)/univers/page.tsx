import type { Metadata } from "next";
import { exigerAdmin } from "@/lib/admin";
import { listeUnivers } from "@/lib/univers-culturels";
import { actionCreerUnivers, actionModifierUnivers, actionOrdonnerUnivers, actionSupprimerUnivers } from "../actions";
import { BoutonEnvoi, FormulaireAdmin } from "../formulaire";
import { OrdreListe } from "../ordre-liste";
import { CaseACocher, Carte, Champ, EnTete, Pastille, Vide, champClasses } from "../ui";

export const metadata: Metadata = { title: "Univers" };

export default async function UniversAdmin() {
  await exigerAdmin();
  const univers = await listeUnivers();

  return (
    <>
      <EnTete
        titre="Univers"
        texte="Les univers actifs sont proposés à l’inscription, à la question « Univers que tu souhaites découvrir » (facultative)."
      />

      <Carte titre="Ajouter un univers">
        <FormulaireAdmin action={actionCreerUnivers} className="grid gap-4 sm:grid-cols-[1fr_auto] sm:items-end">
          <Champ label="Nom" id="nouvel-univers-nom">
            <input id="nouvel-univers-nom" name="nom" required maxLength={60} placeholder="Ex. Univers Akan" className={champClasses} />
          </Champ>
          <input type="hidden" name="actif" value="1" />
          <BoutonEnvoi>Ajouter</BoutonEnvoi>
        </FormulaireAdmin>
      </Carte>

      {univers.length > 1 && (
        <Carte titre="Ordre d’affichage" className="mt-8">
          <p className="mb-4 text-sm text-ivoire/70">
            Fais glisser les univers (ou utilise les flèches) : la liste de l’inscription suit cet ordre.
          </p>
          <OrdreListe
            // Remonté seulement si les univers eux-mêmes changent (ajout, nom, statut), pas leur ordre.
            key={[...univers]
              .sort((a, b) => a.id - b.id)
              .map((u) => `${u.id}:${u.nom}:${u.actif}`)
              .join("|")}
            elements={univers.map(({ id, nom, actif }) => ({ id, nom, actif }))}
            action={actionOrdonnerUnivers}
          />
        </Carte>
      )}

      <h2 className="mt-10 mb-4 font-titre text-3xl font-semibold">Liste des univers</h2>
      {univers.length === 0 ? (
        <Vide texte="Aucun univers : la question « Univers que tu souhaites découvrir » n’apparaît pas à l’inscription." />
      ) : (
        <ul className="grid gap-4">
          {univers.map((u) => (
            <li key={u.id} className="rounded-2xl border border-white/80 p-5">
              <div className="mb-4 flex flex-wrap items-center gap-3">
                <p className="font-titre text-2xl font-semibold">{u.nom}</p>
                <Pastille actif={u.actif} />
                <span className="text-xs text-ivoire/60">
                  Choisi par {u.membres} membre{u.membres > 1 ? "s" : ""}
                </span>
              </div>
              <FormulaireAdmin action={actionModifierUnivers} className="grid gap-4 sm:grid-cols-[1fr_auto_auto] sm:items-end">
                <input type="hidden" name="id" value={u.id} />
                <Champ label="Nom" id={`univers-${u.id}-nom`}>
                  <input id={`univers-${u.id}-nom`} name="nom" required maxLength={60} defaultValue={u.nom} className={champClasses} />
                </Champ>
                <div className="pb-2.5">
                  <CaseACocher name="actif" label="Proposé à l’inscription" defaultChecked={u.actif} />
                </div>
                <BoutonEnvoi style="secondaire">Enregistrer</BoutonEnvoi>
              </FormulaireAdmin>
              <FormulaireAdmin
                action={actionSupprimerUnivers}
                confirmation={`Supprimer « ${u.nom} » ? Les membres qui l’ont choisi gardent ce nom sur leur fiche.`}
                className="mt-3"
              >
                <input type="hidden" name="id" value={u.id} />
                <BoutonEnvoi style="danger">Supprimer</BoutonEnvoi>
              </FormulaireAdmin>
            </li>
          ))}
        </ul>
      )}
    </>
  );
}
