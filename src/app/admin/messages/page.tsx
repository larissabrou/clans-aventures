import type { Metadata } from "next";
import Link from "next/link";
import { Users } from "lucide-react";
import { exigerAdmin } from "@/lib/admin";
import { apparenceMessage } from "@/lib/apparence-messages";
import { listeClans } from "@/lib/clans";
import { historiqueEnvois } from "@/lib/envois";
import { formaterDateHeure } from "@/lib/membres";
import { typesMessagesActifs } from "@/lib/types-messages";
import { actionEnvoyerMessage, actionSupprimerEnvoi } from "../actions";
import { BoutonEnvoi, FormulaireAdmin } from "../formulaire";
import { Carte, Champ, EnTete, Vide, champClasses } from "../ui";
import { ChoixDestinataires } from "./destinataires";

export const metadata: Metadata = { title: "Messages" };

export default async function MessagesAdmin() {
  await exigerAdmin();
  const [clans, envois, types] = await Promise.all([listeClans(), historiqueEnvois(), typesMessagesActifs()]);

  return (
    <>
      <EnTete
        titre="Messages"
        texte="Les messages envoyés ici apparaissent dans l’espace membre des destinataires (page Messages et aperçu sur l’accueil)."
      />

      <Carte titre="Nouveau message">
        <FormulaireAdmin action={actionEnvoyerMessage} className="grid gap-5">
          <ChoixDestinataires clans={clans.map(({ id, nom }) => ({ id, nom }))} />
          <div className="grid gap-4 sm:grid-cols-[2fr_1fr]">
            <Champ label="Titre" id="envoi-titre">
              <input id="envoi-titre" name="titre" required maxLength={120} placeholder="Ex. Le CLANS CAMP approche !" className={champClasses} />
            </Champ>
            <Champ label="Type" id="envoi-type">
              <select id="envoi-type" name="type" defaultValue="info" className={champClasses}>
                {types.map((t) => (
                  <option key={t.cle} value={t.cle}>
                    {t.nom}
                  </option>
                ))}
              </select>
              <Link href="/admin/types-messages" className="mt-1.5 inline-block text-xs text-sable hover:text-ivoire">
                Créer ou modifier les types de messages
              </Link>
            </Champ>
          </div>
          <Champ label="Message" id="envoi-contenu">
            <textarea
              id="envoi-contenu"
              name="contenu"
              required
              rows={7}
              maxLength={5000}
              placeholder="Les retours à la ligne sont conservés."
              className={champClasses}
            />
          </Champ>
          <div>
            <BoutonEnvoi>Envoyer le message</BoutonEnvoi>
          </div>
        </FormulaireAdmin>
      </Carte>

      <h2 className="mt-10 mb-4 font-titre text-3xl font-semibold">Messages envoyés</h2>
      {envois.length === 0 ? (
        <Vide texte="Aucun message envoyé depuis l’administration." />
      ) : (
        <ul className="grid gap-3">
          {envois.map((envoi) => (
            <li key={envoi.id} className="rounded-2xl border border-white/80 p-5">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <span
                      className={`rounded-full px-2.5 py-0.5 text-[0.7rem] font-semibold ${apparenceMessage(envoi.couleur, envoi.icone).pastille}`}
                    >
                      {envoi.typeNom ?? "Information"}
                    </span>
                    <p className="font-semibold">{envoi.titre}</p>
                  </div>
                  <p className="mt-1 text-xs text-ivoire/60">
                    {formaterDateHeure(envoi.creeLe)} · {envoi.cible}
                  </p>
                </div>
                <p className="flex items-center gap-1.5 text-sm text-ivoire/80">
                  <Users className="size-4 text-sable" strokeWidth={1.75} />
                  Lu par {envoi.lus} / {envoi.destinataires}
                </p>
              </div>
              <p className="mt-3 line-clamp-3 text-sm leading-6 whitespace-pre-line text-ivoire/70">{envoi.contenu}</p>
              <FormulaireAdmin
                action={actionSupprimerEnvoi}
                discret
                confirmation="Retirer ce message de l’espace de tous ses destinataires ?"
                className="mt-3"
              >
                <input type="hidden" name="id" value={envoi.id} />
                <BoutonEnvoi style="danger">Retirer</BoutonEnvoi>
              </FormulaireAdmin>
            </li>
          ))}
        </ul>
      )}
    </>
  );
}
