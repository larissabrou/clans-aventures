import Link from "next/link";
import type { Evenement, TypeAction } from "@/lib/db/schema";
import { CaseACocher, Champ, champClasses } from "../ui";

/** Valeur d'un <input type="datetime-local"> : heure d'Abidjan, qui est l'heure UTC. */
const versChampDate = (date: Date) => date.toISOString().slice(0, 16);

/** Champs communs à la création et à la modification d'un événement. */
export function ChampsEvenement({
  evenement,
  types,
  imageUrl,
}: {
  evenement?: Evenement;
  types: TypeAction[];
  // Image actuelle de l'événement (modification), ou null.
  imageUrl?: string | null;
}) {
  const prefixe = evenement ? `evenement-${evenement.id}` : "nouvel-evenement";

  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
      <Champ label="Titre" id={`${prefixe}-titre`} className="sm:col-span-2">
        <input
          id={`${prefixe}-titre`}
          name="titre"
          required
          maxLength={120}
          placeholder="Ex. CLANS CAMP — Grand-Bassam"
          defaultValue={evenement?.titre}
          className={champClasses}
        />
      </Champ>
      <Champ label="Type d’action (étoiles)" id={`${prefixe}-type`} className="sm:col-span-2">
        <select
          id={`${prefixe}-type`}
          name="typeActionId"
          defaultValue={evenement?.typeActionId ?? ""}
          className={champClasses}
        >
          <option value="">Aucune étoile</option>
          {types
            .filter((t) => t.code === null)
            .map((t) => (
              <option key={t.id} value={t.id}>
                {t.nom} — {t.etoiles} ★{t.actif ? "" : " (inactive)"}
              </option>
            ))}
        </select>
        <Link href="/admin/types-actions" className="mt-1.5 inline-block text-xs text-sable hover:text-ivoire">
          Créer ou modifier les types d’actions
        </Link>
      </Champ>

      <Champ label="Date et heure" id={`${prefixe}-date`}>
        <input
          id={`${prefixe}-date`}
          name="date"
          type="datetime-local"
          required
          defaultValue={evenement ? versChampDate(evenement.date) : undefined}
          className={`${champClasses} [color-scheme:dark]`}
        />
      </Champ>
      <Champ label="Lieu" id={`${prefixe}-lieu`}>
        <input
          id={`${prefixe}-lieu`}
          name="lieu"
          maxLength={200}
          placeholder="Ex. Assinie"
          defaultValue={evenement?.lieu ?? ""}
          className={champClasses}
        />
      </Champ>
      <Champ label="Prix (FCFA, vide = gratuit)" id={`${prefixe}-prix`}>
        <input
          id={`${prefixe}-prix`}
          name="prix"
          type="number"
          min={0}
          step={1}
          defaultValue={evenement?.prix ?? ""}
          className={champClasses}
        />
      </Champ>
      <Champ label="Places (vide = sans limite)" id={`${prefixe}-places`}>
        <input
          id={`${prefixe}-places`}
          name="places"
          type="number"
          min={1}
          step={1}
          defaultValue={evenement?.places ?? ""}
          className={champClasses}
        />
      </Champ>

      <Champ label="Description" id={`${prefixe}-description`} className="sm:col-span-2 lg:col-span-4">
        <textarea
          id={`${prefixe}-description`}
          name="description"
          rows={4}
          maxLength={2000}
          placeholder="Programme, matériel à prévoir, point de rendez-vous…"
          defaultValue={evenement?.description ?? ""}
          className={champClasses}
        />
      </Champ>

      <div className="flex flex-wrap items-start gap-5 sm:col-span-2 lg:col-span-4">
        {imageUrl && (
          // eslint-disable-next-line @next/next/no-img-element -- image servie par /api (stockée en base)
          <img src={imageUrl} alt="Image actuelle de l’événement" className="h-28 w-44 rounded-xl border border-white/30 object-cover" />
        )}
        <div className="min-w-60 flex-1">
          <Champ label={imageUrl ? "Remplacer l’image" : "Image (facultative)"} id={`${prefixe}-image`}>
            <input
              id={`${prefixe}-image`}
              name="image"
              type="file"
              accept="image/jpeg,image/png,image/webp"
              className={`${champClasses} file:mr-4 file:rounded-full file:border-0 file:bg-terre file:px-4 file:py-1.5 file:text-xs file:font-semibold file:text-white`}
            />
          </Champ>
          <p className="mt-1.5 text-xs text-ivoire/50">JPEG, PNG ou WebP, 4 Mo maximum. Format paysage conseillé.</p>
          {imageUrl && (
            <div className="mt-3">
              <CaseACocher name="retirerImage" label="Retirer l’image" />
            </div>
          )}
        </div>
      </div>

      <Champ label="Conditions de participation" id={`${prefixe}-conditions`} className="sm:col-span-2 lg:col-span-4">
        <textarea
          id={`${prefixe}-conditions`}
          name="conditions"
          rows={3}
          maxLength={2000}
          placeholder="Âge minimum, tenue, matériel, paiement avant le…"
          defaultValue={evenement?.conditions ?? ""}
          className={champClasses}
        />
      </Champ>

      <div className="flex flex-wrap items-end gap-6 sm:col-span-2 lg:col-span-4">
        <div className="pb-2.5">
          <CaseACocher name="obligatoire" label="Événement obligatoire" defaultChecked={evenement?.obligatoire} />
        </div>
        <Champ label="Pénalité si absence (étoiles)" id={`${prefixe}-penalite`} className="w-56">
          <input
            id={`${prefixe}-penalite`}
            name="penalite"
            type="number"
            min={0}
            step={1}
            defaultValue={evenement?.penalite ?? 0}
            className={champClasses}
          />
        </Champ>
      </div>
    </div>
  );
}
