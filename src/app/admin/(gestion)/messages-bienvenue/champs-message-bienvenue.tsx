import type { MessageBienvenue, TypeMessage } from "@/lib/db/schema";
import { VARIABLES_MESSAGES } from "@/lib/variables-messages";
import { CaseACocher, Champ, champClasses } from "../ui";

/** Champs communs à la création et à la modification, avec l'aide sur les variables. */
export function ChampsMessageBienvenue({ message, types }: { message?: MessageBienvenue; types: TypeMessage[] }) {
  return (
    <div className="grid gap-5 lg:grid-cols-[1fr_17rem]">
      <div className="grid content-start gap-4">
        <div className="grid gap-4 sm:grid-cols-[2fr_1fr]">
          <Champ label="Titre" id="bienvenue-titre">
            <input
              id="bienvenue-titre"
              name="titre"
              required
              maxLength={120}
              placeholder="Ex. Bienvenue dans CLANS aventures, {prenom} !"
              defaultValue={message?.titre}
              className={champClasses}
            />
          </Champ>
          <Champ label="Type" id="bienvenue-type">
            <select id="bienvenue-type" name="type" defaultValue={message?.type ?? "info"} className={champClasses}>
              {types.map((t) => (
                <option key={t.cle} value={t.cle}>
                  {t.nom}
                </option>
              ))}
            </select>
          </Champ>
        </div>
        <Champ label="Message" id="bienvenue-contenu">
          <textarea
            id="bienvenue-contenu"
            name="contenu"
            required
            rows={16}
            maxLength={5000}
            placeholder="Les retours à la ligne sont conservés."
            defaultValue={message?.contenu}
            className={`${champClasses} leading-6`}
          />
        </Champ>
        <CaseACocher name="actif" label="Actif (envoyé aux nouveaux membres)" defaultChecked={message?.actif ?? true} />
      </div>

      <aside className="rounded-2xl border border-white/25 p-4 text-sm">
        <p className="mb-1 font-semibold text-sable">Variables</p>
        <p className="mb-3 text-xs leading-5 text-ivoire/60">
          À écrire entre accolades : elles sont remplacées par les informations du membre.
        </p>
        <dl className="grid gap-2.5">
          {VARIABLES_MESSAGES.map((v) => (
            <div key={v.cle}>
              <dt>
                <code className="rounded bg-white/10 px-1.5 py-0.5 text-xs text-sable select-all">{`{${v.cle}}`}</code>
              </dt>
              <dd className="mt-0.5 text-xs text-ivoire/65">{v.description}</dd>
            </div>
          ))}
        </dl>
      </aside>
    </div>
  );
}
