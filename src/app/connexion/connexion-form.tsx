"use client";

import Link from "next/link";
import { useState, useTransition } from "react";
import { ArrowRight, LoaderCircle, Mail } from "lucide-react";
import { buttonClasses } from "@/components/button-styles";
import { connexion, demanderCode, reinitialiser } from "./actions";

const inputClasses =
  "w-full rounded-xl border border-charbon/15 bg-white px-4 py-3 text-charbon placeholder:text-charbon/40 focus:border-terre focus:ring-2 focus:ring-terre/20 focus:outline-none";

const labelClasses = "mb-2 block text-xs font-semibold tracking-[1px] text-charbon/70 uppercase";

// Trois écrans : "motdepasse" (connexion habituelle) ; en cas d'oubli, "email" (envoi d'un code)
// puis "nouveau" (code reçu + choix d'un nouveau mot de passe).
export function ConnexionForm() {
  const [etape, setEtape] = useState<"motdepasse" | "email" | "nouveau">("motdepasse");
  const [email, setEmail] = useState("");
  const [motDePasse, setMotDePasse] = useState("");
  const [emailMasque, setEmailMasque] = useState("");
  const [code, setCode] = useState("");
  const [nouveau, setNouveau] = useState("");
  const [confirmation, setConfirmation] = useState("");
  const [erreur, setErreur] = useState<string | null>(null);
  const [enCours, demarrer] = useTransition();

  function seConnecter(event: React.FormEvent) {
    event.preventDefault();
    setErreur(null);
    demarrer(async () => {
      // En cas de succès, le serveur redirige vers l'espace membre.
      const resultat = await connexion(email, motDePasse);
      if (!resultat.ok) setErreur(resultat.message);
    });
  }

  function envoyerCode(event: React.FormEvent) {
    event.preventDefault();
    setErreur(null);
    demarrer(async () => {
      const resultat = await demanderCode(email);
      if (resultat.ok) {
        setEmailMasque(resultat.emailMasque);
        setCode("");
        setNouveau("");
        setConfirmation("");
        setEtape("nouveau");
      } else {
        setErreur(resultat.message);
      }
    });
  }

  function definirNouveau(event: React.FormEvent) {
    event.preventDefault();
    setErreur(null);
    demarrer(async () => {
      // En cas de succès, le serveur redirige vers l'espace membre.
      const resultat = await reinitialiser(email, code, nouveau, confirmation);
      if (!resultat.ok) setErreur(resultat.message);
    });
  }

  function basculer(cible: "motdepasse" | "email") {
    setEtape(cible);
    setErreur(null);
  }

  const champEmail = (
    <div>
      <label htmlFor="email" className={labelClasses}>
        Ton adresse email
      </label>
      <input
        id="email"
        type="email"
        autoComplete="email"
        className={inputClasses}
        placeholder="ton@email.com"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
      />
    </div>
  );

  const lienSecondaire = "text-sm text-charbon/60 underline-offset-4 hover:underline";

  return (
    <div className="rounded-3xl bg-white p-6 text-charbon shadow-[0_30px_80px_rgba(32,32,29,0.18)] sm:p-10">
      {etape === "motdepasse" && (
        <form onSubmit={seConnecter} className="grid gap-5">
          {champEmail}
          <div>
            <label htmlFor="motDePasse" className={labelClasses}>
              Ton mot de passe
            </label>
            <input
              id="motDePasse"
              type="password"
              autoComplete="current-password"
              className={inputClasses}
              placeholder="Reçu par email lors de ton adhésion"
              value={motDePasse}
              onChange={(e) => setMotDePasse(e.target.value)}
            />
          </div>
          <MessageErreur erreur={erreur} />
          <button type="submit" disabled={enCours} className={`${buttonClasses("primary")} w-full`}>
            {enCours ? <LoaderCircle className="size-4 animate-spin" /> : null}
            Me connecter
            {!enCours && <ArrowRight className="size-4" />}
          </button>
          <button type="button" onClick={() => basculer("email")} className={lienSecondaire}>
            Mot de passe oublié ?
          </button>
        </form>
      )}

      {etape === "email" && (
        <form onSubmit={envoyerCode} className="grid gap-5">
          <div>
            <h2 className="font-titre text-2xl font-semibold">Mot de passe oublié</h2>
            <p className="mt-2 flex gap-2 text-sm leading-6 text-charbon/70">
              <Mail className="mt-1 size-4 shrink-0 text-foret" />
              Indique l’adresse email de ton adhésion : nous t’envoyons un code
              pour choisir un nouveau mot de passe.
            </p>
          </div>
          {champEmail}
          <MessageErreur erreur={erreur} />
          <button type="submit" disabled={enCours} className={`${buttonClasses("primary")} w-full`}>
            {enCours ? <LoaderCircle className="size-4 animate-spin" /> : null}
            Recevoir mon code
            {!enCours && <ArrowRight className="size-4" />}
          </button>
          <button type="button" onClick={() => basculer("motdepasse")} className={lienSecondaire}>
            Retour à la connexion
          </button>
        </form>
      )}

      {etape === "nouveau" && (
        <form onSubmit={definirNouveau} className="grid gap-5">
          <p className="text-sm leading-6 text-charbon/75">
            Si cette adresse est celle d’un membre, un code vient d’être envoyé à{" "}
            <strong className="break-all">{emailMasque}</strong>. Pense à vérifier
            tes courriers indésirables.
          </p>
          <div>
            <label htmlFor="code" className={labelClasses}>
              Code à 6 chiffres
            </label>
            <input
              id="code"
              inputMode="numeric"
              autoComplete="one-time-code"
              maxLength={6}
              className={`${inputClasses} text-center text-2xl font-semibold tracking-[0.5em]`}
              placeholder="••••••"
              value={code}
              onChange={(e) => setCode(e.target.value.replace(/\D/g, ""))}
              autoFocus
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
              minLength={8}
              className={inputClasses}
              placeholder="8 caractères minimum"
              value={nouveau}
              onChange={(e) => setNouveau(e.target.value)}
            />
          </div>
          <div>
            <label htmlFor="confirmation" className={labelClasses}>
              Confirme le nouveau mot de passe
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
          <MessageErreur erreur={erreur} />
          <button
            type="submit"
            disabled={enCours || code.length !== 6}
            className={`${buttonClasses("primary")} w-full`}
          >
            {enCours ? <LoaderCircle className="size-4 animate-spin" /> : null}
            Enregistrer et me connecter
          </button>
          <button type="button" onClick={() => basculer("email")} className={lienSecondaire}>
            Changer d’adresse ou renvoyer un code
          </button>
        </form>
      )}

      <p className="mt-8 border-t border-charbon/10 pt-6 text-center text-sm text-charbon/70">
        Pas encore membre ?{" "}
        <Link href="/inscription" className="font-semibold text-terre underline-offset-4 hover:underline">
          Rejoindre CLANS
        </Link>
      </p>
    </div>
  );
}

function MessageErreur({ erreur }: { erreur: string | null }) {
  if (!erreur) return null;
  return (
    <p role="alert" className="text-sm font-medium text-bordeaux">
      {erreur}
    </p>
  );
}
