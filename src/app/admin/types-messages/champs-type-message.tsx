import { COULEURS_MESSAGES, ICONES_MESSAGES } from "@/lib/apparence-messages";
import type { TypeMessage } from "@/lib/db/schema";
import { CaseACocher, Champ, champClasses, etiquetteClasses } from "../ui";

/** Champs communs à la création et à la modification : nom, couleur, icône, statut. */
export function ChampsTypeMessage({ type }: { type?: TypeMessage }) {
  const couleur = type?.couleur ?? "neutre";
  const icone = type?.icone ?? "info";

  return (
    <div className="grid gap-5">
      <Champ label="Nom du type" id="type-message-nom" className="max-w-md">
        <input
          id="type-message-nom"
          name="nom"
          required
          maxLength={40}
          placeholder="Ex. Rappel, Bon plan, Félicitations"
          defaultValue={type?.nom}
          className={champClasses}
        />
      </Champ>

      <fieldset>
        <legend className={etiquetteClasses}>Couleur</legend>
        <div className="flex flex-wrap gap-2">
          {Object.entries(COULEURS_MESSAGES).map(([cle, c]) => (
            <label key={cle} className="cursor-pointer">
              <input type="radio" name="couleur" value={cle} defaultChecked={cle === couleur} className="peer sr-only" />
              <span
                className={`inline-flex rounded-full px-4 py-1.5 text-sm font-semibold ring-offset-2 ring-offset-charbon transition peer-checked:ring-2 peer-checked:ring-sable peer-focus-visible:ring-2 peer-focus-visible:ring-white ${c.pastille}`}
              >
                {c.label}
              </span>
            </label>
          ))}
        </div>
      </fieldset>

      <fieldset>
        <legend className={etiquetteClasses}>Icône</legend>
        <div className="flex flex-wrap gap-2">
          {Object.entries(ICONES_MESSAGES).map(([cle, { label, Icone }]) => (
            <label key={cle} className="cursor-pointer" title={label}>
              <input type="radio" name="icone" value={cle} defaultChecked={cle === icone} className="peer sr-only" />
              <span className="flex size-11 items-center justify-center rounded-xl border border-white/25 text-ivoire/80 transition peer-checked:border-sable peer-checked:bg-sable/20 peer-checked:text-sable peer-focus-visible:ring-2 peer-focus-visible:ring-white hover:border-white/60">
                <Icone className="size-5" strokeWidth={1.75} />
                <span className="sr-only">{label}</span>
              </span>
            </label>
          ))}
        </div>
      </fieldset>

      <CaseACocher name="actif" label="Actif (proposé dans le formulaire d’envoi)" defaultChecked={type?.actif ?? true} />
    </div>
  );
}
