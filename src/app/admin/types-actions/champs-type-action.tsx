import type { TypeAction } from "@/lib/db/schema";
import { CaseACocher, Champ, champClasses } from "../ui";

/** Champs communs à la création et à la modification d'un type d'action. */
export function ChampsTypeAction({ type }: { type?: TypeAction }) {
  return (
    <div className="grid gap-4 sm:grid-cols-[2fr_1fr]">
      <Champ label="Nom de l’action" id="type-nom">
        <input
          id="type-nom"
          name="nom"
          required
          maxLength={80}
          placeholder="Ex. Participation à un camping"
          defaultValue={type?.nom}
          className={champClasses}
        />
      </Champ>
      <Champ label="Nombre d’étoiles" id="type-etoiles">
        <input
          id="type-etoiles"
          name="etoiles"
          type="number"
          step={1}
          min={-1000}
          max={1000}
          required
          placeholder="Ex. 10"
          defaultValue={type?.etoiles}
          className={champClasses}
        />
      </Champ>
      <div className="sm:col-span-2">
        <CaseACocher name="actif" label="Active (proposée pour les événements et les attributions)" defaultChecked={type?.actif ?? true} />
      </div>
    </div>
  );
}
