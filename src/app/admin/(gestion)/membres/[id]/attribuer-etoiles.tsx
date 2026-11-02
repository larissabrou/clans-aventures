"use client";

import { useActionState, useRef, useState } from "react";
import { LoaderCircle, Star, X } from "lucide-react";
import { TexteAvecLiens } from "@/components/texte-avec-liens";
import { remplirVariables } from "@/lib/variables-messages";
import { actionAttribuerAction } from "../../actions";
import { Champ, champClasses } from "../../ui";

type Action = { id: number; nom: string; etoiles: number };
type Modele = { id: number; titre: string; contenu: string };

/**
 * Attribution d'étoiles : type d'action + message à envoyer (modèle), puis fenêtre de confirmation
 * qui résume l'attribution et montre le message exact que recevra le membre.
 */
export function AttribuerEtoiles({
  membreId,
  nomMembre,
  solde,
  actions,
  modeles,
  valeursMembre,
}: {
  membreId: string;
  nomMembre: string;
  solde: number;
  actions: Action[];
  modeles: Modele[];
  // Variables du membre ({prenom}, {clan}…), pour l'aperçu du message.
  valeursMembre: Record<string, string>;
}) {
  const [actionId, setActionId] = useState("");
  const [modeleId, setModeleId] = useState(modeles.length === 1 ? String(modeles[0].id) : "");
  const [precision, setPrecision] = useState("");
  const [erreur, setErreur] = useState<string | null>(null);
  const formulaire = useRef<HTMLFormElement>(null);
  const fenetre = useRef<HTMLDialogElement>(null);

  // Après l'envoi : la fenêtre se ferme ; si l'attribution a réussi, le formulaire se vide pour la suivante.
  const [etat, envoyer, enCours] = useActionState(
    async (precedent: Awaited<ReturnType<typeof actionAttribuerAction>>, donnees: FormData) => {
      const resultat = await actionAttribuerAction(precedent, donnees);
      fenetre.current?.close();
      if (resultat?.ok) {
        setActionId("");
        setPrecision("");
      }
      return resultat;
    },
    null,
  );

  const action = actions.find((a) => String(a.id) === actionId);
  const modele = modeles.find((m) => String(m.id) === modeleId);

  function ouvrirConfirmation() {
    if (!action) return setErreur("Choisis le type d’action.");
    if (!modele) return setErreur("Choisis le message à envoyer.");
    setErreur(null);
    fenetre.current?.showModal();
  }

  const valeurs = action
    ? {
        ...valeursMembre,
        action: action.nom,
        etoiles: String(action.etoiles),
        precision: precision.trim(),
        solde: String(solde + action.etoiles),
      }
    : valeursMembre;

  if (actions.length === 0 || modeles.length === 0) {
    return (
      <p className="text-sm text-ivoire/70">
        {actions.length === 0
          ? "Aucun type d’action actif avec des étoiles : règle d’abord le barème dans « Types d’actions »."
          : "Aucun modèle de message actif : crée-en un dans « Modèles de messages »."}
      </p>
    );
  }

  return (
    <form ref={formulaire} action={envoyer} className="grid gap-3">
      <input type="hidden" name="membreId" value={membreId} />
      <Champ label="Type d’action" id="typeActionId">
        <select id="typeActionId" name="typeActionId" value={actionId} onChange={(e) => setActionId(e.target.value)} className={champClasses}>
          <option value="" disabled>
            Choisir
          </option>
          {actions.map((a) => (
            <option key={a.id} value={a.id}>
              {a.nom} — {a.etoiles > 0 ? "+" : ""}
              {a.etoiles} ★
            </option>
          ))}
        </select>
      </Champ>
      <Champ label="Message envoyé au membre" id="modeleId">
        <select id="modeleId" name="modeleId" value={modeleId} onChange={(e) => setModeleId(e.target.value)} className={champClasses}>
          <option value="" disabled>
            Choisir un modèle
          </option>
          {modeles.map((m) => (
            <option key={m.id} value={m.id}>
              {m.titre}
            </option>
          ))}
        </select>
      </Champ>
      <Champ label="Précision (facultative)" id="precision">
        <input
          id="precision"
          name="precision"
          maxLength={120}
          placeholder="Ex. Camping d’Assinie"
          value={precision}
          onChange={(e) => setPrecision(e.target.value)}
          className={champClasses}
        />
      </Champ>
      <div>
        <button
          type="button"
          onClick={ouvrirConfirmation}
          className="inline-flex items-center justify-center gap-2 rounded-full bg-terre px-5 py-2.5 text-xs font-bold tracking-[1px] text-white uppercase transition hover:bg-sable hover:text-charbon"
        >
          <Star className="size-3.5" />
          Attribuer…
        </button>
      </div>
      {(erreur || etat) && (
        <p role="status" className={`text-sm font-medium ${!erreur && etat?.ok ? "text-sable" : "text-[#F2A7A0]"}`}>
          {erreur ?? etat?.message}
        </p>
      )}

      {/* Confirmation : rien n'est enregistré avant le clic sur « Confirmer ». */}
      <dialog
        ref={fenetre}
        onClick={(e) => e.target === fenetre.current && !enCours && fenetre.current?.close()}
        className="m-auto w-[calc(100%-2rem)] max-w-lg rounded-2xl bg-charbon p-0 text-ivoire ring-1 ring-sable backdrop:bg-black/60"
      >
        {action && modele && (
          <div>
            <div className="flex items-start justify-between gap-4 bg-sable px-6 py-4 text-charbon">
              <h3 className="font-titre text-2xl font-semibold">Confirmer l’attribution</h3>
              <button type="button" onClick={() => fenetre.current?.close()} aria-label="Fermer" className="rounded-lg p-1 hover:bg-charbon/10">
                <X className="size-5" />
              </button>
            </div>
            <div className="grid gap-4 px-6 py-5 text-sm">
              <p className="leading-6">
                Attribuer <strong className="text-sable">{action.etoiles > 0 ? "+" : ""}{action.etoiles} étoile{Math.abs(action.etoiles) > 1 ? "s" : ""}</strong> à{" "}
                <strong>{nomMembre}</strong> pour « {action.nom} »{precision.trim() ? ` (${precision.trim()})` : ""} ?
                <br />
                <span className="text-ivoire/60">
                  Solde : {solde} → {solde + action.etoiles} étoiles
                </span>
              </p>
              <div>
                <p className="mb-1.5 text-xs text-ivoire/60">Message envoyé au membre :</p>
                <div className="max-h-64 overflow-y-auto rounded-xl border border-white/20 p-4">
                  <p className="font-semibold">{remplirVariables(modele.titre, valeurs)}</p>
                  <p className="mt-2 leading-6 whitespace-pre-line text-ivoire/80">
                    <TexteAvecLiens texte={remplirVariables(modele.contenu, valeurs)} />
                  </p>
                </div>
              </div>
            </div>
            <div className="flex flex-col-reverse gap-3 border-t border-white/15 px-6 py-4 sm:flex-row sm:justify-end">
              <button
                type="button"
                onClick={() => fenetre.current?.close()}
                disabled={enCours}
                className="rounded-full border border-white/30 px-5 py-2.5 text-xs font-bold tracking-[1px] uppercase hover:border-sable hover:text-sable"
              >
                Annuler
              </button>
              <button
                type="button"
                disabled={enCours}
                onClick={() => formulaire.current?.requestSubmit()}
                className="inline-flex items-center justify-center gap-2 rounded-full bg-terre px-5 py-2.5 text-xs font-bold tracking-[1px] text-white uppercase transition hover:bg-sable hover:text-charbon disabled:opacity-60"
              >
                {enCours && <LoaderCircle className="size-3.5 animate-spin" />}
                Confirmer
              </button>
            </div>
          </div>
        )}
      </dialog>
    </form>
  );
}
