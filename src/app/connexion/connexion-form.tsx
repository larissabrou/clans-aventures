"use client";

import Link from "next/link";
import { useState, useTransition } from "react";
import { ArrowRight, LoaderCircle, MessageCircle } from "lucide-react";
import { buttonClasses } from "@/components/button-styles";
import { demanderCode, verifierCode } from "./actions";

const inputClasses =
  "w-full rounded-xl border border-charbon/15 bg-white px-4 py-3 text-charbon placeholder:text-charbon/40 focus:border-terre focus:ring-2 focus:ring-terre/20 focus:outline-none";

export function ConnexionForm() {
  const [etape, setEtape] = useState<"telephone" | "code">("telephone");
  const [telephone, setTelephone] = useState("");
  const [telephoneMasque, setTelephoneMasque] = useState("");
  const [code, setCode] = useState("");
  const [erreur, setErreur] = useState<string | null>(null);
  const [enCours, demarrer] = useTransition();

  function envoyerCode(event: React.FormEvent) {
    event.preventDefault();
    setErreur(null);
    demarrer(async () => {
      const resultat = await demanderCode(telephone);
      if (resultat.ok) {
        setTelephoneMasque(resultat.telephoneMasque);
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
      const resultat = await verifierCode(telephone, code);
      if (!resultat.ok) setErreur(resultat.message);
    });
  }

  return (
    <div className="rounded-3xl bg-white p-6 text-charbon shadow-[0_30px_80px_rgba(32,32,29,0.18)] sm:p-10">
      {etape === "telephone" ? (
        <form onSubmit={envoyerCode}>
          <label
            htmlFor="telephone"
            className="mb-2 block text-xs font-semibold tracking-[1px] text-charbon/70 uppercase"
          >
            Ton numéro WhatsApp
          </label>
          <input
            id="telephone"
            type="tel"
            autoComplete="tel"
            className={inputClasses}
            placeholder="+225 07 00 00 00 00"
            value={telephone}
            onChange={(e) => setTelephone(e.target.value)}
          />
          <p className="mt-3 flex gap-2 text-sm leading-6 text-charbon/70">
            <MessageCircle className="mt-1 size-4 shrink-0 text-foret" />
            Nous t’envoyons un code de connexion sur WhatsApp. Utilise le numéro
            indiqué lors de ton adhésion.
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
            Si ce numéro est membre, un code vient d’être envoyé sur WhatsApp au{" "}
            <strong className="whitespace-nowrap">{telephoneMasque}</strong>.
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
              setEtape("telephone");
              setErreur(null);
            }}
            className="mt-4 w-full text-sm text-charbon/60 underline-offset-4 hover:underline"
          >
            Changer de numéro ou renvoyer un code
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
