"use client";

import Link from "next/link";
import { useState, useTransition } from "react";
import { ArrowRight, LoaderCircle, Mail } from "lucide-react";
import { buttonClasses } from "@/components/button-styles";
import { demanderCode, verifierCode } from "./actions";

const inputClasses =
  "w-full rounded-xl border border-charbon/15 bg-white px-4 py-3 text-charbon placeholder:text-charbon/40 focus:border-terre focus:ring-2 focus:ring-terre/20 focus:outline-none";

export function ConnexionForm() {
  const [etape, setEtape] = useState<"email" | "code">("email");
  const [email, setEmail] = useState("");
  const [emailMasque, setEmailMasque] = useState("");
  const [code, setCode] = useState("");
  const [erreur, setErreur] = useState<string | null>(null);
  const [enCours, demarrer] = useTransition();

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

  function valider(event: React.FormEvent) {
    event.preventDefault();
    setErreur(null);
    demarrer(async () => {
      // En cas de succès, le serveur redirige vers l'espace membre.
      const resultat = await verifierCode(email, code);
      if (!resultat.ok) setErreur(resultat.message);
    });
  }

  return (
    <div className="rounded-3xl bg-white p-6 text-charbon shadow-[0_30px_80px_rgba(32,32,29,0.18)] sm:p-10">
      {etape === "email" ? (
        <form onSubmit={envoyerCode}>
          <label
            htmlFor="email"
            className="mb-2 block text-xs font-semibold tracking-[1px] text-charbon/70 uppercase"
          >
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
          <p className="mt-3 flex gap-2 text-sm leading-6 text-charbon/70">
            <Mail className="mt-1 size-4 shrink-0 text-foret" />
            Nous t’envoyons un code de connexion par email. Utilise l’adresse
            indiquée lors de ton adhésion.
          </p>
          <MessageErreur erreur={erreur} />
          <button type="submit" disabled={enCours} className={`${buttonClasses("primary")} mt-2 w-full`}>
            {enCours ? <LoaderCircle className="size-4 animate-spin" /> : null}
            Recevoir mon code
            {!enCours && <ArrowRight className="size-4" />}
          </button>
        </form>
      ) : (
        <form onSubmit={valider}>
          <p className="mb-5 text-sm leading-6 text-charbon/75">
            Si cette adresse est celle d’un membre, un code vient d’être envoyé à{" "}
            <strong className="break-all">{emailMasque}</strong>. Pense à vérifier
            tes courriers indésirables.
          </p>
          <label
            htmlFor="code"
            className="mb-2 block text-xs font-semibold tracking-[1px] text-charbon/70 uppercase"
          >
            Code à 6 chiffres
          </label>
          <input
            id="code"
            inputMode="numeric"
            autoComplete="one-time-code"
            maxLength={6}
            className={`${inputClasses} text-center font-mono text-2xl tracking-[0.5em]`}
            placeholder="••••••"
            value={code}
            onChange={(e) => setCode(e.target.value.replace(/\D/g, ""))}
            autoFocus
          />
          <MessageErreur erreur={erreur} />
          <button
            type="submit"
            disabled={enCours || code.length !== 6}
            className={`${buttonClasses("primary")} mt-2 w-full`}
          >
            {enCours ? <LoaderCircle className="size-4 animate-spin" /> : null}
            Me connecter
          </button>
          <button
            type="button"
            onClick={() => {
              setEtape("email");
              setErreur(null);
            }}
            className="mt-4 w-full text-sm text-charbon/60 underline-offset-4 hover:underline"
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
  return (
    <p role="alert" className="mt-4 min-h-6 text-sm font-medium text-bordeaux">
      {erreur}
    </p>
  );
}
