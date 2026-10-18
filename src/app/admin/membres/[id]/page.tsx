import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, X } from "lucide-react";
import { exigerAdmin } from "@/lib/admin";
import { listeTypesActions } from "@/lib/bareme";
import { listeClans } from "@/lib/clans";
import { membreAdmin } from "@/lib/gestion-membres";
import { formaterDate } from "@/lib/membres";
import {
  actionAjusterEtoiles,
  actionAttribuerAction,
  actionChangerClan,
  actionSupprimerMouvement,
} from "../../actions";
import { BoutonEnvoi, FormulaireAdmin } from "../../formulaire";
import { Carte, Champ, EnTete, Vide, champClasses } from "../../ui";

export const metadata: Metadata = { title: "Fiche membre" };

export default async function MembreAdmin({ params }: PageProps<"/admin/membres/[id]">) {
  await exigerAdmin();
  const { id } = await params;
  if (!/^[0-9a-f-]{36}$/i.test(id)) notFound();

  const [fiche, clans, types] = await Promise.all([membreAdmin(id), listeClans(), listeTypesActions()]);
  if (!fiche) notFound();
  const { membre } = fiche;
  const actions = types.filter((t) => t.actif && t.code === null);

  return (
    <>
      <Link href="/admin/membres" className="mb-4 inline-flex items-center gap-2 text-sm text-sable hover:text-ivoire">
        <ArrowLeft className="size-4" />
        Tous les membres
      </Link>
      <EnTete titre={`${membre.prenom} ${membre.nom}`} texte={membre.numero ?? "Adhésion non payée"} />

      <div className="grid gap-6 lg:grid-cols-[1fr_1.2fr]">
        <Carte titre="Informations">
          <dl className="grid gap-4 text-sm sm:grid-cols-2">
            <Info label="Email" valeur={membre.email} />
            <Info label="WhatsApp" valeur={`+${membre.telephone}`} />
            <Info label="Ville" valeur={membre.ville ?? "—"} />
            <Info label="Tranche d’âge" valeur={membre.trancheAge ?? "—"} />
            <Info label="Adhésion" valeur={membre.adhereLe ? formaterDate(membre.adhereLe) : "—"} />
            <Info
              label="Parrain"
              valeur={fiche.parrain ? `${fiche.parrain.prenom} ${fiche.parrain.nom} (${fiche.parrain.numero})` : "—"}
            />
            <Info label="Filleuls" valeur={String(fiche.filleuls)} />
            <Info label="Solde d’étoiles" valeur={`${fiche.etoiles} ★`} />
          </dl>
          {membre.attente && (
            <p className="mt-4 border-t border-white/15 pt-4 text-sm leading-6 text-ivoire/70">
              <span className="block text-[0.65rem] font-semibold tracking-[1.5px] text-sable/90 uppercase">Ses attentes</span>
              {membre.attente}
            </p>
          )}
        </Carte>

        <div className="grid content-start gap-6">
          <Carte titre="Clan">
            <FormulaireAdmin action={actionChangerClan} className="flex flex-wrap items-end gap-3">
              <input type="hidden" name="membreId" value={membre.id} />
              <Champ label="Clan du membre" id="clanId" className="min-w-56 flex-1">
                <select id="clanId" name="clanId" defaultValue={membre.clanId ?? ""} className={champClasses}>
                  <option value="">À définir</option>
                  {clans.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.nom}
                      {c.actif ? "" : " (inactif)"}
                    </option>
                  ))}
                </select>
              </Champ>
              <BoutonEnvoi>Enregistrer</BoutonEnvoi>
            </FormulaireAdmin>
          </Carte>

          <Carte titre="Attribuer une action">
            <FormulaireAdmin action={actionAttribuerAction} className="grid gap-3 sm:grid-cols-2">
              <input type="hidden" name="membreId" value={membre.id} />
              <Champ label="Action" id="typeActionId">
                <select id="typeActionId" name="typeActionId" required defaultValue="" className={champClasses}>
                  <option value="" disabled>
                    Choisir
                  </option>
                  {actions.map((t) => (
                    <option key={t.id} value={t.id}>
                      {t.nom} — {t.etoiles} ★
                    </option>
                  ))}
                </select>
              </Champ>
              <Champ label="Précision (facultative)" id="precision">
                <input id="precision" name="precision" maxLength={120} placeholder="Ex. Excursion à Assinie" className={champClasses} />
              </Champ>
              <div>
                <BoutonEnvoi>Attribuer</BoutonEnvoi>
              </div>
            </FormulaireAdmin>
          </Carte>

          <Carte titre="Ajustement manuel">
            <FormulaireAdmin action={actionAjusterEtoiles} className="grid gap-3 sm:grid-cols-[8rem_1fr]">
              <input type="hidden" name="membreId" value={membre.id} />
              <Champ label="Étoiles (±)" id="variation">
                <input id="variation" name="variation" type="number" step={1} required placeholder="-5" className={champClasses} />
              </Champ>
              <Champ label="Motif" id="libelle">
                <input id="libelle" name="libelle" required maxLength={120} placeholder="Ex. Absence non justifiée" className={champClasses} />
              </Champ>
              <div>
                <BoutonEnvoi style="secondaire">Appliquer</BoutonEnvoi>
              </div>
            </FormulaireAdmin>
          </Carte>
        </div>
      </div>

      <h2 className="mt-10 mb-4 font-titre text-3xl font-semibold">Historique des étoiles</h2>
      {fiche.historique.length === 0 ? (
        <Vide texte="Aucun mouvement d’étoiles." />
      ) : (
        <ul className="divide-y divide-white/15 rounded-2xl border border-white/80 px-5">
          {fiche.historique.map((h) => {
            const manuel = h.participationId === null && h.filleulId === null;
            return (
              <li key={h.id} className="flex items-center justify-between gap-4 py-3">
                <div>
                  <p className="text-sm font-medium">{h.libelle}</p>
                  <p className="text-xs text-ivoire/50">
                    {formaterDate(h.creeLe)}
                    {h.participationId !== null && " · présence à un événement"}
                    {h.filleulId !== null && " · parrainage"}
                  </p>
                </div>
                <div className="flex items-center gap-3">
                  <span className={`font-semibold ${h.variation >= 0 ? "text-sable" : "text-terre"}`}>
                    {h.variation >= 0 ? "+" : "−"}
                    {Math.abs(h.variation)} ★
                  </span>
                  {manuel && (
                    <FormulaireAdmin
                      action={actionSupprimerMouvement}
                      discret
                      confirmation={`Annuler « ${h.libelle} » (${h.variation} ★) ?`}
                    >
                      <input type="hidden" name="id" value={h.id} />
                      <button type="submit" aria-label="Annuler ce mouvement" title="Annuler ce mouvement" className="rounded-lg p-1 text-ivoire/50 hover:bg-white/10 hover:text-ivoire">
                        <X className="size-4" />
                      </button>
                    </FormulaireAdmin>
                  )}
                </div>
              </li>
            );
          })}
        </ul>
      )}

      <h2 className="mt-10 mb-4 font-titre text-3xl font-semibold">Événements</h2>
      {fiche.presences.length === 0 ? (
        <Vide texte="Inscrit à aucun événement." />
      ) : (
        <ul className="divide-y divide-white/15 rounded-2xl border border-white/80 px-5">
          {fiche.presences.map((e) => (
            <li key={e.id} className="flex items-center justify-between gap-4 py-3">
              <Link href={`/admin/evenements/${e.id}`} className="text-sm font-medium hover:text-sable">
                {e.titre}
                <span className="block text-xs text-ivoire/50">{formaterDate(e.date)}</span>
              </Link>
              <span className={`text-xs font-semibold ${e.present ? "text-sable" : "text-ivoire/50"}`}>
                {e.present ? "Présent" : "Inscrit"}
              </span>
            </li>
          ))}
        </ul>
      )}
    </>
  );
}

function Info({ label, valeur }: { label: string; valeur: string }) {
  return (
    <div>
      <dt className="text-[0.65rem] font-semibold tracking-[1.5px] text-sable/90 uppercase">{label}</dt>
      <dd className="mt-1 break-words">{valeur}</dd>
    </div>
  );
}
