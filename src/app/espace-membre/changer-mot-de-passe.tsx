"use client";

import { useState, useTransition } from "react";
import { KeyRound, LoaderCircle } from "lucide-react";
import { buttonClasses } from "@/components/button-styles";
import { modifierMotDePasse, type ResultatMotDePasse } from "./actions";

const inputClasses =
  "w-full rounded-xl border border-charbon/15 bg-white px-4 py-3 text-charbon placeholder:text-charbon/40 focus:border-terre focus:ring-2 focus:ring-terre/20 focus:outline-none";

const labelClasses = "mb-2 block text-xs font-semibold tracking-[1px] text-charbon/70 uppercase";

/** `aUnMotDePasse` : faux pour les membres inscrits avant l'arrivée des mots de passe. */
export function ChangerMotDePasse({ aUnMotDePasse }: { aUnMotDePasse: boolean }) {
  const [ouvert, setOuvert] = useState(false);
  const [actuel, setActuel] = useState("");
  const [nouveau, setNouveau] = useState("");
  const [confirmation, setConfirmation] = useState("");
  const [resultat, setResultat] = useState<ResultatMotDePasse | null>(null);
  const [enCours, demarrer] = useTransition();

  function envoyer(event: React.FormEvent) {
    event.preventDefault();
    setResultat(null);
    demarrer(async () => {
      const reponse = await modifierMotDePasse(actuel, nouveau, confirmation);
      setResultat(reponse);
      if (reponse.ok) {
        setActuel("");
        setNouveau("");
        setConfirmation("");
        setOuvert(false);
      }
    });
  }

  return (
    <div className="mt-4 rounded-2xl bg-white p-6 text-charbon sm:p-8">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <KeyRound className="size-5 text-terre" strokeWidth={1.75} />
          <div>
            <p className="font-semibold">Mot de passe</p>
            <p className="text-sm text-charbon/60">
              {aUnMotDePasse ? "Modifie le mot de passe reçu par email." : "Choisis un mot de passe pour te connecter plus vite."}
            </p>
          </div>
        </div>
        {!ouvert && (
          <button
            type="button"
            onClick={() => {
              setOuvert(true);
              setResultat(null);
            }}
            className={buttonClasses("secondary")}
          >
            {aUnMotDePasse ? "Changer mon mot de passe" : "Créer mon mot de passe"}
          </button>
        )}
      </div>

      {resultat && (
        <p role="status" className={`mt-4 text-sm font-medium ${resultat.ok ? "text-foret" : "text-bordeaux"}`}>
          {resultat.message}
        </p>
      )}

      {ouvert && (
        <form onSubmit={envoyer} className="mt-6 grid gap-5 sm:grid-cols-3">
          {aUnMotDePasse && (
            <div>
              <label htmlFor="mdp-actuel" className={labelClasses}>
                Mot de passe actuel
              </label>
              <input
                id="mdp-actuel"
                type="password"
                autoComplete="current-password"
                className={inputClasses}
                value={actuel}
                onChange={(e) => setActuel(e.target.value)}
              />
            </div>
          )}
          <div>
            <label htmlFor="mdp-nouveau" className={labelClasses}>
              Nouveau mot de passe
            </label>
            <input
              id="mdp-nouveau"
              type="password"
              autoComplete="new-password"
              minLength={8}
              placeholder="8 caractères minimum"
              className={inputClasses}
              value={nouveau}
              onChange={(e) => setNouveau(e.target.value)}
            />
          </div>
          <div>
            <label htmlFor="mdp-confirmation" className={labelClasses}>
              Confirmation
            </label>
            <input
              id="mdp-confirmation"
              type="password"
              autoComplete="new-password"
              className={inputClasses}
              value={confirmation}
              onChange={(e) => setConfirmation(e.target.value)}
            />
          </div>
          <div className="flex flex-col-reverse gap-3 sm:col-span-3 sm:flex-row sm:justify-end">
            <button type="button" onClick={() => setOuvert(false)} className={buttonClasses("secondary")}>
              Annuler
            </button>
            <button type="submit" disabled={enCours} className={buttonClasses("primary")}>
              {enCours ? <LoaderCircle className="size-4 animate-spin" /> : null}
              Enregistrer
            </button>
          </div>
        </form>
      )}
    </div>
  );
}
