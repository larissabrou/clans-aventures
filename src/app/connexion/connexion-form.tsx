"use client";

import Link from "next/link";
import { useState, useTransition } from "react";
import { ArrowRight, LoaderCircle, Mail } from "lucide-react";
import { buttonClasses } from "@/components/button-styles";
import { connexion, demanderCode, verifierCode } from "./actions";

const inputClasses =
  "w-full rounded-xl border border-charbon/15 bg-white px-4 py-3 text-charbon placeholder:text-charbon/40 focus:border-terre focus:ring-2 focus:ring-terre/20 focus:outline-none";

const labelClasses = "mb-2 block text-xs font-semibold tracking-[1px] text-charbon/70 uppercase";

// Trois écrans : "motdepasse" (connexion habituelle), "email" puis "code" (secours sans mot de passe).
export function ConnexionForm() {
  const [etape, setEtape] = useState<"motdepasse" | "email" | "code">("motdepasse");
  const [email, setEmail] = useState("");
  const [motDePasse, setMotDePasse] = useState("");
  const [emailMasque, setEmailMasque] = useState("");
  const [code, setCode] = useState("");
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
        setEtape("code");
      } else {
        setErreur(resultat.message);
      }
    });
  }

  function validerCode(event: React.FormEvent) {
    event.preventDefault();
    setErreur(null);
    demarrer(async () => {
      const resultat = await verifierCode(email, code);
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
          <button
            type="button"
            onClick={() => basculer("email")}
            className="text-sm text-charbon/60 underline-offset-4 hover:underline"
          >
            Mot de passe oublié ? Recevoir un code de connexion par email
          </button>
        </form>
      )}

      {etape === "email" && (
        <form onSubmit={envoyerCode} className="grid gap-5">
          {champEmail}
          <p className="flex gap-2 text-sm leading-6 text-charbon/70">
            <Mail className="mt-1 size-4 shrink-0 text-foret" />
            Nous t’envoyons un code de connexion par email. Utilise l’adresse
            indiquée lors de ton adhésion.
          </p>
          <MessageErreur erreur={erreur} />
          <button type="submit" disabled={enCours} className={`${buttonClasses("primary")} w-full`}>
            {enCours ? <LoaderCircle className="size-4 animate-spin" /> : null}
            Recevoir mon code
            {!enCours && <ArrowRight className="size-4" />}
          </button>
          <button
            type="button"
            onClick={() => basculer("motdepasse")}
            className="text-sm text-charbon/60 underline-offset-4 hover:underline"
          >
            Retour à la connexion par mot de passe
          </button>
        </form>
      )}

      {etape === "code" && (
        <form onSubmit={validerCode} className="grid gap-5">
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
          <MessageErreur erreur={erreur} />
          <button
            type="submit"
            disabled={enCours || code.length !== 6}
            className={`${buttonClasses("primary")} w-full`}
          >
            {enCours ? <LoaderCircle className="size-4 animate-spin" /> : null}
            Me connecter
          </button>
          <button
            type="button"
            onClick={() => basculer("email")}
            className="text-sm text-charbon/60 underline-offset-4 hover:underline"
          >
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
