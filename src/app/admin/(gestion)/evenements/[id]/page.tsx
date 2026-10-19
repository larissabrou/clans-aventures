import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, Check } from "lucide-react";
import { exigerAdmin } from "@/lib/admin";
import { listeTypesActions } from "@/lib/bareme";
import { evenementDetail } from "@/lib/evenements";
import { urlImageEvenement } from "@/lib/images";
import { formaterDateHeure } from "@/lib/membres";
import {
  actionAjouterParticipant,
  actionMarquerPresence,
  actionModifierEvenement,
  actionRetirerParticipant,
  actionSupprimerEvenement,
} from "../../actions";
import { BoutonEnvoi, FormulaireAdmin } from "../../formulaire";
import { Carte, Champ, EnTete, Vide, champClasses } from "../../ui";
import { ChampsEvenement } from "../champs-evenement";

export const metadata: Metadata = { title: "Événement" };

export default async function EvenementAdmin({ params }: PageProps<"/admin/evenements/[id]">) {
  await exigerAdmin();
  const id = Number((await params).id);
  if (!Number.isInteger(id) || id <= 0) notFound();

  const [evenement, types] = await Promise.all([evenementDetail(id), listeTypesActions()]);
  if (!evenement) notFound();

  const presents = evenement.participants.filter((p) => p.present).length;
  const etoiles = evenement.typeAction?.actif ? evenement.typeAction.etoiles : 0;

  return (
    <>
      <Link href="/admin/evenements" className="mb-4 inline-flex items-center gap-2 text-sm text-sable hover:text-ivoire">
        <ArrowLeft className="size-4" />
        Tous les événements
      </Link>
      <EnTete titre={evenement.titre} texte={formaterDateHeure(evenement.date) + (evenement.lieu ? ` · ${evenement.lieu}` : "")} />

      {/* PARTICIPANTS */}
      <Carte titre={`Participants (${evenement.participants.length}${evenement.places ? ` / ${evenement.places}` : ""})`}>
        <p className="mb-4 text-sm leading-6 text-ivoire/70">
          {etoiles !== 0
            ? `Valider une présence crédite ${etoiles} étoile${Math.abs(etoiles) > 1 ? "s" : ""} (${evenement.typeAction?.nom}). Annuler la présence retire ces étoiles.`
            : "Cet événement ne rapporte pas d’étoiles : choisis un type d’action (avec un barème) ci-dessous si besoin."}{" "}
          {presents} présent{presents > 1 ? "s" : ""}.
        </p>

        <FormulaireAdmin action={actionAjouterParticipant} className="mb-6 flex flex-wrap items-end gap-3">
          <input type="hidden" name="evenementId" value={evenement.id} />
          <Champ label="Numéro du membre" id="numero" className="w-full sm:w-64">
            <input id="numero" name="numero" required placeholder="CLANS-000012 ou 12" className={`${champClasses} uppercase placeholder:normal-case`} />
          </Champ>
          <BoutonEnvoi>Inscrire</BoutonEnvoi>
        </FormulaireAdmin>

        {evenement.participants.length === 0 ? (
          <Vide texte="Aucun participant inscrit pour l’instant." />
        ) : (
          <ul className="divide-y divide-white/15">
            {evenement.participants.map((p) => (
              <li key={p.participationId} className="flex flex-wrap items-center justify-between gap-3 py-3">
                <Link href={`/admin/membres/${p.membreId}`} className="hover:text-sable">
                  <span className="block font-semibold">
                    {p.prenom} {p.nom}
                  </span>
                  <span className="text-xs text-ivoire/60">
                    {p.numero} · +{p.telephone}
                  </span>
                </Link>
                <div className="flex flex-wrap items-center gap-2">
                  <FormulaireAdmin action={actionMarquerPresence} discret className="flex flex-wrap items-center gap-2">
                    <input type="hidden" name="participationId" value={p.participationId} />
                    <input type="hidden" name="present" value={p.present ? "0" : "1"} />
                    {p.present ? (
                      <>
                        <span className="inline-flex items-center gap-1 text-sm font-semibold text-sable">
                          <Check className="size-4" /> Présent
                        </span>
                        <BoutonEnvoi style="secondaire">Annuler</BoutonEnvoi>
                      </>
                    ) : (
                      <BoutonEnvoi>Valider la présence</BoutonEnvoi>
                    )}
                  </FormulaireAdmin>
                  <FormulaireAdmin
                    action={actionRetirerParticipant}
                    discret
                    confirmation={`Retirer ${p.prenom} ${p.nom} de l’événement ?${p.present ? " Ses étoiles pour cet événement seront retirées." : ""}`}
                  >
                    <input type="hidden" name="participationId" value={p.participationId} />
                    <BoutonEnvoi style="danger">Retirer</BoutonEnvoi>
                  </FormulaireAdmin>
                </div>
              </li>
            ))}
          </ul>
        )}
      </Carte>

      {/* MODIFICATION */}
      <Carte titre="Modifier l’événement" className="mt-8">
        <FormulaireAdmin action={actionModifierEvenement} className="grid gap-5">
          <input type="hidden" name="id" value={evenement.id} />
          <ChampsEvenement
            evenement={evenement}
            types={types}
            imageUrl={urlImageEvenement(evenement.id, evenement.imageMaj)}
          />
          <div>
            <BoutonEnvoi>Enregistrer</BoutonEnvoi>
          </div>
        </FormulaireAdmin>
      </Carte>

      <FormulaireAdmin
        action={actionSupprimerEvenement}
        confirmation="Supprimer cet événement ? Les inscriptions et les étoiles gagnées par présence seront supprimées."
        className="mt-6"
      >
        <input type="hidden" name="id" value={evenement.id} />
        <BoutonEnvoi style="danger">Supprimer l’événement</BoutonEnvoi>
      </FormulaireAdmin>
    </>
  );
}
