"use client";

import { useState, useTransition } from "react";
import { ArrowRight, LoaderCircle, Mail } from "lucide-react";
import { buttonClasses } from "@/components/button-styles";
import { choisirMotDePasseAdmin, demanderCodeAdmin, seConnecterAdmin, type ResultatAdmin } from "./actions";

const inputClasses =
  "w-full rounded-xl border border-charbon/15 bg-white px-4 py-3 text-charbon placeholder:text-charbon/40 focus:border-terre focus:ring-2 focus:ring-terre/20 focus:outline-none";
const labelClasses = "mb-2 block text-xs font-semibold tracking-[1px] text-charbon/70 uppercase";
const lienSecondaire = "text-sm text-charbon/60 underline-offset-4 hover:underline";

// "motdepasse" : connexion habituelle ; "email" puis "code" : première connexion ou mot de passe oublié.
export function FormulaireConnexionAdmin() {
  const [etape, setEtape] = useState<"motdepasse" | "email" | "code">("motdepasse");
  const [email, setEmail] = useState("");
  const [motDePasse, setMotDePasse] = useState("");
  const [code, setCode] = useState("");
  const [nouveau, setNouveau] = useState("");
  const [confirmation, setConfirmation] = useState("");
  const [erreur, setErreur] = useState<string | null>(null);
  const [enCours, demarrer] = useTransition();

  // Session ouverte : chargement complet de /admin, qui reçoit ainsi le nouveau cookie.
  // Volontairement pas router.push() : la navigation douce pourrait réutiliser une version préchargée.
  function suite(resultat: ResultatAdmin) {
    // eslint-disable-next-line @next/next/no-location-assign-relative-destination
    if (resultat.ok) window.location.assign("/admin");
    else setErreur(resultat.message);
  }

  function envoyer(event: React.FormEvent, travail: () => Promise<void>) {
    event.preventDefault();
    setErreur(null);
    demarrer(travail);
  }

  const champEmail = (
    <div>
      <label htmlFor="email" className={labelClasses}>
        Adresse email
      </label>
      <input
        id="email"
        type="email"
        autoComplete="email"
        className={inputClasses}
        value={email}
        onChange={(e) => setEmail(e.target.value)}
      />
    </div>
  );

  const bouton = (libelle: string) => (
    <button type="submit" disabled={enCours} className={buttonClasses("primary")}>
      {enCours ? <LoaderCircle className="size-4 animate-spin" /> : null}
      {libelle}
      {!enCours && <ArrowRight className="size-4" />}
    </button>
  );

  return (
    <div className="rounded-3xl bg-white p-6 text-charbon shadow-[0_30px_80px_rgba(0,0,0,0.35)] sm:p-10">
      {etape === "motdepasse" && (
        <form onSubmit={(e) => envoyer(e, async () => suite(await seConnecterAdmin(email, motDePasse)))} className="grid gap-5">
          {champEmail}
          <div>
            <label htmlFor="mot-de-passe" className={labelClasses}>
              Mot de passe
            </label>
            <input
              id="mot-de-passe"
              type="password"
              autoComplete="current-password"
              className={inputClasses}
              value={motDePasse}
              onChange={(e) => setMotDePasse(e.target.value)}
            />
          </div>
          {bouton("Se connecter")}
          <button type="button" onClick={() => (setEtape("email"), setErreur(null))} className={lienSecondaire}>
            Première connexion ou mot de passe oublié ?
          </button>
        </form>
      )}

      {etape === "email" && (
        <form
          onSubmit={(e) =>
            envoyer(e, async () => {
              const resultat = await demanderCodeAdmin(email);
              if (resultat.ok) setEtape("code");
              else setErreur(resultat.message);
            })
          }
          className="grid gap-5"
        >
          <p className="flex gap-3 text-sm leading-6 text-charbon/70">
            <Mail className="mt-0.5 size-4 shrink-0 text-terre" />
            Indique l’email de ton compte d’administration : tu recevras un code pour choisir ton mot de passe.
          </p>
          {champEmail}
          {bouton("Recevoir un code")}
          <button type="button" onClick={() => (setEtape("motdepasse"), setErreur(null))} className={lienSecondaire}>
            Retour à la connexion
          </button>
        </form>
      )}

      {etape === "code" && (
        <form
          onSubmit={(e) =>
            envoyer(e, async () => suite(await choisirMotDePasseAdmin(email, code, nouveau, confirmation)))
          }
          className="grid gap-5"
        >
          <p className="text-sm leading-6 text-charbon/70">
            Si cette adresse correspond à un compte d’administration, un code vient d’y être envoyé (valable 10 minutes).
          </p>
          <div>
            <label htmlFor="code" className={labelClasses}>
              Code reçu
            </label>
            <input
              id="code"
              inputMode="numeric"
              autoComplete="one-time-code"
              maxLength={6}
              className={`${inputClasses} tracking-[6px]`}
              value={code}
              onChange={(e) => setCode(e.target.value)}
            />
          </div>
          <div>
            <label htmlFor="nouveau" className={labelClasses}>
              Nouveau mot de passe
            </label>
            <input
              id="nouveau"
              type="password"
              autoComplete="new-password"
              placeholder="8 caractères minimum"
              className={inputClasses}
              value={nouveau}
              onChange={(e) => setNouveau(e.target.value)}
            />
          </div>
          <div>
            <label htmlFor="confirmation" className={labelClasses}>
              Confirmation
            </label>
            <input
              id="confirmation"
              type="password"
              autoComplete="new-password"
              className={inputClasses}
              value={confirmation}
              onChange={(e) => setConfirmation(e.target.value)}
            />
          </div>
          {bouton("Enregistrer et me connecter")}
          <button type="button" onClick={() => (setEtape("email"), setErreur(null))} className={lienSecondaire}>
            Renvoyer un code
          </button>
        </form>
      )}

      <p role="alert" aria-live="polite" className="mt-4 min-h-5 text-sm font-medium text-bordeaux">
        {erreur}
      </p>
    </div>
  );
}
