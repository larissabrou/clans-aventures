"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { CircleCheck, LoaderCircle, Ticket } from "lucide-react";
import { PaiementMobileMoney } from "@/app/inscription/paiement-mobile-money";
import { PAYS, type Operateur, type Pays, type ResultatPaiement } from "@/lib/paiement/operateurs";
import type { RetourPaiement, SortieAffichee } from "./types";

// Relecture du statut toutes les 3 s, pendant 3 minutes (comme l'adhésion).
const INTERVALLE_STATUT_MS = 3000;
const MAX_TENTATIVES = 60;

const inputClasses =
  "w-full rounded-xl border border-charbon/15 bg-white px-4 py-3 text-sm text-charbon placeholder:text-charbon/40 focus:border-terre focus:ring-2 focus:ring-terre/20 focus:outline-none";
const labelClasses = "mb-2 block text-xs font-semibold tracking-[1px] text-charbon/70 uppercase";

type Suivi =
  | { etat: "inactif" }
  | { etat: "en-cours"; reference: string; instruction: string }
  | { etat: "paye" };

/**
 * Paiement d'une place par Mobile Money. Membre : rien à saisir (il est connecté).
 * Public : coordonnées de la personne qui participe, puis le moyen de paiement.
 */
export function PaiementSortie({
  sortie,
  mode,
  retour,
}: {
  sortie: SortieAffichee;
  mode: "membre" | "public";
  retour?: RetourPaiement;
}) {
  const router = useRouter();
  const retourIci = retour?.sortieId === sortie.id ? retour : undefined;

  const [ouvert, setOuvert] = useState(false);
  const [participant, setParticipant] = useState({ prenom: "", nom: "", email: "", telephone: "" });
  const [pays, setPays] = useState<Pays>("CI");
  const [operateur, setOperateur] = useState<Operateur>(PAYS.CI.operateurs[0]);
  const [telephonePaiement, setTelephonePaiement] = useState("");
  const [erreur, setErreur] = useState<string | null>(
    retourIci?.annule ? "Le paiement Wave a été annulé. Tu peux le relancer." : null,
  );
  const [envoi, setEnvoi] = useState(false);
  // Retour de Wave : on relit le statut du paiement dès l'affichage.
  const [suivi, setSuivi] = useState<Suivi>(
    retourIci && !retourIci.annule ? { etat: "en-cours", reference: retourIci.reference, instruction: "" } : { etat: "inactif" },
  );

  async function payer(evenement: React.FormEvent) {
    evenement.preventDefault();
    if (telephonePaiement.replace(/\D/g, "").length < 8) {
      setErreur("Indique le numéro Mobile Money à débiter.");
      return;
    }
    setErreur(null);
    setEnvoi(true);
    try {
      const reponse = await fetch("/api/sorties/paiement", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          evenementId: sortie.id,
          pays,
          operateur,
          telephonePaiement,
          ...(mode === "public" ? { participant } : {}),
        }),
      });
      const resultat = (await reponse.json().catch(() => null)) as ResultatPaiement | null;

      if (resultat?.statut === "redirect") {
        window.location.assign(resultat.url);
        return;
      }
      if (resultat?.statut === "paid") {
        terminer();
        return;
      }
      if (resultat?.statut === "pending") {
        setSuivi({ etat: "en-cours", reference: resultat.reference, instruction: resultat.instruction });
        return;
      }
      setErreur(
        (resultat && "message" in resultat && resultat.message) ||
          "Le paiement n’a pas pu être lancé. Réessaie ou choisis un autre opérateur.",
      );
    } catch {
      setErreur("Connexion impossible. Vérifie ton réseau et réessaie.");
    } finally {
      setEnvoi(false);
    }
  }

  function terminer() {
    setSuivi({ etat: "paye" });
    setErreur(null);
    router.refresh(); // places restantes et badge « Tu es inscrit » à jour
  }

  // Tant que le paiement est en cours, relit son statut jusqu'à confirmation, refus ou délai dépassé.
  useEffect(() => {
    if (suivi.etat !== "en-cours") return;
    const { reference } = suivi;
    let tentatives = 0;
    let actif = true;

    const minuteur = setInterval(async () => {
      tentatives += 1;
      if (tentatives > MAX_TENTATIVES) {
        clearInterval(minuteur);
        setSuivi({ etat: "inactif" });
        setErreur(
          `Nous n’avons pas encore reçu la confirmation. Si tu as validé le paiement, écris-nous sur WhatsApp avec la référence ${reference} ; sinon, relance-le.`,
        );
        return;
      }
      try {
        const reponse = await fetch(`/api/sorties/paiement/${encodeURIComponent(reference)}`, { cache: "no-store" });
        if (!reponse.ok || !actif) return; // erreur passagère : on réessaie
        const resultat = (await reponse.json()) as ResultatPaiement;
        if (!actif) return;
        if (resultat.statut === "paid") {
          clearInterval(minuteur);
          terminer();
        } else if (resultat.statut === "failed" || resultat.statut === "error") {
          clearInterval(minuteur);
          setSuivi({ etat: "inactif" });
          setErreur(resultat.message);
        }
      } catch {
        // réseau instable : on réessaie au prochain tour
      }
    }, INTERVALLE_STATUT_MS);

    return () => {
      actif = false;
      clearInterval(minuteur);
    };
    // terminer() ne dépend que du routeur : relancer l'effet à chaque rendu serait inutile.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [suivi]);

  if (suivi.etat === "paye") {
    return (
      <div className="flex gap-3 rounded-2xl border border-sable bg-sable/15 p-5 text-sm leading-6">
        <CircleCheck className="mt-0.5 size-5 shrink-0 text-sable" />
        <p>
          <strong className="text-sable">Paiement confirmé, ta place est réservée !</strong>
          <br />
          Un e-mail de confirmation est en route{mode === "membre" ? ", et un message t’attend dans ta boîte CLANS" : ""}.
        </p>
      </div>
    );
  }

  if (sortie.inscrit) return null; // le badge « Tu es inscrit » suffit
  if (sortie.placesRestantes === 0) {
    return <p className="text-sm font-semibold text-white/70">Cette sortie est complète.</p>;
  }
  if (sortie.paiementEquipe) {
    return <p className="text-sm text-white/70">Paiement auprès de l’équipe CLANS.</p>;
  }
  if (!sortie.payable) return null; // sortie gratuite

  if (suivi.etat === "en-cours") {
    return (
      <div className="flex gap-3 rounded-2xl border border-white/30 p-5 text-sm leading-6" role="status">
        <LoaderCircle className="mt-0.5 size-5 shrink-0 animate-spin text-sable" />
        <p>
          <strong>Paiement en cours…</strong>
          <br />
          {suivi.instruction || "Valide le paiement sur ton téléphone si ce n’est pas déjà fait."}
          <br />
          <span className="text-white/50">Référence : {suivi.reference}</span>
        </p>
      </div>
    );
  }

  if (!ouvert) {
    return (
      <div>
        <button
          type="button"
          onClick={() => setOuvert(true)}
          className="inline-flex items-center gap-2 rounded-full bg-sable px-6 py-3 text-sm font-semibold tracking-[1px] text-charbon uppercase transition hover:bg-ivoire"
        >
          <Ticket className="size-4" />
          {mode === "membre" ? "Payer ma participation" : "Payer ma place"} · {sortie.prixTexte}
        </button>
        {erreur && <p className="mt-3 text-sm text-red-300">{erreur}</p>}
      </div>
    );
  }

  return (
    // Fond clair : mêmes champs et logos que le paiement de l'adhésion.
    <form onSubmit={payer} className="rounded-2xl bg-white p-5 text-charbon sm:p-6">
      <p className="font-titre text-2xl font-semibold">
        {mode === "membre" ? "Payer ma participation" : "Payer ma place"}
      </p>
      <p className="mt-1 text-sm text-charbon/70">
        {sortie.titre} · <strong>{sortie.prixTexte}</strong> · une place
      </p>

      {mode === "public" && (
        <fieldset className="mt-5 grid gap-4 sm:grid-cols-2">
          <legend className="mb-3 text-sm text-charbon/70">Personne qui participe</legend>
          {(
            [
              ["prenom", "Prénom", "text", "given-name"],
              ["nom", "Nom", "text", "family-name"],
              ["email", "E-mail", "email", "email"],
              ["telephone", "Téléphone (WhatsApp)", "tel", "tel"],
            ] as const
          ).map(([champ, label, type, autoComplete]) => (
            <label key={champ}>
              <span className={labelClasses}>{label}</span>
              <input
                required
                type={type}
                autoComplete={autoComplete}
                value={participant[champ]}
                onChange={(e) => setParticipant((p) => ({ ...p, [champ]: e.target.value }))}
                className={inputClasses}
              />
            </label>
          ))}
        </fieldset>
      )}

      <PaiementMobileMoney
        pays={pays}
        operateur={operateur}
        telephone={telephonePaiement}
        onPays={setPays}
        onOperateur={setOperateur}
        onTelephone={setTelephonePaiement}
      />

      {erreur && (
        <p className="mt-4 rounded-xl bg-red-50 px-4 py-3 text-sm text-red-800" role="alert">
          {erreur}
        </p>
      )}

      <div className="mt-6 flex flex-wrap items-center gap-4">
        <button
          type="submit"
          disabled={envoi}
          className="inline-flex items-center gap-2 rounded-full bg-foret px-6 py-3 text-sm font-semibold tracking-[1px] text-ivoire uppercase transition hover:bg-charbon disabled:opacity-60"
        >
          {envoi && <LoaderCircle className="size-4 animate-spin" />}
          Payer {sortie.prixTexte}
        </button>
        <button type="button" onClick={() => setOuvert(false)} className="text-sm text-charbon/60 hover:text-charbon">
          Annuler
        </button>
      </div>
    </form>
  );
}
